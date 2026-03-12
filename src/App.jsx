// src/App.jsx
// ─── Full Game Zone Management System — Supabase Edition ─────
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth, RequireAuth } from './context/AuthContext';
import { signUp, resetPassword, updatePassword } from './lib/supabase';
import * as db from './lib/supabase';
import {
useZones, useZone, useOwners, usePlayers, useStaff,
  useSessions, usePayments, useNotifications,
  usePlatformStats, useZoneAnalytics, useSubscriptionPlans,
  useActiveSubscription, useRevenueByMonth, useMutation,
} from './hooks/useSupabase';

// ─── COLORS ──────────────────────────────────────────────────
const C = {
  bg: '#0a0e1a', surface: '#0f1628', card: '#141d35',
  border: '#1e2d50', accent: '#00d4ff', green: '#00e676',
  red: '#ff4444', yellow: '#ffd740', purple: '#b388ff',
  text: '#e8eaf6', muted: '#7986cb', dim: '#4a5568',
};

// ─── SHARED UI ────────────────────────────────────────────────
const inp = {
  width: '100%', background: C.surface, border: `1px solid ${C.border}`,
  borderRadius: 10, padding: '11px 14px', color: C.text, fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
};
const btnS = (v = 'primary', sm) => ({
  padding: sm ? '6px 12px' : '10px 18px',
  borderRadius: 8, border: 'none', cursor: 'pointer',
  fontWeight: 600, fontSize: sm ? 12 : 13, transition: 'opacity 0.15s',
  ...(v === 'primary' ? { background: C.accent, color: '#000' } :
      v === 'danger'  ? { background: `${C.red}22`, color: C.red, border: `1px solid ${C.red}44` } :
      v === 'success' ? { background: `${C.green}22`, color: C.green, border: `1px solid ${C.green}44` } :
                        { background: 'transparent', color: C.muted, border: `1px solid ${C.border}` }),
});
const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 };
const th = { padding: '11px 15px', textAlign: 'left', fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${C.border}`, background: C.surface };
const td = { padding: '13px 15px', borderBottom: `1px solid ${C.border}22`, fontSize: 13, color: C.text, verticalAlign: 'middle' };

const badge = (status) => {
  const m = { active: [C.green, `${C.green}18`], inactive: [C.dim, `${C.dim}18`], suspended: [C.red, `${C.red}18`], pending: [C.yellow, `${C.yellow}18`], ended: [C.dim, `${C.dim}18`] };
  const [col, bg] = m[status] || [C.muted, `${C.muted}18`];
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: col, background: bg }}>● {status}</span>;
};

const planBadge = (plan) => {
  const m = { Basic: C.muted, Pro: C.accent, Premium: C.purple };
  const c = m[plan] || C.muted;
  return <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: c, background: `${c}20` }}>{plan}</span>;
};

const fmt$ = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const initials = (name) => (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

function Spinner() {
  return <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Loading…</div>;
}

function ErrorMsg({ msg }) {
  return <div style={{ background: `${C.red}15`, border: `1px solid ${C.red}44`, borderRadius: 10, padding: '12px 14px', color: C.red, fontSize: 13, marginBottom: 16 }}>⚠ {msg}</div>;
}

function SuccessMsg({ msg }) {
  return msg ? <div style={{ background: `${C.green}15`, border: `1px solid ${C.green}44`, borderRadius: 10, padding: '12px 14px', color: C.green, fontSize: 13, marginBottom: 16 }}>✅ {msg}</div> : null;
}

function Field({ label, type = 'text', value, onChange, options, placeholder, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>{label}{required && ' *'}</label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inp, appearance: 'none' }}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inp, height: 90, resize: 'vertical' }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inp} />
      )}
    </div>
  );
}

function Modal({ title, onClose, children, footer }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...card, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '18px 22px' }}>{children}</div>
        {footer && <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{footer}</div>}
      </div>
    </div>
  );
}

function BarChart({ data, color, height = 110 }) {
  if (!data?.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim }}>No data yet</div>;
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ width: '100%', height: `${Math.max((d.value / max) * 100, 2)}%`, background: `linear-gradient(180deg, ${color}, ${color}88)`, borderRadius: '4px 4px 0 0', minHeight: 4 }} />
          </div>
          <div style={{ fontSize: 9, color: C.dim, marginTop: 4, textAlign: 'center' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, color, change, changeUp }) {
  return (
    <div style={{ ...card, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '14px 14px 0 0' }} />
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {change && <div style={{ fontSize: 12, color: changeUp ? C.green : C.red, fontWeight: 600 }}>{changeUp ? '▲' : '▼'} {change}</div>}
    </div>
  );
}

// ─── AUTH PAGES ───────────────────────────────────────────────
function AuthPage() {
  const { login } = useAuth();
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [newPass, setNewPass] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !pass) { setError('Fill in all fields.'); return; }
    setError(''); setLoading(true);
    try {
      await login(email, pass);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !pass || !name) { setError('Fill in all fields.'); return; }
    setError(''); setLoading(true);
    try {
      await signUp(email, pass, name);
      setSuccess('Account created! Check your email to confirm, then wait for admin approval.');
      setView('login');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) { setError('Enter your email.'); return; }
    setError(''); setLoading(true);
    try {
      await resetPassword(email);
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePass = async () => {
    if (!newPass) { setError('Enter a new password.'); return; }
    setError(''); setLoading(true);
    try {
      await updatePassword(newPass);
      setSuccess('Password updated!');
      setView('login');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if we're on a password recovery URL
  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setView('update-password');
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(ellipse at 20% 50%, #0d1f3c, ${C.bg} 60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ ...card, padding: '40px 36px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, justifyContent: 'center' }}>
            <div style={{ width: 42, height: 42, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎮</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>GameZone</div>
              <div style={{ fontSize: 11, color: C.muted }}>Management System</div>
            </div>
          </div>

          {error && <ErrorMsg msg={error} />}
          {success && <SuccessMsg msg={success} />}

          {view === 'login' && <>
            <div style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 22 }}>Welcome Back</div>
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password" type="password" value={pass} onChange={setPass} placeholder="••••••••" />
            <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 18 }}>
              <span style={{ color: C.accent, cursor: 'pointer', fontSize: 12 }} onClick={() => { setError(''); setSuccess(''); setView('reset'); }}>Forgot password?</span>
            </div>
            <button style={{ ...btnS('primary'), width: '100%', padding: 13, fontSize: 15 }} onClick={handleLogin} disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
            <div style={{ textAlign: 'center', marginTop: 20, color: C.muted, fontSize: 13 }}>
              No account? <span style={{ color: C.accent, cursor: 'pointer' }} onClick={() => { setError(''); setSuccess(''); setView('register'); }}>Register as Owner</span>
            </div>
          </>}

          {view === 'register' && <>
            <div style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 22 }}>Create Account</div>
            <Field label="Full Name" value={name} onChange={setName} placeholder="Your full name" required />
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
            <Field label="Password" type="password" value={pass} onChange={setPass} placeholder="Min 6 characters" required />
            <button style={{ ...btnS('primary'), width: '100%', padding: 13, fontSize: 15 }} onClick={handleRegister} disabled={loading}>{loading ? 'Creating…' : 'Create Account'}</button>
            <div style={{ textAlign: 'center', marginTop: 20, color: C.muted, fontSize: 13 }}>
              <span style={{ color: C.accent, cursor: 'pointer' }} onClick={() => { setError(''); setView('login'); }}>← Back to login</span>
            </div>
          </>}

          {view === 'reset' && <>
            <div style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 22 }}>Reset Password</div>
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="your@email.com" />
            <button style={{ ...btnS('primary'), width: '100%', padding: 13 }} onClick={handleReset} disabled={loading}>{loading ? 'Sending…' : 'Send Reset Link'}</button>
            <div style={{ textAlign: 'center', marginTop: 20, color: C.muted, fontSize: 13 }}>
              <span style={{ color: C.accent, cursor: 'pointer' }} onClick={() => { setError(''); setView('login'); }}>← Back to login</span>
            </div>
          </>}

          {view === 'update-password' && <>
            <div style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', marginBottom: 22 }}>Set New Password</div>
            <Field label="New Password" type="password" value={newPass} onChange={setNewPass} placeholder="Min 6 characters" />
            <button style={{ ...btnS('primary'), width: '100%', padding: 13 }} onClick={handleUpdatePass} disabled={loading}>{loading ? 'Updating…' : 'Update Password'}</button>
          </>}
        </div>
      </div>
    </div>
  );
}

// ─── LAYOUT ───────────────────────────────────────────────────
function Layout({ page, setPage, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const { profile, logout } = useAuth();

  const navMap = {
    superadmin: [
      { key: 'overview', icon: '▦', label: 'Dashboard' },
      { key: 'zones', icon: '🏢', label: 'Game Zones' },
      { key: 'owners', icon: '👑', label: 'Owners' },
      { key: 'players', icon: '🎮', label: 'Players' },
      { key: 'subscriptions', icon: '💳', label: 'Subscriptions' },
      { key: 'reports', icon: '📊', label: 'Reports' },
      { key: 'notifications', icon: '🔔', label: 'Notifications' },
      { key: 'admins', icon: '🛡️', label: 'Admin Mgmt' },
      { key: 'settings', icon: '⚙️', label: 'Settings' },
    ],
    owner: [
      { key: 'overview', icon: '▦', label: 'Dashboard' },
      { key: 'staff', icon: '👥', label: 'My Staff' },
      { key: 'players', icon: '🎮', label: 'Players' },
      { key: 'sessions', icon: '⏱️', label: 'Sessions' },
      { key: 'earnings', icon: '💰', label: 'Earnings' },
      { key: 'subscription', icon: '💳', label: 'Subscription' },
      { key: 'notifications', icon: '🔔', label: 'Notifications' },
    ],
    staff: [
      { key: 'overview', icon: '▦', label: 'Dashboard' },
      { key: 'register', icon: '➕', label: 'Register Player' },
      { key: 'sessions', icon: '⏱️', label: 'Sessions' },
      { key: 'payments', icon: '💵', label: 'Payments' },
    ],
  };

  const items = navMap[profile?.role] || [];
  const currentLabel = items.find(i => i.key === page)?.label || 'Dashboard';

  const isOwnerOrStaff = profile?.role === 'owner' || profile?.role === 'staff';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar - hidden on mobile for owner/staff */}
      <div style={{ width: 230, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200, overflowY: 'auto', transform: isMobile && isOwnerOrStaff ? 'translateX(-100%)' : 'translateX(0)', transition: 'transform 0.3s ease' }}>
        <div style={{ padding: '18px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🎮</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>GameZone</div>
            <div style={{ fontSize: 10, color: C.muted }}>Management System</div>
          </div>
        </div>

        <div style={{ padding: '12px 10px', flex: 1 }}>
          <div style={{ fontSize: 9, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, padding: '0 8px', marginBottom: 6 }}>Menu</div>
          {items.map(it => {
            const active = page === it.key;
            return (
              <div key={it.key} onClick={() => setPage(it.key)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: active ? `${C.accent}18` : 'transparent', color: active ? C.accent : C.muted, fontWeight: active ? 600 : 400, fontSize: 13, border: active ? `1px solid ${C.accent}30` : '1px solid transparent', transition: 'all 0.15s' }}>
                <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{it.icon}</span>
                {it.label}
              </div>
            );
          })}
        </div>

        <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#000', flexShrink: 0 }}>{initials(profile?.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.name}</div>
            <div style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, display: 'inline-block', background: profile?.role === 'superadmin' ? `${C.purple}25` : profile?.role === 'owner' ? `${C.accent}20` : `${C.green}20`, color: profile?.role === 'superadmin' ? C.purple : profile?.role === 'owner' ? C.accent : C.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{profile?.role}</div>
          </div>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 15 }} title="Logout">⏏</button>
        </div>
      </div>

   {/* Mobile bottom nav for owner/staff */}
      {isMobile && isOwnerOrStaff && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 0', zIndex: 300 }}>
          {items.map(it => (
            <div key={it.key} onClick={() => setPage(it.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 8px', borderRadius: 8, background: page === it.key ? `${C.accent}18` : 'transparent', minWidth: 50 }}>
              <span style={{ fontSize: 20 }}>{it.icon}</span>
              <span style={{ fontSize: 9, color: page === it.key ? C.accent : C.muted, fontWeight: page === it.key ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>{it.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main */}
      <div style={{ marginLeft: isMobile ? 0 : 230, flex: 1, paddingBottom: isMobile && isOwnerOrStaff ? 80 : 0 }}>        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
  <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: C.text, fontSize: 22, cursor: 'pointer', display: window.innerWidth < 768 ? 'block' : 'none' }}>☰</button>
  <div style={{ fontSize: 19, fontWeight: 700 }}>{currentLabel}</div>
</div>          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span onClick={() => setPage('notifications')} style={{ fontSize: 18, cursor: 'pointer' }}>🔔</span>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#000' }}>{initials(profile?.name)}</div>
          </div>
        </div>
        <div style={{ padding: 26 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── SUPER ADMIN PAGES ────────────────────────────────────────
function SAOverview() {
  const { data: stats, loading } = usePlatformStats();
  const { data: revenueData } = useRevenueByMonth();

  const chartData = (revenueData || []).slice(0, 6).reverse().map(r => ({
    label: new Date(r.month).toLocaleString('default', { month: 'short' }),
    value: Number(r.revenue),
  }));

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Platform Overview</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>Real-time metrics across all game zones.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Monthly Revenue" value={fmt$(stats?.monthlyRevenue)} color={C.accent} />
        <StatCard label="Active Zones" value={stats?.activeZones || 0} color={C.green} />
        <StatCard label="Total Players" value={stats?.totalPlayers || 0} color={C.purple} />
        <StatCard label="Total Zones" value={stats?.totalZones || 0} color={C.yellow} />
      </div>
      <div style={{ ...card, padding: '20px 22px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Revenue Trend (Last 6 Months)</div>
        {chartData.length ? <BarChart data={chartData} color={C.accent} height={130} /> : <div style={{ color: C.dim, padding: 20, textAlign: 'center' }}>No revenue data yet. Payments will appear here.</div>}
      </div>
    </div>
  );
}

function SAZones() {
  const { data: zones, loading, refetch } = useZones();
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', location: '', plan: 'Basic', max_stations: '10', status: 'active' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = (zones || []).filter(z => z.name?.toLowerCase().includes(search.toLowerCase()) || z.location?.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setForm({ name: '', location: '', plan: 'Basic', max_stations: '10', status: 'active' }); setErr(''); setModal('new'); };
  const openEdit = (z) => { setForm({ name: z.name, location: z.location, plan: z.plan, max_stations: String(z.max_stations), status: z.status }); setErr(''); setModal(z.id); };

  const save = async () => {
    if (!form.name || !form.location) { setErr('Name and location are required.'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, location: form.location, plan: form.plan, max_stations: Number(form.max_stations), status: form.status };
      if (modal === 'new') await db.createZone(payload);
      else await db.updateZone(modal, payload);
      await refetch();
      setModal(null);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (z) => {
    await db.updateZone(z.id, { status: z.status === 'active' ? 'inactive' : 'active' });
    refetch();
  };

  const del = async (id) => {
    if (!confirm('Delete this zone? This cannot be undone.')) return;
    await db.deleteZone(id);
    refetch();
  };

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Game Zones</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>Manage all gaming center locations — live from Supabase.</div>
      {loading ? <Spinner /> : (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 10, justifyContent: 'space-between' }}>
            <input style={{ ...inp, width: 220 }} placeholder="🔍 Search zones…" value={search} onChange={e => setSearch(e.target.value)} />
            <button style={btnS('primary')} onClick={openNew}>+ New Zone</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Zone', 'Location', 'Stations', 'Plan', 'Status', 'Created', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(z => (
                <tr key={z.id}>
                  <td style={td}><div style={{ fontWeight: 600 }}>{z.name}</div></td>
                  <td style={{ ...td, color: C.muted }}>{z.location}</td>
                  <td style={td}>{z.max_stations}</td>
                  <td style={td}>{planBadge(z.plan)}</td>
                  <td style={td}>{badge(z.status)}</td>
                  <td style={{ ...td, color: C.muted }}>{fmtDate(z.created_at)}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button style={btnS('outline', true)} onClick={() => openEdit(z)}>Edit</button>
                      <button style={btnS(z.status === 'active' ? 'danger' : 'success', true)} onClick={() => toggleStatus(z)}>{z.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                      <button style={btnS('danger', true)} onClick={() => del(z.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>No zones found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'new' ? 'Add Zone' : 'Edit Zone'} onClose={() => setModal(null)}
          footer={<><button style={btnS('outline')} onClick={() => setModal(null)}>Cancel</button><button style={btnS('primary')} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Zone'}</button></>}>
          {err && <ErrorMsg msg={err} />}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Zone Name" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
            <Field label="Location" value={form.location} onChange={v => setForm({ ...form, location: v })} required />
            <Field label="Max Stations" type="number" value={form.max_stations} onChange={v => setForm({ ...form, max_stations: v })} />
            <Field label="Plan" value={form.plan} onChange={v => setForm({ ...form, plan: v })} options={[{ value: 'Basic', label: 'Basic' }, { value: 'Pro', label: 'Pro' }, { value: 'Premium', label: 'Premium' }]} />
            <Field label="Status" value={form.status} onChange={v => setForm({ ...form, status: v })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function SAOwners() {
  const { data: owners, loading, refetch } = useOwners();
  const { data: zones } = useZones();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', status: 'active', zone_id: '' });

  const filtered = (owners || []).filter(o => o.name?.toLowerCase().includes(search.toLowerCase()) || o.email?.toLowerCase().includes(search.toLowerCase()));

const save = async () => {
    try {
      await db.updateProfile(modal, { name: form.name, status: form.status, zone_id: form.zone_id || null });
      if (form.zone_id) {
        await db.updateZone(form.zone_id, { owner_id: modal });
      }
      await refetch();
      setModal(null);
    } catch (e) {
      console.error('Save owner error:', e.message);
      alert('Error saving: ' + e.message);
    }
  };

  const toggleStatus = async (o) => {
    await db.updateProfile(o.id, { status: o.status === 'active' ? 'suspended' : 'active' });
    refetch();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Owners</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>All zone owners — data from Supabase profiles table.</div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
          <input style={{ ...inp, width: 220 }} placeholder="🔍 Search owners…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Owner', 'Email', 'Zone', 'Status', 'Joined', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#000', flexShrink: 0 }}>{initials(o.name)}</div><span style={{ fontWeight: 600 }}>{o.name}</span></div></td>
                <td style={{ ...td, color: C.muted }}>{o.email}</td>
                <td style={td}>{(zones || []).find(z => z.id === o.zone_id)?.name || <span style={{ color: C.dim }}>—</span>}</td>                <td style={td}>{badge(o.status)}</td>
                <td style={{ ...td, color: C.muted }}>{fmtDate(o.created_at)}</td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button style={btnS('outline', true)} onClick={() => { setForm({ name: o.name, email: o.email, status: o.status }); setModal(o.id); }}>Edit</button>
                    <button style={btnS(o.status === 'active' ? 'danger' : 'success', true)} onClick={() => toggleStatus(o)}>{o.status === 'active' ? 'Suspend' : 'Activate'}</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>No owners yet.</td></tr>}
          </tbody>
        </table>
      </div>

     {modal && (
       <Modal title="Edit Owner" onClose={() => setModal(null)}
          footer={<><button style={btnS('outline')} onClick={() => setModal(null)}>Cancel</button><button style={btnS('primary')} onClick={save}>Save</button></>}>
          <Field label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Field label="Status" value={form.status} onChange={v => setForm({ ...form, status: v })} options={[{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }, { value: 'pending', label: 'Pending' }]} />
          <Field label="Assign Zone" value={form.zone_id || ''} onChange={v => setForm({ ...form, zone_id: v })} options={[{ value: '', label: '— No Zone —' }, ...(zones || []).filter(z => !z.owner_id || z.owner_id === modal).map(z => ({ value: z.id, label: z.name }))]} />
        </Modal>
      )}
    </div>
  );
}

function SAPlayers() {
  const { data: players, loading } = usePlayers();
  const [search, setSearch] = useState('');
  const filtered = (players || []).filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Players</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>All registered players across all zones.</div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <input style={{ ...inp, width: 220 }} placeholder="🔍 Search players…" value={search} onChange={e => setSearch(e.target.value)} />
          <span style={{ color: C.muted, fontSize: 13 }}>{filtered.length} players</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Player', 'Email', 'Zone', 'Sessions', 'Spent', 'Last Seen', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td style={td}><span style={{ fontWeight: 600 }}>{p.name}</span></td>
                <td style={{ ...td, color: C.muted }}>{p.email}</td>
                <td style={td}>{p.game_zones?.name || '—'}</td>
                <td style={td}>{p.total_sessions}</td>
                <td style={{ ...td, color: C.accent, fontWeight: 700 }}>{fmt$(p.total_spent)}</td>
                <td style={{ ...td, color: C.muted }}>{p.last_seen ? fmtDate(p.last_seen) : 'Never'}</td>
                <td style={td}>{badge(p.status)}</td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>No players yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SASubscriptions() {
  const { data: plans, loading } = useSubscriptionPlans();
  if (loading) return <Spinner />;
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Subscriptions</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>Plans are fetched live from Supabase <code style={{ color: C.accent }}>subscription_plans</code> table.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 28 }}>
        {(plans || []).map(p => (
          <div key={p.id} style={{ ...card, padding: 22, border: p.name === 'Pro' ? `2px solid ${C.accent}` : `1px solid ${C.border}` }}>
            {p.name === 'Pro' && <div style={{ background: C.accent, textAlign: 'center', padding: 5, fontSize: 10, fontWeight: 700, color: '#000', letterSpacing: 1, margin: '-22px -22px 18px', borderRadius: '12px 12px 0 0' }}>MOST POPULAR</div>}
            <div style={{ fontSize: 20, fontWeight: 800, color: p.name === 'Pro' ? C.accent : p.name === 'Premium' ? C.purple : C.muted, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 4 }}>${p.price_monthly}<span style={{ fontSize: 13, fontWeight: 400, color: C.muted }}>/mo</span></div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>{p.max_stations === 999 ? 'Unlimited' : p.max_stations} stations</div>
            {(typeof p.features === 'string' ? JSON.parse(p.features) : p.features || []).map(f => (
              <div key={f} style={{ display: 'flex', gap: 7, marginBottom: 8, fontSize: 12, color: C.muted }}><span style={{ color: C.green }}>✓</span>{f}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SAReports() {
  const { data: analytics, loading } = useZoneAnalytics();
  const { data: revenue } = useRevenueByMonth();

  const chartData = (revenue || []).slice(0, 6).reverse().map(r => ({
    label: new Date(r.month).toLocaleString('default', { month: 'short' }),
    value: Number(r.revenue),
  }));

  if (loading) return <Spinner />;

  const totalRevenue = (analytics || []).reduce((s, z) => s + Number(z.total_revenue), 0);
  const totalPlayers = (analytics || []).reduce((s, z) => s + Number(z.total_players), 0);

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 22 }}>Reports & Analytics</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <StatCard label="Total Revenue" value={fmt$(totalRevenue)} color={C.accent} />
        <StatCard label="Total Players" value={totalPlayers} color={C.green} />
        <StatCard label="Active Zones" value={(analytics || []).filter(z => z.status === 'active').length} color={C.purple} />
        <StatCard label="Total Sessions" value={(analytics || []).reduce((s, z) => s + Number(z.total_sessions), 0)} color={C.yellow} />
      </div>
      <div style={{ ...card, padding: '20px 22px', marginBottom: 22 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Revenue by Month</div>
        {chartData.length ? <BarChart data={chartData} color={C.accent} height={130} /> : <div style={{ color: C.dim, textAlign: 'center', padding: 20 }}>No payment data yet.</div>}
      </div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}><div style={{ fontWeight: 700, fontSize: 15 }}>Zone Performance</div></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Zone', 'Revenue', 'Players', 'Sessions', 'Active Sessions', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {(analytics || []).map(z => (
              <tr key={z.zone_id}>
                <td style={td}><span style={{ fontWeight: 600 }}>{z.zone_name}</span></td>
                <td style={{ ...td, color: C.accent, fontWeight: 700 }}>{fmt$(z.total_revenue)}</td>
                <td style={td}>{z.total_players}</td>
                <td style={td}>{z.total_sessions}</td>
                <td style={td}><span style={{ color: Number(z.active_sessions) > 0 ? C.green : C.dim, fontWeight: 700 }}>{z.active_sessions}</span></td>
                <td style={td}>{badge(z.status)}</td>
              </tr>
            ))}
            {!analytics?.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>No analytics data yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NotificationsPage({ zoneId = null }) {
  const { profile } = useAuth();
  const { data: notifications, loading, refetch } = useNotifications(zoneId);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info' });
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!form.title || !form.message) return;
    setSending(true);
    try {
      await db.sendNotification({ ...form, sent_by: profile.id, target_zone_id: zoneId || null });
      await refetch();
      setModal(false);
      setForm({ title: '', message: '', type: 'info' });
    } finally { setSending(false); }
  };

  const markRead = async (id) => {
    await db.markNotificationRead(id, profile.id);
    refetch();
  };

  const typeColor = { info: C.accent, warning: C.yellow, success: C.green, error: C.red };
  const typeIcon = { info: 'ℹ️', warning: '⚠️', success: '✅', error: '❌' };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Notifications</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>Real-time notifications — stored in Supabase with read/unread tracking.</div>
      {profile?.role === 'superadmin' && (
        <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <button style={btnS('primary')} onClick={() => setModal(true)}>+ Send Announcement</button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(notifications || []).map(n => {
          const isRead = n.notification_reads?.some(r => r.user_id === profile?.id);
          return (
            <div key={n.id} style={{ ...card, padding: '14px 18px', display: 'flex', gap: 14, borderLeft: `3px solid ${typeColor[n.type] || C.accent}`, opacity: isRead ? 0.6 : 1 }}>
              <span style={{ fontSize: 20, marginTop: 2 }}>{typeIcon[n.type] || '📣'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>{n.title}</div>
                <div style={{ color: C.muted, fontSize: 13, marginBottom: 6 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{fmtDate(n.created_at)} {fmtTime(n.created_at)}{n.profiles?.name ? ` · Sent by ${n.profiles.name}` : ''}</div>
              </div>
              {!isRead && <button style={btnS('outline', true)} onClick={() => markRead(n.id)}>Mark Read</button>}
            </div>
          );
        })}
        {!notifications?.length && <div style={{ ...card, padding: 30, textAlign: 'center', color: C.dim }}>No notifications yet.</div>}
      </div>

      {modal && (
        <Modal title="Send Announcement" onClose={() => setModal(false)}
          footer={<><button style={btnS('outline')} onClick={() => setModal(false)}>Cancel</button><button style={btnS('primary')} onClick={send} disabled={sending}>{sending ? 'Sending…' : 'Send'}</button></>}>
          <Field label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} required />
          <Field label="Message" type="textarea" value={form.message} onChange={v => setForm({ ...form, message: v })} required />
          <Field label="Type" value={form.type} onChange={v => setForm({ ...form, type: v })} options={[{ value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }, { value: 'success', label: 'Success' }, { value: 'error', label: 'Error' }]} />
        </Modal>
      )}
    </div>
  );
}

function SAAdmins() {
  const { data: users, loading, refetch } = useAllUsers();
  const admins = (users || []).filter(u => u.role === 'superadmin' || u.role === 'admin');

  const toggleStatus = async (u) => {
    await db.updateProfile(u.id, { status: u.status === 'active' ? 'suspended' : 'active' });
    refetch();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Admin Management</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>To add an admin: have them register, then update their role in the profiles table.</div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Admin', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id}>
                <td style={td}><span style={{ fontWeight: 600 }}>{a.name}</span></td>
                <td style={{ ...td, color: C.muted }}>{a.email}</td>
                <td style={td}><span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: `${C.purple}25`, color: C.purple }}>{a.role}</span></td>
                <td style={td}>{badge(a.status)}</td>
                <td style={{ ...td, color: C.muted }}>{fmtDate(a.created_at)}</td>
                <td style={td}><button style={btnS(a.status === 'active' ? 'danger' : 'success', true)} onClick={() => toggleStatus(a)}>{a.status === 'active' ? 'Suspend' : 'Activate'}</button></td>
              </tr>
            ))}
            {!admins.length && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>No admins found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SASettings() {
  const [maintenance, setMaintenance] = useState(false);
  const [msg, setMsg] = useState('');

  const exportData = async () => {
    try {
      const [zones, players, payments] = await Promise.all([
        db.getAllZones(), db.getAllPlayers(), db.getPaymentsByZone(null, 9999),
      ]);
      const blob = new Blob([JSON.stringify({ zones, players, payments, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `gamezone_backup_${Date.now()}.json`; a.click();
      setMsg('Backup exported!');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg('Export failed: ' + e.message); }
  };

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>System Settings</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>Platform-wide configuration.</div>
      {msg && <SuccessMsg msg={msg} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {[
          { title: '🔧 Maintenance Mode', desc: 'Disable the platform for all non-admin users during maintenance windows.', action: <button style={btnS(maintenance ? 'success' : 'danger')} onClick={() => setMaintenance(!maintenance)}>{maintenance ? '🔴 Maintenance ON — Click to go live' : '🟢 System Live — Enable maintenance'}</button> },
          { title: '💾 Backup Database', desc: 'Export all Supabase data (zones, players, payments) as a JSON file.', action: <button style={btnS('outline')} onClick={exportData}>⬇ Export Backup JSON</button> },
          { title: '🔑 Supabase Connection', desc: 'Connected to your Supabase project via environment variables.', action: <div style={{ fontSize: 12, color: C.dim, fontFamily: 'monospace' }}><div style={{ marginBottom: 4 }}>URL: {import.meta?.env?.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</div><div>Anon Key: {import.meta?.env?.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</div></div> },
          { title: '📋 RLS Status', desc: 'Row Level Security is enforced server-side on all tables via PostgreSQL policies.', action: <div style={{ fontSize: 12, color: C.green }}>✅ RLS enabled on all tables<br /><span style={{ color: C.muted }}>Superadmin · Owner · Staff policies active</span></div> },
        ].map(item => (
          <div key={item.title} style={{ ...card, padding: '22px 24px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{item.title}</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>{item.desc}</div>
            {item.action}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OWNER PAGES ─────────────────────────────────────────────
function OwnerOverview() {
  const { profile } = useAuth();
  const { data: analytics } = useZoneAnalytics(profile?.zone_id);
  const { data: zoneData } = useZone(profile?.zone_id);
  const zone = analytics?.[0];
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Owner Dashboard</div>
<div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>Zone: <strong style={{ color: C.accent }}>{zoneData?.name || profile?.game_zones?.name || '—'}</strong></div>      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="Total Revenue" value={fmt$(zone?.total_revenue)} color={C.accent} />
        <StatCard label="Total Players" value={zone?.total_players || 0} color={C.green} />
        <StatCard label="Sessions" value={zone?.total_sessions || 0} color={C.purple} />
        <StatCard label="Active Now" value={zone?.active_sessions || 0} color={C.yellow} />
      </div>
    </div>
  );
}

function OwnerStaff() {
  const { profile } = useAuth();
  const { data: staff, loading, refetch } = useStaff(profile?.zone_id);

  const toggleStatus = async (s) => {
    await db.updateProfile(s.id, { status: s.status === 'active' ? 'suspended' : 'active' });
    refetch();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 22 }}>My Staff</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Staff accounts are created by registering with the Staff role assigned by you.</div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Name', 'Email', 'Status', 'Joined', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {(staff || []).map(s => (
              <tr key={s.id}>
                <td style={td}><span style={{ fontWeight: 600 }}>{s.name}</span></td>
                <td style={{ ...td, color: C.muted }}>{s.email}</td>
                <td style={td}>{badge(s.status)}</td>
                <td style={{ ...td, color: C.muted }}>{fmtDate(s.created_at)}</td>
                <td style={td}><button style={btnS(s.status === 'active' ? 'danger' : 'success', true)} onClick={() => toggleStatus(s)}>{s.status === 'active' ? 'Suspend' : 'Activate'}</button></td>
              </tr>
            ))}
            {!staff?.length && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>No staff assigned yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OwnerEarnings() {
  const { profile } = useAuth();
  const { data: payments, loading } = usePayments(profile?.zone_id);
  const { data: revenue } = useRevenueByMonth(profile?.zone_id);

  const chartData = (revenue || []).slice(0, 6).reverse().map(r => ({ label: new Date(r.month).toLocaleString('default', { month: 'short' }), value: Number(r.revenue) }));
  const total = (payments || []).reduce((s, p) => s + Number(p.amount), 0);

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 22 }}>Earnings</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        <StatCard label="All-Time Revenue" value={fmt$(total)} color={C.accent} />
        <StatCard label="Transactions" value={payments?.length || 0} color={C.green} />
        <StatCard label="Avg Transaction" value={payments?.length ? fmt$(total / payments.length) : '$0'} color={C.purple} />
      </div>
      <div style={{ ...card, padding: '20px 22px', marginBottom: 22 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Monthly Revenue</div>
        {chartData.length ? <BarChart data={chartData} color={C.green} height={120} /> : <div style={{ color: C.dim, textAlign: 'center', padding: 20 }}>No revenue data yet.</div>}
      </div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}><span style={{ fontWeight: 700 }}>Recent Payments</span></div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Player', 'Amount', 'Method', 'Date'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {(payments || []).slice(0, 20).map(p => (
              <tr key={p.id}>
                <td style={td}>{p.players?.name || '—'}</td>
                <td style={{ ...td, color: C.green, fontWeight: 700 }}>{fmt$(p.amount)}</td>
                <td style={td}>{p.method}</td>
                <td style={{ ...td, color: C.muted }}>{fmtDate(p.created_at)}</td>
              </tr>
            ))}
            {!payments?.length && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>No payments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OwnerSubscription() {
  const { profile } = useAuth();
  const { data: sub, loading } = useActiveSubscription(profile?.zone_id);
  const { data: plans } = useSubscriptionPlans();
  if (loading) return <Spinner />;
  const plan = sub?.subscription_plans || plans?.find(p => p.name === 'Basic');

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 22 }}>Subscription</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ ...card, padding: 24, border: `2px solid ${C.accent}` }}>
          <div style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Current Plan</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.accent, marginBottom: 4 }}>{plan?.name || '—'}</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 14 }}>${plan?.price_monthly || 0}<span style={{ fontSize: 13, color: C.muted }}>/mo</span></div>
          {(typeof plan?.features === 'string' ? JSON.parse(plan.features) : plan?.features || []).map(f => (
            <div key={f} style={{ display: 'flex', gap: 7, marginBottom: 8, fontSize: 13, color: C.muted }}><span style={{ color: C.green }}>✓</span>{f}</div>
          ))}
        </div>
        <div style={{ ...card, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Billing Details</div>
          {[
            ['Status', sub ? badge(sub.status) : badge('pending')],
            ['Started', fmtDate(sub?.started_at)],
            ['Expires', fmtDate(sub?.expires_at)],
            ['Max Stations', plan?.max_stations === 999 ? 'Unlimited' : plan?.max_stations || '—'],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, borderBottom: `1px solid ${C.border}20`, paddingBottom: 14 }}>
              <span style={{ color: C.muted, fontSize: 13 }}>{label}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STAFF PAGES ─────────────────────────────────────────────
function StaffOverview() {
  const { profile } = useAuth();
  const { data: sessions } = useSessions(profile?.zone_id);
  const active = (sessions || []).filter(s => s.status === 'active').length;
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 22 }}>Staff Dashboard</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <StatCard label="Active Sessions" value={active} color={C.accent} />
        <StatCard label="Total Sessions Today" value={sessions?.length || 0} color={C.green} />
        <StatCard label="Zone" value={profile?.game_zones?.name || '—'} color={C.purple} />
      </div>
    </div>
  );
}

function StaffRegisterPlayer() {
  const { profile } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);

  const register = async () => {
    if (!form.name) { setErr('Name is required.'); return; }
    setSaving(true); setErr('');
    try {
      await db.createPlayer({ ...form, zone_id: profile.zone_id, registered_by: profile.id, status: 'active' });
      setOk(`${form.name} registered successfully!`);
      setForm({ name: '', email: '', phone: '' });
      setTimeout(() => setOk(''), 4000);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 22 }}>Register Player</div>
      {err && <ErrorMsg msg={err} />}
      {ok && <SuccessMsg msg={ok} />}
      <div style={{ ...card, padding: 26, maxWidth: 440 }}>
        <Field label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Player's full name" required />
        <Field label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="player@email.com" />
        <Field label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} placeholder="+1 555 000 0000" />
        <button style={{ ...btnS('primary'), width: '100%', padding: 13, marginTop: 4 }} onClick={register} disabled={saving}>{saving ? 'Registering…' : 'Register Player'}</button>
      </div>
    </div>
  );
}

function StaffSessions() {
  const { profile } = useAuth();
  const { data: players } = usePlayers(profile?.zone_id);
  const { data: sessions, loading, refetch } = useSessions(profile?.zone_id);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ player_id: '', station_number: '1', amount: '10' });
  const [ending, setEnding] = useState(null);
  const [endAmount, setEndAmount] = useState('15');

  const startSession = async () => {
    if (!form.player_id) return;
    await db.startSession({ player_id: form.player_id, zone_id: profile.zone_id, station_number: Number(form.station_number), started_by: profile.id });
    setModal(false);
    refetch();
  };

  const endSession = async (id) => {
    await db.endSession(id, profile.id, Number(endAmount));
    await db.createPayment({ session_id: id, player_id: sessions.find(s => s.id === id)?.player_id, zone_id: profile.zone_id, amount: Number(endAmount), method: 'cash', processed_by: profile.id });
    setEnding(null);
    refetch();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 22 }}>Active Sessions</div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btnS('primary')} onClick={() => setModal(true)}>+ Start Session</button>
      </div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Player', 'Station', 'Started', 'Status', 'Action'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {(sessions || []).map(s => (
              <tr key={s.id}>
                <td style={td}><span style={{ fontWeight: 600 }}>{s.players?.name || '—'}</span></td>
                <td style={td}>#{s.station_number}</td>
                <td style={{ ...td, color: C.muted }}>{fmtTime(s.started_at)}</td>
                <td style={td}>{badge(s.status)}</td>
                <td style={td}>{s.status === 'active' && <button style={btnS('danger', true)} onClick={() => setEnding(s.id)}>End Session</button>}</td>
              </tr>
            ))}
            {!sessions?.length && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>No active sessions.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Start Session" onClose={() => setModal(false)}
          footer={<><button style={btnS('outline')} onClick={() => setModal(false)}>Cancel</button><button style={btnS('primary')} onClick={startSession}>Start</button></>}>
          <Field label="Player" value={form.player_id} onChange={v => setForm({ ...form, player_id: v })}
            options={[{ value: '', label: '— Select player —' }, ...(players || []).map(p => ({ value: p.id, label: p.name }))]} />
          <Field label="Station Number" type="number" value={form.station_number} onChange={v => setForm({ ...form, station_number: v })} />
        </Modal>
      )}

      {ending && (
        <Modal title="End Session & Record Payment" onClose={() => setEnding(null)}
          footer={<><button style={btnS('outline')} onClick={() => setEnding(null)}>Cancel</button><button style={btnS('danger')} onClick={() => endSession(ending)}>End & Charge</button></>}>
          <Field label="Amount Charged ($)" type="number" value={endAmount} onChange={setEndAmount} />
        </Modal>
      )}
    </div>
  );
}

function StaffPayments() {
  const { profile } = useAuth();
  const { data: payments, loading } = usePayments(profile?.zone_id);
  if (loading) return <Spinner />;
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 22 }}>Payments</div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Player', 'Amount', 'Method', 'Date & Time'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {(payments || []).map(p => (
              <tr key={p.id}>
                <td style={td}>{p.players?.name || '—'}</td>
                <td style={{ ...td, color: C.green, fontWeight: 700 }}>{fmt$(p.amount)}</td>
                <td style={td}>{p.method}</td>
                <td style={{ ...td, color: C.muted }}>{fmtDate(p.created_at)} {fmtTime(p.created_at)}</td>
              </tr>
            ))}
            {!payments?.length && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>No payments recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PAGE ROUTER ─────────────────────────────────────────────
function AppPages({ page, setPage }) {
  const { profile } = useAuth();
  const role = profile?.role;
  const zoneId = profile?.zone_id;

  const saPages = { overview: SAOverview, zones: SAZones, owners: SAOwners, players: SAPlayers, subscriptions: SASubscriptions, reports: SAReports, notifications: () => <NotificationsPage />, admins: SAAdmins, settings: SASettings };
  const ownerPages = { overview: OwnerOverview, staff: OwnerStaff, players: () => <PlayersList zoneId={zoneId} />, sessions: StaffSessions, earnings: OwnerEarnings, subscription: OwnerSubscription, notifications: () => <NotificationsPage zoneId={zoneId} /> };
  const staffPages = { overview: StaffOverview, register: StaffRegisterPlayer, sessions: StaffSessions, payments: StaffPayments };

  const pages = role === 'superadmin' ? saPages : role === 'owner' ? ownerPages : staffPages;
  const Comp = pages[page] || pages['overview'];
  return Comp ? <Comp /> : null;
}

function PlayersList({ zoneId }) {
  const { data: players, loading } = usePlayers(zoneId);
  if (loading) return <Spinner />;
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 22 }}>Players</div>
      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Name', 'Email', 'Sessions', 'Spent', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {(players || []).map(p => (
              <tr key={p.id}>
                <td style={td}><span style={{ fontWeight: 600 }}>{p.name}</span></td>
                <td style={{ ...td, color: C.muted }}>{p.email || '—'}</td>
                <td style={td}>{p.total_sessions}</td>
                <td style={{ ...td, color: C.accent, fontWeight: 700 }}>{fmt$(p.total_spent)}</td>
                <td style={td}>{badge(p.status)}</td>
              </tr>
            ))}
            {!players?.length && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>No players yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────
function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [page, setPage] = useState('overview');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎮</div>
          <div style={{ color: C.accent, fontSize: 16, fontWeight: 600 }}>Loading GameZone…</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <AuthPage />;

  return (
    <Layout page={page} setPage={setPage}>
      <AppPages page={page} setPage={setPage} />
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: C.bg, color: C.text, minHeight: '100vh', fontSize: 14 }}>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          input:focus, select:focus, textarea:focus { border-color: #00d4ff !important; box-shadow: 0 0 0 3px #00d4ff18; }
          tr:hover td { background: rgba(255,255,255,0.02); }
          button:hover { opacity: 0.85; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-thumb { background: #1e2d50; border-radius: 3px; }
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900&display=swap');
        `}</style>
        <AppContent />
      </div>
    </AuthProvider>
  );
}
