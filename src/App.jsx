// src/App.jsx
// ─── Full Game Zone Management System — Supabase Edition ─────
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth, RequireAuth } from './context/AuthContext';
import { signUp, resetPassword, updatePassword } from './lib/supabase';
import * as db from './lib/supabase';
import { supabase } from './lib/supabase';
import {
  useZones, useZone, useOwners, usePlayers, useStaff,
  useSessions, usePayments, useNotifications,
  usePlatformStats, useZoneAnalytics, useSubscriptionPlans,
  useActiveSubscription, useRevenueByMonth, useMutation, useAllUsers,
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
const th = { padding: '10px 12px', textAlign: 'left', fontSize: 10, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: `1px solid ${C.border}`, background: C.surface, whiteSpace: 'nowrap' };
const td = { padding: '10px 12px', borderBottom: `1px solid ${C.border}22`, fontSize: 12, color: C.text, verticalAlign: 'middle', whiteSpace: 'nowrap' };

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

function MiniChart({ data }) {
  return <BarChart data={data} color={C.accent} height={100} />;
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      { key: 'games', icon: '🕹️', label: 'Games' },
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
      {/* Overlay for mobile sidebar */}
      {isMobile && !isOwnerOrStaff && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 150 }} />
      )}

      {/* Sidebar */}
      <div style={{ width: 230, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200, overflowY: 'auto', transform: (isMobile && isOwnerOrStaff) || (isMobile && !sidebarOpen) ? 'translateX(-100%)' : 'translateX(0)', transition: 'transform 0.3s ease' }}>
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
<div key={it.key} onClick={() => { setPage(it.key); if (isMobile) setSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: active ? `${C.accent}18` : 'transparent', color: active ? C.accent : C.muted, fontWeight: active ? 600 : 400, fontSize: 13, border: active ? `1px solid ${C.accent}30` : '1px solid transparent', transition: 'all 0.15s' }}>                <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{it.icon}</span>
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
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: `rgba(15,17,26,0.97)`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '6px 0 calc(6px + env(safe-area-inset-bottom))', zIndex: 300 }}>
          {items.slice(0, 5).map(it => {
            const active = page === it.key;
            return (
              <div key={it.key} onClick={() => setPage(it.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', padding: '6px 10px', borderRadius: 12, flex: 1, position: 'relative' }}>
                {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 32, height: 3, background: C.accent, borderRadius: '0 0 4px 4px' }} />}
                <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? `${C.accent}20` : 'transparent', transition: 'all 0.2s', fontSize: 18 }}>{it.icon}</div>
                <span style={{ fontSize: 9, color: active ? C.accent : C.dim, fontWeight: active ? 700 : 400, textAlign: 'center', letterSpacing: 0.3 }}>{it.label}</span>
              </div>
            );
          })}
          {items.length > 5 && (
            <div onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', padding: '6px 10px', flex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: sidebarOpen ? `${C.accent}20` : 'transparent', fontSize: 18 }}>•••</div>
              <span style={{ fontSize: 9, color: C.dim, fontWeight: 400 }}>More</span>
            </div>
          )}
        </div>
      )}

      {/* More menu drawer for owner/staff on mobile */}
      {isMobile && isOwnerOrStaff && sidebarOpen && (
        <>
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }} />
          <div style={{ position: 'fixed', bottom: 'calc(70px + env(safe-area-inset-bottom))', left: 12, right: 12, background: C.surface, borderRadius: 20, zIndex: 500, padding: 16, border: `1px solid ${C.border}`, boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, paddingLeft: 4 }}>More Options</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {items.slice(5).map(it => {
                const active = page === it.key;
                return (
                  <div key={it.key} onClick={() => { setPage(it.key); setSidebarOpen(false); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 12, background: active ? `${C.accent}18` : C.bg, cursor: 'pointer', border: active ? `1px solid ${C.accent}40` : `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 20 }}>{it.icon}</span>
                    <span style={{ fontSize: 9, color: active ? C.accent : C.muted, textAlign: 'center', fontWeight: active ? 700 : 400 }}>{it.label}</span>
                  </div>
                );
              })}
              <div onClick={() => { logout(); setSidebarOpen(false); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 12, background: `${C.red}12`, cursor: 'pointer', border: `1px solid ${C.red}30` }}>
                <span style={{ fontSize: 20 }}>⏏</span>
                <span style={{ fontSize: 9, color: C.red, textAlign: 'center', fontWeight: 600 }}>Logout</span>
              </div>
            </div>
          </div>
        </>
      )} 

     {/* Main */}
      <div style={{ marginLeft: isMobile ? 0 : 230, width: isMobile ? '100%' : `calc(100% - 230px)`, flex: 1, paddingBottom: isMobile && isOwnerOrStaff ? 80 : 20, transition: 'margin-left 0.3s ease', minHeight: '100vh' }}>
        {/* Topbar */}
        <div style={{ background: scrolled ? `rgba(15,17,26,0.95)` : C.surface, backdropFilter: scrolled ? 'blur(20px)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none', borderBottom: `1px solid ${scrolled ? C.border : C.border}`, padding: isMobile ? '10px 14px' : '14px 26px',display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {(!isOwnerOrStaff || !isMobile) && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ width: 36, height: 36, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 16, cursor: 'pointer', display: isMobile ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center' }}>☰</button>
            )}
            {isMobile && (
              <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎮</div>
            )}
            <div style={{ fontSize: isMobile ? 16 : 19, fontWeight: 700 }}>{currentLabel}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div onClick={() => setPage('notifications')} style={{ width: 36, height: 36, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>🔔</div>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#000', cursor: 'pointer' }}>{initials(profile?.name)}</div>
            {isMobile && isOwnerOrStaff && <div onClick={logout} style={{ width: 36, height: 36, borderRadius: 10, background: `${C.red}18`, border: `1px solid ${C.red}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>⏏</div>}
          </div>
        </div>
        <div style={{ padding: isMobile ? '16px 14px' : '26px' }}>{children}</div>
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
          <div className="table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}><table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>

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
          </table></div>
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
<div className="table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}><table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>          <thead><tr>{['Owner', 'Email', 'Zone', 'Status', 'Joined', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
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
        </table></div>
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
<div className="table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}><table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>          <thead><tr>{['Player', 'Email', 'Zone', 'Sessions', 'Spent', 'Last Seen', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
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
        </table></div>
      </div>
    </div>
  );
}

function SASubscriptions() {
  const { data: plans, loading } = useSubscriptionPlans();
  const [requests, setRequests] = useState([]);
  const [approving, setApproving] = useState(null);

  const loadRequests = async () => {
    const { data } = await supabase.from('subscriptions')
      .select('*, game_zones(name), subscription_plans(name, price_monthly)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setRequests(data || []);
  };

  useEffect(() => { loadRequests(); }, []);

  const approve = async (sub) => {
    setApproving(sub.id);
    try {
      await supabase.from('subscriptions').update({
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).eq('id', sub.id);
      await supabase.from('notifications').insert({
        title: 'Subscription Activated!',
        message: `Your ${sub.subscription_plans?.name} plan has been activated by the admin.`,
        type: 'success',
        sent_by: null,
        target_zone_id: sub.zone_id,
      });
      await loadRequests();
    } finally { setApproving(null); }
  };

  const reject = async (sub) => {
    await supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', sub.id);
    await loadRequests();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Subscriptions</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>Manage subscription plans and approve upgrade requests.</div>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: C.yellow }}>
            ⏳ Pending Upgrade Requests ({requests.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {requests.map(r => (
              <div key={r.id} style={{ ...card, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${C.yellow}` }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.game_zones?.name}</div>
                  <div style={{ fontSize: 13, color: C.muted }}>Requesting: <strong style={{ color: C.accent }}>{r.subscription_plans?.name}</strong> — ${r.subscription_plans?.price_monthly}/mo</div>
                  <div style={{ fontSize: 11, color: C.dim }}>{fmtDate(r.created_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btnS('success')} onClick={() => approve(r)} disabled={approving === r.id}>{approving === r.id ? 'Approving…' : '✅ Approve'}</button>
                  <button style={btnS('danger')} onClick={() => reject(r)}>❌ Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <div style={{ ...card, padding: '14px 20px', marginBottom: 22, color: C.green, fontSize: 13 }}>
          ✅ No pending subscription requests.
        </div>
      )}

      {/* Plans */}
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Subscription Plans</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
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
<div className="table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}><table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>          <thead><tr>{['Zone', 'Revenue', 'Players', 'Sessions', 'Active Sessions', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
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
        </table></div>
      </div>
    </div>
  );
}

function NotificationsPage({ zoneId = null }) {
  const { profile } = useAuth();
  const { data: notifications, loading, refetch } = useNotifications(zoneId);
  const { data: zones } = useZones();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', target: 'all', target_zone_id: '' });
  const [sending, setSending] = useState(false);

 const send = async () => {
    if (!form.title || !form.message) return;
    setSending(true);
    try {
      const targetZone = profile?.role === 'owner' ? profile?.zone_id : (form.target === 'zone' ? form.target_zone_id : null);
      const targetUser = profile?.role === 'owner' ? null : null;
      await db.sendNotification({ 
        title: form.title, 
        message: form.message, 
        type: form.type, 
        sent_by: profile.id, 
        target_zone_id: targetZone,
        target_user_id: targetUser,
      });
      await refetch();
      setModal(false);
      setForm({ title: '', message: '', type: 'info', target: 'all', target_zone_id: '' });
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
<div style={{ display: 'flex', gap: 8, flexDirection: 'column', alignItems: 'flex-end' }}>
                {!isRead && <button style={btnS('outline', true)} onClick={() => markRead(n.id)}>Mark Read</button>}
                {profile?.role === 'superadmin' && n.title === 'Subscription Upgrade Request' && n.target_zone_id && (
                  <button style={btnS('success', true)} onClick={async () => {
                    const { data: sub } = await supabase.from('subscriptions').select('*, subscription_plans(name)').eq('zone_id', n.target_zone_id).eq('status', 'pending').single();
                    if (sub) {
                      await supabase.from('subscriptions').update({
                        status: 'active',
                        started_at: new Date().toISOString(),
                        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                      }).eq('id', sub.id);
                      await supabase.from('notifications').insert({
                        title: 'Subscription Activated!',
                        message: `Your ${sub.subscription_plans?.name} plan has been activated!`,
                        type: 'success',
                        sent_by: null,
                        target_zone_id: n.target_zone_id,
                      });
                      await markRead(n.id);
                      refetch();
                      alert('Subscription approved!');
                    } else {
                      alert('No pending subscription request found for this zone.');
                    }
                  }}>✅ Approve Subscription</button>
                )}
              </div>            </div>
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
          {profile?.role === 'superadmin' && (
            <Field label="Send To" value={form.target} onChange={v => setForm({ ...form, target: v, target_zone_id: '' })}
              options={[{ value: 'all', label: '📢 All Owners & Staff' }, { value: 'zone', label: '🏢 Specific Zone' }]} />
          )}
          {profile?.role === 'superadmin' && form.target === 'zone' && (
            <Field label="Select Zone" value={form.target_zone_id} onChange={v => setForm({ ...form, target_zone_id: v })}
              options={[{ value: '', label: '— Select zone —' }, ...(zones || []).map(z => ({ value: z.id, label: z.name }))]} />
          )}
          {profile?.role === 'owner' && (
            <div style={{ padding: '10px 14px', background: `${C.accent}10`, borderRadius: 8, fontSize: 13, color: C.muted }}>
              📨 This message will be sent to the <strong style={{ color: C.accent }}>Super Admin</strong>.
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function SAAdmins() {
  const { data: users, loading, refetch } = useAllUsers();
const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const admins = (users || []).filter(u => u.role === 'superadmin' || u.role === 'admin');

  const createAdmin = async () => {
    if (!form.name || !form.email || !form.password) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { name: form.name, role: 'admin' } }
      });
      if (error) throw error;
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email: form.email,
          name: form.name,
          role: 'admin',
          status: 'active',
        }, { onConflict: 'id' });
        if (profileError) throw profileError;
      }
      setMsg('Admin created! They need to verify their email before logging in.');
      setModal(false);
      setForm({ name: '', email: '', password: '' });
      refetch();
    } catch(e) { setMsg('Error: ' + e.message); }
    finally { setSaving(false); }
  };
  const toggleStatus = async (u) => {
    await db.updateProfile(u.id, { status: u.status === 'active' ? 'suspended' : 'active' });
    refetch();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Admin Management</div>
        <button style={btnS('primary')} onClick={() => setModal(true)}>+ Add Admin</button>
      </div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>Manage superadmin and admin accounts.</div>
      {msg && <SuccessMsg msg={msg} />}
      <div style={{ ...card, overflow: 'hidden' }}>
<div className="table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}><table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>          <thead><tr>{['Admin', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
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
        </table></div>
      </div>
    {modal && (
        <Modal title="Add New Admin" onClose={() => setModal(false)}
          footer={<><button style={btnS('outline')} onClick={() => setModal(false)}>Cancel</button><button style={btnS('primary')} onClick={createAdmin} disabled={saving}>{saving ? 'Creating…' : 'Create Admin'}</button></>}>
          <Field label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
          <Field label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} required />
          <Field label="Password" type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} required />
        </Modal>
      )}
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
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const addStaff = async () => {
    if (!form.name || !form.email || !form.password) { setErr('All fields are required.'); return; }
    setSaving(true); setErr('');
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email: form.email, 
        password: form.password, 
        options: { data: { name: form.name, role: 'staff' } } 
      });
      if (error) throw error;
      // Wait for trigger to create profile
      await new Promise(r => setTimeout(r, 2000));
      await supabase.from('profiles').update({ 
        zone_id: profile.zone_id, 
        role: 'staff', 
        status: 'active', 
        name: form.name 
      }).eq('email', form.email);
      await refetch();
      setModal(false);
      setForm({ name: '', email: '', password: '' });
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (s) => {
    await db.updateProfile(s.id, { status: s.status === 'active' ? 'suspended' : 'active' });
    refetch();
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>My Staff</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Add and manage staff for your zone.</div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btnS('primary')} onClick={() => { setForm({ name: '', email: '', password: '' }); setErr(''); setModal(true); }}>+ Add Staff</button>
      </div>
      {modal && (
        <Modal title="Add Staff Member" onClose={() => setModal(false)}
          footer={<><button style={btnS('outline')} onClick={() => setModal(false)}>Cancel</button><button style={btnS('primary')} onClick={addStaff} disabled={saving}>{saving ? 'Adding…' : 'Add Staff'}</button></>}>
          {err && <ErrorMsg msg={err} />}
          <Field label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
          <Field label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} required />
          <Field label="Password" type="password" value={form.password} onChange={v => setForm({ ...form, password: v })} required />
        </Modal>
      )}
      <div style={{ ...card, overflow: 'hidden' }}>
<div className="table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}><table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>          <thead><tr>{['Name', 'Email', 'Status', 'Joined', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
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
        </table></div>
      </div>
    </div>
  );
}

function OwnerEarnings() {
  const { profile } = useAuth();
  const { data: payments, loading } = usePayments(profile?.zone_id);
  const { data: revenue } = useRevenueByMonth(profile?.zone_id);
  const { data: sessions } = useSessions(profile?.zone_id);
  const { data: games } = useGames(profile?.zone_id);
  const [period, setPeriod] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  const now = new Date();
  const filterPayments = (payments || []).filter(p => {
    if (period === 'today') return new Date(p.created_at).toDateString() === now.toDateString();
    if (period === 'week') return new Date(p.created_at) >= new Date(now - 7 * 86400000);
    if (period === 'month') return new Date(p.created_at).getMonth() === now.getMonth() && new Date(p.created_at).getFullYear() === now.getFullYear();
    return true;
  });

  const total = filterPayments.reduce((s, p) => s + Number(p.amount), 0);
  const totalSessions = (sessions || []).length;
  const activeSessions = (sessions || []).filter(s => s.status === 'active').length;
  const avgSession = filterPayments.length ? (total / filterPayments.length).toFixed(2) : 0;

  const byMethod = filterPayments.reduce((acc, p) => { acc[p.method] = (acc[p.method] || 0) + Number(p.amount); return acc; }, {});
  const byGame = filterPayments.reduce((acc, p) => {
    const name = p.sessions?.games?.game_name || 'Unknown';
    acc[name] = (acc[name] || 0) + Number(p.amount);
    return acc;
  }, {});

  const chartData = (revenue || []).slice(0, 6).reverse().map(r => ({ label: new Date(r.month).toLocaleString('default', { month: 'short' }), value: Number(r.revenue) }));

  const methodIcons = { cash: '💵', card: '💳', mobile: '📱' };
  const methodColors = { cash: C.green, card: C.accent, mobile: C.purple };

  if (loading) return <Spinner />;

  const tabs = ['overview', 'payments', 'games'];

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>💰 Earnings & Reports</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Track your zone revenue, sessions and payment breakdown.</div>

      {/* Period Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {[['all', 'All Time'], ['today', 'Today'], ['week', 'This Week'], ['month', 'This Month']].map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v)} style={{ ...btnS(period === v ? 'primary' : 'outline', true), borderRadius: 20 }}>{l}</button>
        ))}
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 22 }}>
        <div style={{ ...card, padding: 18, borderLeft: `3px solid ${C.green}` }}>
          <div style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Total Revenue</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>{fmt$(total)}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{filterPayments.length} payments</div>
        </div>
        <div style={{ ...card, padding: 18, borderLeft: `3px solid ${C.accent}` }}>
          <div style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Avg Per Payment</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.accent }}>{fmt$(avgSession)}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>per transaction</div>
        </div>
        <div style={{ ...card, padding: 18, borderLeft: `3px solid ${C.purple}` }}>
          <div style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Total Sessions</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.purple }}>{totalSessions}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{activeSessions} active now</div>
        </div>
        <div style={{ ...card, padding: 18, borderLeft: `3px solid ${C.yellow}` }}>
          <div style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Payment Methods</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: C.yellow }}>{Object.keys(byMethod).length || 0}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>methods used</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ background: 'none', border: 'none', color: activeTab === t ? C.accent : C.muted, fontWeight: activeTab === t ? 700 : 400, fontSize: 13, cursor: 'pointer', padding: '8px 16px', borderBottom: activeTab === t ? `2px solid ${C.accent}` : '2px solid transparent', textTransform: 'capitalize', transition: 'all 0.15s' }}>{t}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ ...card, padding: 20, marginBottom: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 14 }}>📈 Monthly Revenue</div>
            <MiniChart data={chartData} />
          </div>
          <div style={{ ...card, padding: 20, marginBottom: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 14 }}>💳 Revenue by Payment Method</div>
            {Object.entries(byMethod).length === 0 && <div style={{ color: C.dim, fontSize: 13 }}>No payments yet.</div>}
            {Object.entries(byMethod).map(([method, amount]) => {
              const pct = total ? Math.round((amount / total) * 100) : 0;
              return (
                <div key={method} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13 }}>{methodIcons[method] || '💰'} {method}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: methodColors[method] || C.green }}>{fmt$(amount)} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: C.border, borderRadius: 3 }}>
                    <div style={{ height: 6, width: `${pct}%`, background: methodColors[method] || C.green, borderRadius: 3, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 14 }}>🕹️ Revenue by Game</div>
            {Object.entries(byGame).length === 0 && <div style={{ color: C.dim, fontSize: 13 }}>No data yet.</div>}
            {Object.entries(byGame).sort((a, b) => b[1] - a[1]).map(([game, amount]) => {
              const pct = total ? Math.round((amount / total) * 100) : 0;
              return (
                <div key={game} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13 }}>{game}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{fmt$(amount)} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: C.border, borderRadius: 3 }}>
                    <div style={{ height: 6, width: `${pct}%`, background: C.accent, borderRadius: 3, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div className="table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 500, borderCollapse: 'collapse' }}>
              <thead><tr>{['Player', 'Amount', 'Method', 'Date'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {filterPayments.slice(0, 50).map(p => (
                  <tr key={p.id}>
                    <td style={td}>{p.players?.name || '—'}</td>
                    <td style={{ ...td, color: C.green, fontWeight: 700 }}>{fmt$(p.amount)}</td>
                    <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${methodColors[p.method] || C.green}18`, color: methodColors[p.method] || C.green }}>{methodIcons[p.method] || '💰'} {p.method}</span></td>
                    <td style={{ ...td, color: C.muted }}>{fmtDate(p.created_at)} {fmtTime(p.created_at)}</td>
                  </tr>
                ))}
                {!filterPayments.length && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>No payments found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Games Tab */}
      {activeTab === 'games' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, fontWeight: 700 }}>🕹️ Games Performance</div>
          <div className="table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 500, borderCollapse: 'collapse' }}>
              <thead><tr>{['Game', 'Type', 'Price', 'Devices', 'Revenue'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {(games || []).map(g => (
                  <tr key={g.id}>
                    <td style={{ ...td, fontWeight: 600 }}>{g.game_name}</td>
                    <td style={td}><span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: g.game_type === 'Jotoni' ? `${C.purple}20` : `${C.accent}20`, color: g.game_type === 'Jotoni' ? C.purple : C.accent }}>{g.game_type}</span></td>
                    <td style={{ ...td, color: C.green }}>{fmt$(g.price)}</td>
                    <td style={td}>{g.devices}</td>
                    <td style={{ ...td, color: C.green, fontWeight: 700 }}>{fmt$(byGame[g.game_name] || 0)}</td>
                  </tr>
                ))}
                {!games?.length && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.dim, padding: 30 }}>No games found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


function OwnerGames() {
  const { profile } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ game_name: '', devices: '1', game_type: 'Normal', price: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const loadGames = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('games').select('*').eq('business_id', profile?.zone_id).order('created_at', { ascending: false });
      if (error) throw error;
      setGames(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (profile?.zone_id) loadGames(); }, [profile?.zone_id]);

  const openNew = () => { setForm({ game_name: '', devices: '1', game_type: 'Normal', price: '' }); setErr(''); setModal('new'); };
  const openEdit = (g) => { setForm({ game_name: g.game_name, devices: String(g.devices), game_type: g.game_type, price: String(g.price) }); setErr(''); setModal(g.id); };

  const save = async () => {
    if (!form.game_name || !form.price) { setErr('Game name and price are required.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = { game_name: form.game_name, devices: Number(form.devices), game_type: form.game_type, price: Number(form.price), business_id: profile?.zone_id };
      if (modal === 'new') {
        await supabase.from('games').insert(payload);
      } else {
        await supabase.from('games').update(payload).eq('id', modal);
      }
      await loadGames();
      setModal(null);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm('Delete this game?')) return;
    await supabase.from('games').delete().eq('id', id);
    loadGames();
  };

  const jotoniPrices = [{ value: '5', label: '$5' }, { value: '10', label: '$10' }, { value: '15', label: '$15' }, { value: '20', label: '$20' }];
  const gameTypeColor = { Normal: C.accent, Jotoni: C.purple };

  if (loading) return <Spinner />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Game Management</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>Manage games available in your zone.</div>
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'flex-end' }}>
        <button style={btnS('primary')} onClick={openNew}>+ Add Game</button>
      </div>
      {games.length === 0 && (
        <div style={{ ...card, padding: 40, textAlign: 'center', color: C.dim }}>
          No games yet. Click "Add Game" to get started!
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {games.map(g => (
          <div key={g.id} style={{ ...card, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: gameTypeColor[g.game_type] || C.accent }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{g.game_name}</div>
              <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, color: gameTypeColor[g.game_type] || C.accent, background: `${gameTypeColor[g.game_type] || C.accent}20` }}>{g.game_type}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: C.muted }}>Devices</span>
                <span style={{ fontWeight: 700 }}>{g.devices}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: C.muted }}>Price</span>
                <span style={{ fontWeight: 800, color: C.green, fontSize: 16 }}>${g.price}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...btnS('outline', true), flex: 1 }} onClick={() => openEdit(g)}>✏ Edit</button>
              <button style={{ ...btnS('danger', true), flex: 1 }} onClick={() => del(g.id)}>🗑 Delete</button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <Modal title={modal === 'new' ? 'Add New Game' : 'Edit Game'} onClose={() => setModal(null)}
          footer={<><button style={btnS('outline')} onClick={() => setModal(null)}>Cancel</button><button style={btnS('primary')} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Game'}</button></>}>
          {err && <ErrorMsg msg={err} />}
          <Field label="Game Name" value={form.game_name} onChange={v => setForm({ ...form, game_name: v })} placeholder="e.g. FIFA 25" required />
          <Field label="Number of Devices" type="number" value={form.devices} onChange={v => setForm({ ...form, devices: v })} placeholder="e.g. 4" required />
          <Field label="Game Type" value={form.game_type} onChange={v => setForm({ ...form, game_type: v, price: '' })} options={[{ value: 'Normal', label: 'Normal' }, { value: 'Jotoni', label: 'Jotoni' }]} />
          {form.game_type === 'Jotoni' ? (
            <Field label="Price" value={form.price} onChange={v => setForm({ ...form, price: v })} options={jotoniPrices} />
          ) : (
            <Field label="Price ($)" type="number" value={form.price} onChange={v => setForm({ ...form, price: v })} placeholder="Enter price manually" required />
          )}
        </Modal>
      )}
    </div>
  );
}



function OwnerSubscription() {
  const { profile } = useAuth();
  const { data: sub, loading, refetch } = useActiveSubscription(profile?.zone_id);
  const { data: plans } = useSubscriptionPlans();
  const [upgradeModal, setUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const [msg, setMsg] = useState('');

  if (loading) return <Spinner />;
  const currentPlan = sub?.subscription_plans || plans?.find(p => p.name === 'Basic');

  const requestUpgrade = async () => {
    if (!selectedPlan) return;
    setUpgrading(true);
    try {
      const { error: subError } = await supabase.from('subscriptions').upsert({
        zone_id: profile?.zone_id,
        plan_id: selectedPlan.id,
        owner_id: profile?.id,
        status: 'pending',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'zone_id' });
      if (subError) throw new Error('Subscription save failed: ' + subError.message);
      const { data: zoneInfo } = await supabase.from('game_zones').select('name').eq('id', profile?.zone_id).single();
      const { data: superadmin } = await supabase.from('profiles').select('id').eq('role', 'superadmin').single();
      await supabase.from('notifications').insert({
        title: 'Subscription Upgrade Request',
        message: `Zone "${zoneInfo?.name}" has requested an upgrade to ${selectedPlan.name} plan. Please review and activate.`,
        type: 'info',
        sent_by: profile?.id,
        target_zone_id: profile?.zone_id,
        target_user_id: superadmin?.id || null,
      });
      setMsg(`Upgrade to ${selectedPlan.name} requested! Admin will activate it shortly.`);
      setUpgradeModal(false);
      refetch();
    } catch(e) { setMsg('Error: ' + e.message); }
    finally { setUpgrading(false); }
  };

  const planColor = { Basic: C.muted, Pro: C.accent, Premium: C.purple };

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 22 }}>Subscription</div>
      {msg && <SuccessMsg msg={msg} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div style={{ ...card, padding: 24, border: `2px solid ${C.accent}` }}>
          <div style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Current Plan</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.accent, marginBottom: 4 }}>{currentPlan?.name || '—'}</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 14 }}>${currentPlan?.price_monthly || 0}<span style={{ fontSize: 13, color: C.muted }}>/mo</span></div>
          {(typeof currentPlan?.features === 'string' ? JSON.parse(currentPlan.features) : currentPlan?.features || []).map(f => (
            <div key={f} style={{ display: 'flex', gap: 7, marginBottom: 8, fontSize: 13, color: C.muted }}><span style={{ color: C.green }}>✓</span>{f}</div>
          ))}
          <button style={{ ...btnS('primary'), width: '100%', marginTop: 16 }} onClick={() => setUpgradeModal(true)}>⬆ Upgrade Plan</button>
        </div>
        <div style={{ ...card, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Billing Details</div>
          {[
            ['Status', sub ? badge(sub.status) : badge('pending')],
            ['Started', fmtDate(sub?.started_at)],
            ['Expires', fmtDate(sub?.expires_at)],
            ['Max Stations', currentPlan?.max_stations === 999 ? 'Unlimited' : currentPlan?.max_stations || '—'],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, borderBottom: `1px solid ${C.border}20`, paddingBottom: 14 }}>
              <span style={{ color: C.muted, fontSize: 13 }}>{label}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* All Plans */}
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Available Plans</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {(plans || []).map(p => (
          <div key={p.id} style={{ ...card, padding: 20, border: `2px solid ${p.id === currentPlan?.id ? C.accent : C.border}`, opacity: p.id === currentPlan?.id ? 0.7 : 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: planColor[p.name] || C.muted, marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>${p.price_monthly}<span style={{ fontSize: 12, color: C.muted }}>/mo</span></div>
            {(typeof p.features === 'string' ? JSON.parse(p.features) : p.features || []).map(f => (
              <div key={f} style={{ display: 'flex', gap: 6, marginBottom: 6, fontSize: 12, color: C.muted }}><span style={{ color: C.green }}>✓</span>{f}</div>
            ))}
            <button style={{ ...btnS(p.id === currentPlan?.id ? 'outline' : 'primary'), width: '100%', marginTop: 14 }}
              disabled={p.id === currentPlan?.id}
              onClick={() => { setSelectedPlan(p); setUpgradeModal(true); }}>
              {p.id === currentPlan?.id ? '✓ Current Plan' : `Upgrade to ${p.name}`}
            </button>
          </div>
        ))}
      </div>

      {upgradeModal && selectedPlan && (
        <Modal title="Confirm Upgrade" onClose={() => setUpgradeModal(false)}
          footer={<><button style={btnS('outline')} onClick={() => setUpgradeModal(false)}>Cancel</button><button style={btnS('primary')} onClick={requestUpgrade} disabled={upgrading}>{upgrading ? 'Requesting…' : 'Request Upgrade'}</button></>}>
          <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>Upgrading to</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: planColor[selectedPlan.name] || C.accent }}>{selectedPlan.name}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>${selectedPlan.price_monthly}<span style={{ fontSize: 12, color: C.muted }}>/mo</span></div>
            <div style={{ fontSize: 13, color: C.muted }}>Your request will be sent to the admin for approval.</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── STAFF PAGES ─────────────────────────────────────────────
function StaffOverview() {
  const { profile } = useAuth();
  const { data: sessions } = useSessions(profile?.zone_id);
  const { data: zone } = useZone(profile?.zone_id);
  const active = (sessions || []).filter(s => s.status === 'active').length;
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Staff Dashboard</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>Welcome back, <strong>{profile?.name}</strong> — {zone?.name || '—'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <StatCard label="Active Sessions" value={active} color={C.accent} />
        <StatCard label="Total Sessions Today" value={sessions?.length || 0} color={C.green} />
        <StatCard label="Zone" value={zone?.name || '—'} color={C.purple} />
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
      // Check if player already exists in this zone
      if (form.phone) {
        const { data: existing } = await supabase.from('players').select('id, name').eq('zone_id', profile.zone_id).eq('phone', form.phone).single();
        if (existing) { setErr(`Player "${existing.name}" is already registered with this phone number in your zone.`); setSaving(false); return; }
      }
      if (form.email) {
        const { data: existing } = await supabase.from('players').select('id, name').eq('zone_id', profile.zone_id).eq('email', form.email).single();
        if (existing) { setErr(`Player "${existing.name}" is already registered with this email in your zone.`); setSaving(false); return; }
      }
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
  const [games, setGames] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState({ customer_name: '', game_id: '', device_number: '1', session_mode: 'Per Game' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [timers, setTimers] = useState({});

  const loadGames = async () => {
    const { data } = await supabase.from('games').select('*').eq('business_id', profile?.zone_id);
    setGames(data || []);
  };

  const loadSessions = async () => {
    const { data } = await supabase.from('sessions').select('*, games(game_name, price, devices, game_type)').eq('business_id', profile?.zone_id).eq('status', 'active').order('created_at', { ascending: false });
    setSessions(data || []);
  };

  useEffect(() => {
    if (profile?.zone_id) { loadGames(); loadSessions(); }
    const interval = setInterval(() => setTimers(t => ({ ...t, tick: Date.now() })), 1000);
    return () => clearInterval(interval);
  }, [profile?.zone_id]);

  const selectedGame = games.find(g => g.id === form.game_id);
  const deviceOptions = selectedGame ? Array.from({ length: selectedGame.devices }, (_, i) => ({ value: String(i + 1), label: `Device ${i + 1}` })) : [{ value: '1', label: 'Device 1' }];

  const startSession = async () => {
    if (!form.customer_name || !form.game_id) { setErr('Customer name and game are required.'); return; }
    setSaving(true); setErr('');
    try {
      await supabase.from('sessions').insert({
        business_id: profile?.zone_id,
        game_id: form.game_id,
        customer_name: form.customer_name,
        device_number: Number(form.device_number),
        session_mode: form.session_mode,
        total_games: 0,
        total_amount: 0,
        status: 'active',
        start_time: new Date().toISOString(),
      });
      setForm({ customer_name: '', game_id: '', device_number: '1', session_mode: 'Per Game' });
      await loadSessions();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

 const [addGameModal, setAddGameModal] = useState(null);
  const [addGameForm, setAddGameForm] = useState({ game_id: '', device_number: '1', games_count: '1' });

  const selectedAddGame = games.find(g => g.id === addGameForm.game_id);
  const addDeviceOptions = selectedAddGame ? Array.from({ length: selectedAddGame.devices }, (_, i) => ({ value: String(i + 1), label: `Device ${i + 1}` })) : [{ value: '1', label: 'Device 1' }];

  const addGame = async (session) => {
    if (!addGameForm.game_id) { alert('Please select a game.'); return; }
    const add = Number(addGameForm.games_count) || 1;
    const gamePrice = Number(selectedAddGame?.price || 0);
    const newGames = session.total_games + add;
    const newAmount = Number(session.total_amount) + (add * gamePrice);
    await supabase.from('sessions').update({ total_games: newGames, total_amount: newAmount }).eq('id', session.id);
    setAddGameModal(null);
    setAddGameForm({ game_id: '', device_number: '1', games_count: '1' });
    loadSessions();
  };

 const [finishModal, setFinishModal] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const finishSession = async () => {
    const session = finishModal;
    try {
      await supabase.from('sessions').update({ status: 'finished', end_time: new Date().toISOString() }).eq('id', session.id);
      // Look up player by name in this zone (case insensitive)
      const { data: playerData } = await supabase.from('players').select('id').eq('zone_id', profile?.zone_id).ilike('name', session.customer_name.trim()).maybeSingle();
      // Fetch latest session data to get accurate total
      const { data: latestSession } = await supabase.from('sessions').select('total_amount').eq('id', session.id).single();
      const { error } = await supabase.from('payments').insert({
        zone_id: profile?.zone_id,
        session_id: session.id,
        player_id: playerData?.id || null,
        amount: latestSession?.total_amount || session.total_amount,
        method: paymentMethod,
        processed_by: profile?.id,
        created_at: new Date().toISOString(),
      });
      if (error) console.error('Payment insert error:', error);
      setFinishModal(null);
      loadSessions();
    } catch(e) { console.error('Finish session error:', e); }
  };

  const getElapsed = (startTime) => {
    const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  };

 const [playerSearch, setPlayerSearch] = useState('');
  const [playerSuggestions, setPlayerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchPlayers = async (query) => {
    setPlayerSearch(query);
    setForm({ ...form, customer_name: query });
    if (query.length < 2) { setPlayerSuggestions([]); setShowSuggestions(false); return; }
    const { data } = await supabase.from('players').select('id, name, phone').eq('zone_id', profile?.zone_id).ilike('name', `%${query}%`).limit(5);
    setPlayerSuggestions(data || []);
    setShowSuggestions(true);
  };

  const selectPlayer = (player) => {
    setForm({ ...form, customer_name: player.name });
    setPlayerSearch(player.name);
    setPlayerSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Game Sessions</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 22 }}>Start and manage active game sessions.</div>

      {/* Start New Session Form */}
      <div style={{ ...card, padding: 22, marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: C.accent }}>▶ Start New Session</div>
        {err && <ErrorMsg msg={err} />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Customer Name *</label>
            <input value={playerSearch} onChange={e => searchPlayers(e.target.value)} placeholder="Search registered player…" style={inp} autoComplete="off" />
            {showSuggestions && playerSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', marginTop: 4 }}>
                {playerSuggestions.map(p => (
                  <div key={p.id} onClick={() => selectPlayer(p)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${C.border}20`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.accent}15`}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    {p.phone && <span style={{ fontSize: 11, color: C.muted }}>{p.phone}</span>}
                  </div>
                ))}
              </div>
            )}
            {showSuggestions && playerSuggestions.length === 0 && playerSearch.length >= 2 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, zIndex: 100, padding: '10px 14px', color: C.dim, fontSize: 13, marginTop: 4 }}>
                No players found. <span style={{ color: C.accent, cursor: 'pointer' }} onClick={() => { setForm({ ...form, customer_name: playerSearch }); setShowSuggestions(false); }}>Use "{playerSearch}" anyway</span>
              </div>
            )}
          </div>
          <Field label="Select Game" value={form.game_id} onChange={v => setForm({ ...form, game_id: v, device_number: '1' })}
            options={[{ value: '', label: '— Select game —' }, ...games.map(g => ({ value: g.id, label: `${g.game_name} ($${g.price})` }))]} />
          <Field label="Device Number" value={form.device_number} onChange={v => setForm({ ...form, device_number: v })} options={deviceOptions} />
          <Field label="Session Mode" value={form.session_mode} onChange={v => setForm({ ...form, session_mode: v })}
            options={[{ value: 'Per Game', label: 'Per Game' }, { value: 'Time Based', label: 'Time Based' }]} />
        </div>
        {selectedGame && (
          <div style={{ marginTop: 8, padding: '10px 14px', background: `${C.accent}10`, borderRadius: 8, fontSize: 13, color: C.accent }}>
            💡 <strong>{selectedGame.game_name}</strong> — {selectedGame.game_type} — Price: <strong>${selectedGame.price}</strong> per game
          </div>
        )}
        <button style={{ ...btnS('primary'), marginTop: 16, padding: '11px 28px' }} onClick={startSession} disabled={saving}>
          {saving ? 'Starting…' : '▶ Start Session'}
        </button>
      </div>

      {/* Active Sessions */}
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
        Active Sessions <span style={{ fontSize: 13, color: C.green, fontWeight: 400 }}>({sessions.length} active)</span>
      </div>

      {sessions.length === 0 && (
        <div style={{ ...card, padding: 40, textAlign: 'center', color: C.dim }}>
          No active sessions. Start a new session above!
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {sessions.map(s => (
          <div key={s.id} style={{ ...card, padding: 20, border: `1px solid ${C.accent}40`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.accent}, ${C.purple})` }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{s.customer_name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{s.games?.game_name} · Device {s.device_number}</div>
              </div>
              <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: C.green, background: `${C.green}20` }}>● ACTIVE</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={{ ...card, padding: '10px 12px', background: C.surface }}>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>GAMES PLAYED</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{s.total_games}</div>
              </div>
              <div style={{ ...card, padding: '10px 12px', background: C.surface }}>
                <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>TOTAL AMOUNT</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.green }}>${s.total_amount}</div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
              <span>⏱ {getElapsed(s.start_time)}</span>
              <span>Price: ${s.games?.price}/game</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...btnS('primary', true), flex: 1, padding: '9px 0' }} onClick={() => { setAddGameModal(s); setGamesToAdd('1'); }}>+ Add Game</button>
              <button style={{ ...btnS('danger', true), flex: 1, padding: '9px 0' }} onClick={() => { setFinishModal(s); setPaymentMethod('cash'); }}>🏁 Finish</button>
            </div>
          </div>
        ))}
      </div>
    {finishModal && (
        <Modal title="Complete Payment" onClose={() => setFinishModal(null)}
          footer={<><button style={btnS('outline')} onClick={() => setFinishModal(null)}>Cancel</button><button style={btnS('success')} onClick={finishSession}>✅ Confirm Payment</button></>}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>Customer</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{finishModal.customer_name}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{finishModal.games?.game_name} · Device {finishModal.device_number}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            <div style={{ ...card, padding: '12px', textAlign: 'center', background: C.surface }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>GAMES PLAYED</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.accent }}>{finishModal.total_games}</div>
            </div>
            <div style={{ ...card, padding: '12px', textAlign: 'center', background: C.surface }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>PRICE/GAME</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.purple }}>${finishModal.games?.price}</div>
            </div>
            <div style={{ ...card, padding: '12px', textAlign: 'center', background: C.surface }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>TOTAL</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.green }}>${finishModal.total_amount}</div>
            </div>
          </div>
          <Field label="Payment Method" value={paymentMethod} onChange={setPaymentMethod}
            options={[{ value: 'cash', label: '💵 Cash' }, { value: 'card', label: '💳 Card' }, { value: 'mobile', label: '📱 Mobile Payment' }]} />
          <div style={{ padding: '12px 16px', background: `${C.green}12`, border: `1px solid ${C.green}30`, borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: C.muted }}>Amount to Collect</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: C.green }}>${finishModal.total_amount}</div>
          </div>
        </Modal>
      )}

      {addGameModal && (
        <Modal title={`Add Games — ${addGameModal.customer_name}`} onClose={() => setAddGameModal(null)}
          footer={<><button style={btnS('outline')} onClick={() => setAddGameModal(null)}>Cancel</button><button style={btnS('primary')} onClick={() => addGame(addGameModal)}>Add Games</button></>}>
          <div style={{ marginBottom: 14, padding: '10px 14px', background: `${C.accent}10`, borderRadius: 8, fontSize: 13 }}>
            <div>Customer: <strong>{addGameModal.customer_name}</strong></div>
            <div>Games played so far: <strong style={{ color: C.accent }}>{addGameModal.total_games}</strong></div>
            <div>Total so far: <strong style={{ color: C.green }}>${addGameModal.total_amount}</strong></div>
          </div>
          <Field label="Select Game" value={addGameForm.game_id} onChange={v => setAddGameForm({ ...addGameForm, game_id: v, device_number: '1' })}
            options={[{ value: '', label: '— Select game —' }, ...games.map(g => ({ value: g.id, label: `${g.game_name} ($${g.price})` }))]} />
          <Field label="Select Device" value={addGameForm.device_number} onChange={v => setAddGameForm({ ...addGameForm, device_number: v })} options={addDeviceOptions} />
          <Field label="Number of Games" type="number" value={addGameForm.games_count} onChange={v => setAddGameForm({ ...addGameForm, games_count: v })} placeholder="e.g. 3" />
          {selectedAddGame && (
            <div style={{ padding: '10px 14px', background: `${C.green}10`, borderRadius: 8, fontSize: 13, color: C.green }}>
              Adding: <strong>{addGameForm.games_count} games</strong> × <strong>${selectedAddGame.price}</strong> = <strong>${Number(addGameForm.games_count || 0) * Number(selectedAddGame.price)}</strong>
              <br />New total: <strong>${Number(addGameModal.total_amount) + (Number(addGameForm.games_count || 0) * Number(selectedAddGame.price))}</strong>
            </div>
          )}
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
<div className="table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}><table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>          <thead><tr>{['Player', 'Amount', 'Method', 'Date & Time'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
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
        </table></div>
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
  const ownerPages = { overview: OwnerOverview, games: OwnerGames, staff: OwnerStaff, players: () => <PlayersList zoneId={zoneId} />, sessions: StaffSessions, earnings: OwnerEarnings, subscription: OwnerSubscription, notifications: () => <NotificationsPage zoneId={zoneId} /> };
  const staffPages = { overview: StaffOverview, register: StaffRegisterPlayer, sessions: StaffSessions, payments: StaffPayments };

  const pages = role === 'superadmin' || role === 'admin' ? saPages : role === 'owner' ? ownerPages : staffPages;  const Comp = pages[page] || pages['overview'];
  return Comp ? <Comp /> : null;
}

function PlayersList({ zoneId }) {
  const { data: players, loading } = usePlayers(zoneId);
  if (loading) return <Spinner />;
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 22 }}>Players</div>
      <div style={{ ...card, overflow: 'hidden' }}>
<div className="table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}><table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>          <thead><tr>{['Name', 'Email', 'Sessions', 'Spent', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
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
        </table></div>
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
