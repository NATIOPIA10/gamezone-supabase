import { useState, useEffect, createContext, useContext } from "react";

// ─── COLOR SYSTEM ─────────────────────────────────────────────────────────────
const COLORS = {
  bg: "#0a0e1a",
  surface: "#0f1628",
  card: "#141d35",
  border: "#1e2d50",
  accent: "#00d4ff",
  accentDim: "#00a8cc",
  green: "#00e676",
  red: "#ff4444",
  yellow: "#ffd740",
  purple: "#b388ff",
  text: "#e8eaf6",
  textMuted: "#7986cb",
  textDim: "#4a5568",
};

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────
const MOCK_USERS = {
  "super@gamezone.com": { password: "admin123", role: "superadmin", name: "Alex Rivera", status: "active", id: "u1" },
  "owner@gamezone.com": { password: "owner123", role: "owner", name: "Jordan Kim", status: "active", id: "u2", zoneId: "z1" },
  "staff@gamezone.com": { password: "staff123", role: "staff", name: "Sam Chen", status: "active", id: "u3", zoneId: "z1" },
  "suspended@gamezone.com": { password: "test123", role: "owner", name: "Blocked User", status: "suspended", id: "u4" },
};

const INITIAL_ZONES = [
  { id: "z1", name: "NeonArena Downtown", location: "New York, NY", owner: "Jordan Kim", ownerId: "u2", status: "active", stations: 24, players: 312, revenue: 18450, plan: "Pro", createdAt: "2024-01-15" },
  { id: "z2", name: "PixelVault East Side", location: "Brooklyn, NY", owner: "Maria Lopez", ownerId: "u5", status: "active", stations: 18, players: 245, revenue: 14200, plan: "Basic", createdAt: "2024-02-20" },
  { id: "z3", name: "GridLock Gaming Hub", location: "Los Angeles, CA", owner: "Chris Park", ownerId: "u6", status: "inactive", stations: 32, players: 0, revenue: 0, plan: "Premium", createdAt: "2024-03-10" },
  { id: "z4", name: "LevelUp Arena", location: "Chicago, IL", owner: "Pending Owner", ownerId: null, status: "active", stations: 20, players: 189, revenue: 11300, plan: "Basic", createdAt: "2024-04-05" },
];

const INITIAL_OWNERS = [
  { id: "u2", name: "Jordan Kim", email: "owner@gamezone.com", zone: "NeonArena Downtown", zoneId: "z1", status: "active", plan: "Pro", revenue: 18450, joinDate: "2024-01-15" },
  { id: "u5", name: "Maria Lopez", email: "maria@gamezone.com", zone: "PixelVault East Side", zoneId: "z2", status: "active", plan: "Basic", revenue: 14200, joinDate: "2024-02-20" },
  { id: "u6", name: "Chris Park", email: "chris@gamezone.com", zone: "GridLock Gaming Hub", zoneId: "z3", status: "suspended", plan: "Premium", revenue: 0, joinDate: "2024-03-10" },
  { id: "u7", name: "Taylor Reed", email: "taylor@gamezone.com", zone: "—", zoneId: null, status: "pending", plan: "—", revenue: 0, joinDate: "2024-04-22" },
];

const INITIAL_PLAYERS = [
  { id: "p1", name: "Ethan Blaze", email: "ethan@mail.com", zone: "NeonArena Downtown", sessions: 47, totalSpent: 320, lastSeen: "2025-03-10", status: "active" },
  { id: "p2", name: "Luna Storm", email: "luna@mail.com", zone: "PixelVault East Side", sessions: 32, totalSpent: 215, lastSeen: "2025-03-09", status: "active" },
  { id: "p3", name: "Neon Cobra", email: "cobra@mail.com", zone: "NeonArena Downtown", sessions: 89, totalSpent: 640, lastSeen: "2025-03-11", status: "active" },
  { id: "p4", name: "Vex Thunder", email: "vex@mail.com", zone: "GridLock Gaming Hub", sessions: 12, totalSpent: 80, lastSeen: "2025-01-20", status: "inactive" },
  { id: "p5", name: "Aria Shadow", email: "aria@mail.com", zone: "NeonArena Downtown", sessions: 55, totalSpent: 440, lastSeen: "2025-03-08", status: "active" },
  { id: "p6", name: "Rex Void", email: "rex@mail.com", zone: "LevelUp Arena", sessions: 28, totalSpent: 190, lastSeen: "2025-03-07", status: "active" },
];

const PLANS = [
  { id: "basic", name: "Basic", price: 99, cycle: "Monthly", stations: 10, features: ["Player tracking", "Basic reports", "Email support"], color: COLORS.textMuted },
  { id: "pro", name: "Pro", price: 249, cycle: "Monthly", stations: 25, features: ["Advanced analytics", "Multi-staff accounts", "Priority support", "Custom branding"], color: COLORS.accent },
  { id: "premium", name: "Premium", price: 499, cycle: "Monthly", stations: 999, features: ["Unlimited stations", "API access", "Dedicated account manager", "White-label option", "Advanced security"], color: COLORS.purple },
];

const REVENUE_DATA = [
  { month: "Oct", revenue: 28400, players: 820 },
  { month: "Nov", revenue: 34200, players: 960 },
  { month: "Dec", revenue: 41800, players: 1140 },
  { month: "Jan", revenue: 38600, players: 1050 },
  { month: "Feb", revenue: 44100, players: 1230 },
  { month: "Mar", revenue: 51200, players: 1420 },
];

const NOTIFICATIONS = [
  { id: "n1", title: "System Maintenance Tonight", message: "Scheduled maintenance at 2AM EST. Expected downtime: 30 minutes.", time: "2h ago", read: false, type: "warning" },
  { id: "n2", title: "New Owner Registration", message: "Taylor Reed has registered and awaits zone assignment.", time: "5h ago", read: false, type: "info" },
  { id: "n3", title: "Revenue Milestone Reached", message: "NeonArena Downtown has reached $18,000 monthly revenue.", time: "1d ago", read: true, type: "success" },
  { id: "n4", title: "GridLock Gaming Hub Suspended", message: "Zone deactivated due to subscription lapse.", time: "2d ago", read: true, type: "error" },
];

// ─── AUTH CONTEXT ──────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  app: {
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: COLORS.bg,
    color: COLORS.text,
    minHeight: "100vh",
    fontSize: 14,
  },
  // AUTH
  authWrap: {
    minHeight: "100vh",
    background: `radial-gradient(ellipse at 20% 50%, #0d1f3c 0%, ${COLORS.bg} 60%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  authCard: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 20,
    padding: "48px 40px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
  },
  authLogo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
    justifyContent: "center",
  },
  authLogoIcon: {
    width: 44,
    height: 44,
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
  },
  authTitle: { fontSize: 28, fontWeight: 700, color: COLORS.text, textAlign: "center", marginBottom: 6 },
  authSub: { color: COLORS.textMuted, textAlign: "center", marginBottom: 32, fontSize: 14 },
  label: { display: "block", color: COLORS.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  input: {
    width: "100%",
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "12px 14px",
    color: COLORS.text,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  formGroup: { marginBottom: 20 },
  btnPrimary: {
    width: "100%",
    padding: "14px",
    background: `linear-gradient(135deg, ${COLORS.accent}, #0099bb)`,
    border: "none",
    borderRadius: 10,
    color: "#000",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    marginTop: 8,
    letterSpacing: 0.5,
  },
  authLink: { color: COLORS.accent, cursor: "pointer", textDecoration: "underline", fontSize: 13 },
  authFooter: { textAlign: "center", marginTop: 24, color: COLORS.textMuted, fontSize: 13 },
  errorBox: {
    background: "rgba(255,68,68,0.12)",
    border: `1px solid ${COLORS.red}44`,
    borderRadius: 10,
    padding: "12px 14px",
    color: COLORS.red,
    fontSize: 13,
    marginBottom: 20,
  },
  // LAYOUT
  layout: { display: "flex", minHeight: "100vh" },
  sidebar: {
    width: 240,
    background: COLORS.surface,
    borderRight: `1px solid ${COLORS.border}`,
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    top: 0, left: 0, bottom: 0,
    zIndex: 100,
    overflowY: "auto",
  },
  sidebarLogo: {
    padding: "20px 20px 16px",
    borderBottom: `1px solid ${COLORS.border}`,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  sidebarLogoIcon: {
    width: 36,
    height: 36,
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
  },
  sidebarLogoText: { fontWeight: 700, fontSize: 15, lineHeight: 1.2 },
  sidebarLogoSub: { fontSize: 10, color: COLORS.textMuted, fontWeight: 400 },
  navSection: { padding: "16px 12px 8px" },
  navLabel: { fontSize: 10, color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, padding: "0 8px", marginBottom: 6 },
  navItem: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    marginBottom: 2,
    background: active ? `${COLORS.accent}18` : "transparent",
    color: active ? COLORS.accent : COLORS.textMuted,
    fontWeight: active ? 600 : 400,
    fontSize: 13.5,
    transition: "all 0.15s",
    border: active ? `1px solid ${COLORS.accent}30` : "1px solid transparent",
  }),
  navIcon: { fontSize: 16, width: 20, textAlign: "center" },
  mainContent: { marginLeft: 240, flex: 1, minHeight: "100vh" },
  topbar: {
    background: COLORS.surface,
    borderBottom: `1px solid ${COLORS.border}`,
    padding: "16px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  topbarTitle: { fontSize: 20, fontWeight: 700 },
  topbarRight: { display: "flex", alignItems: "center", gap: 16 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.purple})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 14,
    color: "#000",
    cursor: "pointer",
    flexShrink: 0,
  },
  pageContent: { padding: "28px" },
  // CARDS
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 28 },
  statCard: (accent) => ({
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    padding: "20px 22px",
    position: "relative",
    overflow: "hidden",
  }),
  statCardAccent: (color) => ({
    position: "absolute",
    top: 0, left: 0, right: 0,
    height: 3,
    background: color,
    borderRadius: "14px 14px 0 0",
  }),
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  statValue: { fontSize: 30, fontWeight: 800, lineHeight: 1, marginBottom: 4 },
  statChange: (up) => ({ fontSize: 12, color: up ? COLORS.green : COLORS.red, fontWeight: 600 }),
  // TABLE
  tableWrap: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    overflow: "hidden",
  },
  tableHeader: {
    padding: "16px 20px",
    borderBottom: `1px solid ${COLORS.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tableTitle: { fontSize: 16, fontWeight: 700 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 11,
    color: COLORS.textDim,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: `1px solid ${COLORS.border}`,
    background: COLORS.surface,
  },
  td: {
    padding: "14px 16px",
    borderBottom: `1px solid ${COLORS.border}20`,
    fontSize: 13.5,
    color: COLORS.text,
    verticalAlign: "middle",
  },
  // BADGES
  badge: (color, bg) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "4px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    color,
    background: bg,
    textTransform: "capitalize",
  }),
  // BUTTONS
  btn: (variant = "primary", size = "md") => ({
    padding: size === "sm" ? "6px 12px" : "10px 18px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: size === "sm" ? 12 : 13,
    ...(variant === "primary" ? { background: COLORS.accent, color: "#000" } :
        variant === "danger" ? { background: `${COLORS.red}20`, color: COLORS.red, border: `1px solid ${COLORS.red}40` } :
        variant === "ghost" ? { background: "transparent", color: COLORS.textMuted, border: `1px solid ${COLORS.border}` } :
        variant === "success" ? { background: `${COLORS.green}20`, color: COLORS.green, border: `1px solid ${COLORS.green}40` } :
        { background: `${COLORS.accent}20`, color: COLORS.accent, border: `1px solid ${COLORS.accent}40` }),
    transition: "all 0.15s",
  }),
  btnGroup: { display: "flex", gap: 6 },
  // CHART
  chartBar: (pct, color) => ({
    height: "100%",
    width: `${pct}%`,
    background: color,
    borderRadius: "4px 4px 0 0",
    transition: "width 0.5s",
    position: "relative",
  }),
  // MODAL
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.75)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    width: "100%",
    maxWidth: 520,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
  },
  modalHeader: {
    padding: "20px 24px 16px",
    borderBottom: `1px solid ${COLORS.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 17, fontWeight: 700 },
  modalBody: { padding: "20px 24px" },
  modalFooter: {
    padding: "16px 24px",
    borderTop: `1px solid ${COLORS.border}`,
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  // MISC
  sectionTitle: { fontSize: 18, fontWeight: 700, marginBottom: 6 },
  sectionSub: { color: COLORS.textMuted, fontSize: 13, marginBottom: 24 },
  searchInput: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "8px 14px",
    color: COLORS.text,
    fontSize: 13,
    outline: "none",
    width: 220,
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  sidebarUser: {
    padding: "14px 16px",
    borderTop: `1px solid ${COLORS.border}`,
    marginTop: "auto",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  rolePill: (role) => ({
    display: "inline-flex",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    ...(role === "superadmin" ? { background: `${COLORS.purple}25`, color: COLORS.purple } :
        role === "owner" ? { background: `${COLORS.accent}20`, color: COLORS.accent } :
        { background: `${COLORS.green}20`, color: COLORS.green }),
  }),
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const statusBadge = (status) => {
  const map = {
    active: [COLORS.green, `${COLORS.green}18`],
    inactive: [COLORS.textDim, `${COLORS.textDim}18`],
    suspended: [COLORS.red, `${COLORS.red}18`],
    pending: [COLORS.yellow, `${COLORS.yellow}18`],
  };
  const [color, bg] = map[status] || [COLORS.textMuted, `${COLORS.textMuted}18`];
  return <span style={S.badge(color, bg)}>● {status}</span>;
};

const planBadge = (plan) => {
  const map = { Basic: COLORS.textMuted, Pro: COLORS.accent, Premium: COLORS.purple };
  const c = map[plan] || COLORS.textMuted;
  return <span style={S.badge(c, `${c}20`)}>{plan}</span>;
};

const fmt$ = (n) => "$" + Number(n).toLocaleString();
const initials = (name) => name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2) || "?";

// ─── MINI CHART ───────────────────────────────────────────────────────────────
function BarChart({ data, valueKey, color, height = 120 }) {
  const max = Math.max(...data.map(d => d[valueKey]));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, padding: "0 4px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
            <div style={{
              width: "100%",
              height: `${(d[valueKey] / max) * 100}%`,
              background: `linear-gradient(180deg, ${color}, ${color}88)`,
              borderRadius: "4px 4px 0 0",
              minHeight: 4,
              transition: "height 0.5s",
            }} title={`${d.month}: ${d[valueKey]}`} />
          </div>
          <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 4 }}>{d.month}</div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, valueKey, color }) {
  const max = Math.max(...data.map(d => d[valueKey]));
  const min = Math.min(...data.map(d => d[valueKey]));
  const range = max - min || 1;
  const w = 300, h = 80;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (w - 20) + 10;
    const y = h - ((d[valueKey] - min) / range) * (h - 20) - 10;
    return `${x},${y}`;
  });
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => {
        const [x, y] = p.split(",");
        return <circle key={i} cx={x} cy={y} r="3.5" fill={color} stroke={COLORS.card} strokeWidth="2" />;
      })}
    </svg>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, footer }) {
  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: COLORS.textMuted, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <div style={S.modalBody}>{children}</div>
        {footer && <div style={S.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}

function FormField({ label, type = "text", value, onChange, options }) {
  return (
    <div style={S.formGroup}>
      <label style={S.label}>{label}</label>
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...S.input, appearance: "none" }}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} style={S.input} />
      )}
    </div>
  );
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("login"); // login | register | reset

  const handleLogin = async () => {
    setError(""); setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const user = MOCK_USERS[email.trim().toLowerCase()];
    if (!user || user.password !== pass) {
      setError("Invalid email or password."); setLoading(false); return;
    }
    if (user.status === "suspended") {
      setError("Your account is currently suspended. Please contact the administrator."); setLoading(false); return;
    }
    onLogin({ ...user, email });
    setLoading(false);
  };

  const handleReset = async () => {
    if (!email) { setError("Enter your email address."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setError("");
    setLoading(false);
    alert(`Password reset email sent to ${email} (demo mode)`);
    setView("login");
  };

  const handleRegister = async () => {
    if (!email || !pass) { setError("Fill in all fields."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    alert("Registration submitted! An admin will review your account. (demo mode)");
    setView("login");
  };

  const hints = [
    { role: "Super Admin", email: "super@gamezone.com", pass: "admin123" },
    { role: "Owner", email: "owner@gamezone.com", pass: "owner123" },
    { role: "Staff", email: "staff@gamezone.com", pass: "staff123" },
  ];

  return (
    <div style={S.authWrap}>
      <div>
        <div style={S.authCard}>
          <div style={S.authLogo}>
            <div style={S.authLogoIcon}>🎮</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>GameZone</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted }}>Management System</div>
            </div>
          </div>

          {view === "login" && <>
            <div style={S.authTitle}>Welcome Back</div>
            <div style={S.authSub}>Sign in to your account</div>
            {error && <div style={S.errorBox}>⚠ {error}</div>}
            <FormField label="Email Address" type="email" value={email} onChange={setEmail} />
            <FormField label="Password" type="password" value={pass} onChange={setPass} />
            <div style={{ textAlign: "right", marginTop: -12, marginBottom: 20 }}>
              <span style={S.authLink} onClick={() => { setError(""); setView("reset"); }}>Forgot password?</span>
            </div>
            <button style={S.btnPrimary} onClick={handleLogin} disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
            <div style={S.authFooter}>
              Don't have an account? <span style={S.authLink} onClick={() => { setError(""); setView("register"); }}>Register</span>
            </div>
          </>}

          {view === "reset" && <>
            <div style={S.authTitle}>Reset Password</div>
            <div style={S.authSub}>Enter your email to receive a reset link</div>
            {error && <div style={S.errorBox}>⚠ {error}</div>}
            <FormField label="Email Address" type="email" value={email} onChange={setEmail} />
            <button style={S.btnPrimary} onClick={handleReset} disabled={loading}>{loading ? "Sending…" : "Send Reset Link"}</button>
            <div style={S.authFooter}><span style={S.authLink} onClick={() => { setError(""); setView("login"); }}>← Back to login</span></div>
          </>}

          {view === "register" && <>
            <div style={S.authTitle}>Create Account</div>
            <div style={S.authSub}>Register as a new zone owner</div>
            {error && <div style={S.errorBox}>⚠ {error}</div>}
            <FormField label="Full Name" value="" onChange={() => {}} />
            <FormField label="Email Address" type="email" value={email} onChange={setEmail} />
            <FormField label="Password" type="password" value={pass} onChange={setPass} />
            <button style={S.btnPrimary} onClick={handleRegister} disabled={loading}>{loading ? "Submitting…" : "Create Account"}</button>
            <div style={S.authFooter}>Already have an account? <span style={S.authLink} onClick={() => { setError(""); setView("login"); }}>Sign in</span></div>
          </>}
        </div>

        {view === "login" && (
          <div style={{ marginTop: 20, background: `${COLORS.card}`, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Demo Accounts</div>
            {hints.map(h => (
              <div key={h.role} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}
                onClick={() => { setEmail(h.email); setPass(h.pass); }}
              >
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{h.role}</span>
                <button style={{ ...S.btn("ghost", "sm"), fontSize: 11 }}>Use →</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LAYOUT WRAPPER ───────────────────────────────────────────────────────────
function Layout({ user, page, setPage, onLogout, children }) {
  const navItems = {
    superadmin: [
      { key: "overview", icon: "⬛", label: "Dashboard" },
      { key: "zones", icon: "🏢", label: "Game Zones" },
      { key: "owners", icon: "👑", label: "Owners" },
      { key: "players", icon: "🎮", label: "Players" },
      { key: "subscriptions", icon: "💳", label: "Subscriptions" },
      { key: "reports", icon: "📊", label: "Reports & Analytics" },
      { key: "notifications", icon: "🔔", label: "Notifications" },
      { key: "admins", icon: "🛡️", label: "Admin Management" },
      { key: "settings", icon: "⚙️", label: "System Settings" },
    ],
    owner: [
      { key: "overview", icon: "⬛", label: "Dashboard" },
      { key: "staff", icon: "👥", label: "My Staff" },
      { key: "players", icon: "🎮", label: "Players" },
      { key: "sessions", icon: "⏱️", label: "Sessions" },
      { key: "earnings", icon: "💰", label: "Earnings" },
      { key: "subscription", icon: "💳", label: "Subscription" },
    ],
    staff: [
      { key: "overview", icon: "⬛", label: "Dashboard" },
      { key: "register", icon: "➕", label: "Register Player" },
      { key: "sessions", icon: "⏱️", label: "Active Sessions" },
      { key: "payments", icon: "💵", label: "Payments" },
    ],
  };

  const items = navItems[user.role] || [];
  const unreadNoti = NOTIFICATIONS.filter(n => !n.read).length;

  return (
    <div style={S.layout}>
      <div style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <div style={S.sidebarLogoIcon}>🎮</div>
          <div>
            <div style={S.sidebarLogoText}>GameZone</div>
            <div style={S.sidebarLogoSub}>Management System</div>
          </div>
        </div>
        <div style={S.navSection}>
          <div style={S.navLabel}>Navigation</div>
          {items.map(it => (
            <div key={it.key} style={S.navItem(page === it.key)} onClick={() => setPage(it.key)}>
              <span style={S.navIcon}>{it.icon}</span>
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.key === "notifications" && unreadNoti > 0 && (
                <span style={{ background: COLORS.red, color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 6px", fontWeight: 700 }}>{unreadNoti}</span>
              )}
            </div>
          ))}
        </div>
        <div style={S.sidebarUser}>
          <div style={{ ...S.avatar, width: 32, height: 32, fontSize: 12, flexShrink: 0 }}>{initials(user.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div style={S.rolePill(user.role)}>{user.role}</div>
          </div>
          <button onClick={onLogout} style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 16 }} title="Logout">⏏</button>
        </div>
      </div>
      <div style={S.mainContent}>
        <div style={S.topbar}>
          <div style={S.topbarTitle}>{items.find(i => i.key === page)?.label || "Dashboard"}</div>
          <div style={S.topbarRight}>
            <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setPage("notifications")}>
              <span style={{ fontSize: 20 }}>🔔</span>
              {unreadNoti > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: COLORS.red, color: "#fff", borderRadius: "50%", width: 14, height: 14, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{unreadNoti}</span>}
            </div>
            <div style={S.avatar}>{initials(user.name)}</div>
          </div>
        </div>
        <div style={S.pageContent}>{children}</div>
      </div>
    </div>
  );
}

// ─── SUPER ADMIN PAGES ────────────────────────────────────────────────────────
function SAOverview() {
  const stats = [
    { label: "Total Revenue", value: fmt$(44100), change: "+16.2%", up: true, color: COLORS.accent },
    { label: "Active Zones", value: "3", change: "+1 this month", up: true, color: COLORS.green },
    { label: "Active Players", value: "746", change: "+8.4%", up: true, color: COLORS.purple },
    { label: "Subscriptions", value: "4", change: "1 expiring soon", up: false, color: COLORS.yellow },
  ];

  return (
    <div>
      <div style={S.sectionTitle}>Super Admin Dashboard</div>
      <div style={{ ...S.sectionSub, marginBottom: 24 }}>Welcome back, Alex. Here's what's happening across all zones.</div>

      <div style={S.statsGrid}>
        {stats.map(s => (
          <div key={s.label} style={S.statCard(s.color)}>
            <div style={S.statCardAccent(s.color)} />
            <div style={S.statLabel}>{s.label}</div>
            <div style={{ ...S.statValue, color: s.color }}>{s.value}</div>
            <div style={S.statChange(s.up)}>{s.up ? "▲" : "▼"} {s.change}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ ...S.tableWrap, padding: 0 }}>
          <div style={S.tableHeader}>
            <div style={S.tableTitle}>Revenue Overview</div>
            <span style={{ fontSize: 12, color: COLORS.textMuted }}>Last 6 months</span>
          </div>
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.accent }}>{fmt$(51200)}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>March 2025 Revenue</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.green }}>▲ 16.1%</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>vs last month</div>
              </div>
            </div>
            <BarChart data={REVENUE_DATA} valueKey="revenue" color={COLORS.accent} height={120} />
          </div>
        </div>

        <div style={{ ...S.tableWrap, padding: 0 }}>
          <div style={S.tableHeader}><div style={S.tableTitle}>Zone Status</div></div>
          <div style={{ padding: "16px 20px" }}>
            {INITIAL_ZONES.slice(0,4).map(z => (
              <div key={z.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{z.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>{z.location}</div>
                </div>
                {statusBadge(z.status)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...S.tableWrap }}>
        <div style={S.tableHeader}>
          <div style={S.tableTitle}>Recent Activity</div>
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              {["Event", "Zone", "User", "Time", "Status"].map(h => <th key={h} style={S.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {[
              { event: "New player registered", zone: "NeonArena Downtown", user: "Staff Sam", time: "5 min ago", status: "active" },
              { event: "Payment received", zone: "PixelVault East Side", user: "Staff Mike", time: "22 min ago", status: "active" },
              { event: "Session started", zone: "NeonArena Downtown", user: "Neon Cobra", time: "1h ago", status: "active" },
              { event: "Owner registered", zone: "—", user: "Taylor Reed", time: "5h ago", status: "pending" },
              { event: "Zone deactivated", zone: "GridLock Gaming Hub", user: "Admin", time: "2d ago", status: "inactive" },
            ].map((r, i) => (
              <tr key={i}>
                <td style={S.td}>{r.event}</td>
                <td style={S.td}><span style={{ color: COLORS.textMuted }}>{r.zone}</span></td>
                <td style={S.td}>{r.user}</td>
                <td style={{ ...S.td, color: COLORS.textMuted }}>{r.time}</td>
                <td style={S.td}>{statusBadge(r.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SAZones() {
  const [zones, setZones] = useState(INITIAL_ZONES);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", location: "", owner: "", status: "active", plan: "Basic", stations: "10" });

  const filtered = zones.filter(z => z.name.toLowerCase().includes(search.toLowerCase()) || z.location.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setForm({ name: "", location: "", owner: "", status: "active", plan: "Basic", stations: "10" }); setModal("new"); };
  const openEdit = (z) => { setForm({ name: z.name, location: z.location, owner: z.owner, status: z.status, plan: z.plan, stations: String(z.stations) }); setModal(z.id); };

  const save = () => {
    if (modal === "new") {
      setZones([...zones, { id: "z" + Date.now(), ...form, stations: Number(form.stations), players: 0, revenue: 0, createdAt: new Date().toISOString().slice(0,10) }]);
    } else {
      setZones(zones.map(z => z.id === modal ? { ...z, ...form, stations: Number(form.stations) } : z));
    }
    setModal(null);
  };

  const toggle = (id) => setZones(zones.map(z => z.id === id ? { ...z, status: z.status === "active" ? "inactive" : "active" } : z));
  const del = (id) => { if (confirm("Delete this zone?")) setZones(zones.filter(z => z.id !== id)); };

  return (
    <div>
      <div style={S.sectionTitle}>Game Zones</div>
      <div style={S.sectionSub}>Manage all gaming center locations</div>
      <div style={S.tableWrap}>
        <div style={S.tableHeader}>
          <input style={S.searchInput} placeholder="🔍 Search zones…" value={search} onChange={e => setSearch(e.target.value)} />
          <button style={S.btn("primary")} onClick={openNew}>+ Add Zone</button>
        </div>
        <table style={S.table}>
          <thead><tr>{["Zone", "Location", "Owner", "Stations", "Players", "Revenue", "Plan", "Status", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(z => (
              <tr key={z.id}>
                <td style={S.td}><div style={{ fontWeight: 600 }}>{z.name}</div></td>
                <td style={{ ...S.td, color: COLORS.textMuted }}>{z.location}</td>
                <td style={S.td}>{z.owner}</td>
                <td style={S.td}>{z.stations}</td>
                <td style={S.td}>{z.players}</td>
                <td style={{ ...S.td, color: COLORS.accent, fontWeight: 700 }}>{fmt$(z.revenue)}</td>
                <td style={S.td}>{planBadge(z.plan)}</td>
                <td style={S.td}>{statusBadge(z.status)}</td>
                <td style={S.td}>
                  <div style={S.btnGroup}>
                    <button style={S.btn("outline", "sm")} onClick={() => openEdit(z)}>Edit</button>
                    <button style={S.btn(z.status === "active" ? "danger" : "success", "sm")} onClick={() => toggle(z.id)}>{z.status === "active" ? "Deactivate" : "Activate"}</button>
                    <button style={S.btn("danger", "sm")} onClick={() => del(z.id)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === "new" ? "Add New Zone" : "Edit Zone"} onClose={() => setModal(null)}
          footer={<><button style={S.btn("ghost")} onClick={() => setModal(null)}>Cancel</button><button style={S.btn("primary")} onClick={save}>Save Zone</button></>}
        >
          <div style={S.grid2}>
            <FormField label="Zone Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
            <FormField label="Location" value={form.location} onChange={v => setForm({ ...form, location: v })} />
          </div>
          <div style={S.grid2}>
            <FormField label="Owner Name" value={form.owner} onChange={v => setForm({ ...form, owner: v })} />
            <FormField label="Max Stations" type="number" value={form.stations} onChange={v => setForm({ ...form, stations: v })} />
          </div>
          <div style={S.grid2}>
            <FormField label="Status" value={form.status} onChange={v => setForm({ ...form, status: v })} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
            <FormField label="Subscription Plan" value={form.plan} onChange={v => setForm({ ...form, plan: v })} options={[{ value: "Basic", label: "Basic" }, { value: "Pro", label: "Pro" }, { value: "Premium", label: "Premium" }]} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function SAOwners() {
  const [owners, setOwners] = useState(INITIAL_OWNERS);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", status: "active" });

  const filtered = owners.filter(o => o.name.toLowerCase().includes(search.toLowerCase()) || o.email.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (o) => { setForm({ name: o.name, email: o.email, status: o.status }); setModal(o.id); };
  const save = () => { setOwners(owners.map(o => o.id === modal ? { ...o, ...form } : o)); setModal(null); };
  const toggleStatus = (id) => setOwners(owners.map(o => o.id === id ? { ...o, status: o.status === "active" ? "suspended" : "active" } : o));
  const del = (id) => { if (confirm("Delete this owner?")) setOwners(owners.filter(o => o.id !== id)); };

  return (
    <div>
      <div style={S.sectionTitle}>Owners</div>
      <div style={S.sectionSub}>Manage all zone owners and their access</div>
      <div style={S.tableWrap}>
        <div style={S.tableHeader}>
          <input style={S.searchInput} placeholder="🔍 Search owners…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <table style={S.table}>
          <thead><tr>{["Owner", "Email", "Zone", "Plan", "Revenue", "Status", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td style={S.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ ...S.avatar, width: 30, height: 30, fontSize: 11, flexShrink: 0 }}>{initials(o.name)}</div>
                    <span style={{ fontWeight: 600 }}>{o.name}</span>
                  </div>
                </td>
                <td style={{ ...S.td, color: COLORS.textMuted }}>{o.email}</td>
                <td style={S.td}>{o.zone || "—"}</td>
                <td style={S.td}>{planBadge(o.plan)}</td>
                <td style={{ ...S.td, color: COLORS.accent, fontWeight: 700 }}>{fmt$(o.revenue)}</td>
                <td style={S.td}>{statusBadge(o.status)}</td>
                <td style={S.td}>
                  <div style={S.btnGroup}>
                    <button style={S.btn("outline", "sm")} onClick={() => openEdit(o)}>Edit</button>
                    <button style={S.btn(o.status === "active" ? "danger" : "success", "sm")} onClick={() => toggleStatus(o.id)}>{o.status === "active" ? "Suspend" : "Activate"}</button>
                    <button style={S.btn("danger", "sm")} onClick={() => del(o.id)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Edit Owner" onClose={() => setModal(null)}
          footer={<><button style={S.btn("ghost")} onClick={() => setModal(null)}>Cancel</button><button style={S.btn("primary")} onClick={save}>Save Changes</button></>}
        >
          <FormField label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <FormField label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
          <FormField label="Status" value={form.status} onChange={v => setForm({ ...form, status: v })} options={[{ value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }, { value: "pending", label: "Pending" }]} />
        </Modal>
      )}
    </div>
  );
}

function SAPlayers() {
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [search, setSearch] = useState("");
  const filtered = players.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <div style={S.sectionTitle}>Players</div>
      <div style={S.sectionSub}>All registered players across all zones</div>
      <div style={S.tableWrap}>
        <div style={S.tableHeader}>
          <input style={S.searchInput} placeholder="🔍 Search players…" value={search} onChange={e => setSearch(e.target.value)} />
          <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{filtered.length} players</span>
        </div>
        <table style={S.table}>
          <thead><tr>{["Player", "Email", "Zone", "Sessions", "Total Spent", "Last Seen", "Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td style={S.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ ...S.avatar, width: 28, height: 28, fontSize: 11, flexShrink: 0, background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.accent})` }}>{initials(p.name)}</div>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                  </div>
                </td>
                <td style={{ ...S.td, color: COLORS.textMuted }}>{p.email}</td>
                <td style={S.td}>{p.zone}</td>
                <td style={{ ...S.td, fontWeight: 700 }}>{p.sessions}</td>
                <td style={{ ...S.td, color: COLORS.accent, fontWeight: 700 }}>{fmt$(p.totalSpent)}</td>
                <td style={{ ...S.td, color: COLORS.textMuted }}>{p.lastSeen}</td>
                <td style={S.td}>{statusBadge(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SASubscriptions() {
  return (
    <div>
      <div style={S.sectionTitle}>Subscription Plans</div>
      <div style={S.sectionSub}>Manage pricing plans for zone owners</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
        {PLANS.map(plan => (
          <div key={plan.id} style={{ ...S.tableWrap, padding: 0, border: plan.id === "pro" ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}` }}>
            {plan.id === "pro" && <div style={{ background: COLORS.accent, textAlign: "center", padding: "6px", fontSize: 11, fontWeight: 700, color: "#000", letterSpacing: 1 }}>MOST POPULAR</div>}
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 11, color: COLORS.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Plan</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: plan.color, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: COLORS.text, marginBottom: 4 }}>${plan.price}<span style={{ fontSize: 14, fontWeight: 400, color: COLORS.textMuted }}>/mo</span></div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 20 }}>Up to {plan.stations === 999 ? "Unlimited" : plan.stations} stations</div>
              <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13, color: COLORS.textMuted }}>
                    <span style={{ color: COLORS.green }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button style={{ ...S.btn(plan.id === "pro" ? "primary" : "outline"), width: "100%", marginTop: 16 }}>Edit Plan</button>
            </div>
          </div>
        ))}
      </div>

      <div style={S.tableWrap}>
        <div style={S.tableHeader}><div style={S.tableTitle}>Active Subscriptions</div></div>
        <table style={S.table}>
          <thead><tr>{["Owner", "Zone", "Plan", "Price", "Status", "Next Billing"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {INITIAL_OWNERS.filter(o => o.plan !== "—").map(o => (
              <tr key={o.id}>
                <td style={S.td}>{o.name}</td>
                <td style={{ ...S.td, color: COLORS.textMuted }}>{o.zone}</td>
                <td style={S.td}>{planBadge(o.plan)}</td>
                <td style={{ ...S.td, color: COLORS.accent, fontWeight: 700 }}>{fmt$(PLANS.find(p => p.name === o.plan)?.price || 0)}/mo</td>
                <td style={S.td}>{statusBadge(o.status === "suspended" ? "suspended" : "active")}</td>
                <td style={{ ...S.td, color: COLORS.textMuted }}>Apr 1, 2025</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SAReports() {
  return (
    <div>
      <div style={S.sectionTitle}>Reports & Analytics</div>
      <div style={S.sectionSub}>Platform-wide performance and financial analytics</div>

      <div style={S.statsGrid}>
        {[
          { label: "Total Revenue (MTD)", value: fmt$(51200), color: COLORS.accent },
          { label: "Monthly Growth", value: "+16.1%", color: COLORS.green },
          { label: "Active Players", value: "1,420", color: COLORS.purple },
          { label: "Avg Revenue / Zone", value: fmt$(12800), color: COLORS.yellow },
        ].map(s => (
          <div key={s.label} style={S.statCard(s.color)}>
            <div style={S.statCardAccent(s.color)} />
            <div style={S.statLabel}>{s.label}</div>
            <div style={{ ...S.statValue, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div style={{ ...S.tableWrap, padding: 0 }}>
          <div style={S.tableHeader}><div style={S.tableTitle}>Revenue Growth</div></div>
          <div style={{ padding: "20px 24px" }}>
            <BarChart data={REVENUE_DATA} valueKey="revenue" color={COLORS.accent} height={130} />
          </div>
        </div>
        <div style={{ ...S.tableWrap, padding: 0 }}>
          <div style={S.tableHeader}><div style={S.tableTitle}>Player Activity</div></div>
          <div style={{ padding: "20px 24px" }}>
            <BarChart data={REVENUE_DATA} valueKey="players" color={COLORS.purple} height={130} />
          </div>
        </div>
      </div>

      <div style={S.tableWrap}>
        <div style={S.tableHeader}><div style={S.tableTitle}>Zone Performance</div></div>
        <table style={S.table}>
          <thead><tr>{["Zone", "Revenue", "Players", "Sessions", "Avg/Player", "Growth"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {INITIAL_ZONES.map(z => (
              <tr key={z.id}>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{z.name}</span></td>
                <td style={{ ...S.td, color: COLORS.accent, fontWeight: 700 }}>{fmt$(z.revenue)}</td>
                <td style={S.td}>{z.players}</td>
                <td style={S.td}>{z.players * 3}</td>
                <td style={S.td}>{z.players ? fmt$(Math.round(z.revenue / z.players)) : "—"}</td>
                <td style={S.td}><span style={{ color: z.status === "active" ? COLORS.green : COLORS.red, fontWeight: 700 }}>{z.status === "active" ? "▲ 12%" : "▼ 0%"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SANotifications() {
  const [notes, setNotes] = useState(NOTIFICATIONS);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", target: "all" });

  const send = () => {
    setNotes([{ id: "n" + Date.now(), ...form, time: "just now", read: false, type: "info" }, ...notes]);
    setModal(false);
    setForm({ title: "", message: "", target: "all" });
  };

  const markRead = (id) => setNotes(notes.map(n => n.id === id ? { ...n, read: true } : n));
  const delNote = (id) => setNotes(notes.filter(n => n.id !== id));

  const typeIcon = { info: "ℹ️", warning: "⚠️", success: "✅", error: "❌" };
  const typeColor = { info: COLORS.accent, warning: COLORS.yellow, success: COLORS.green, error: COLORS.red };

  return (
    <div>
      <div style={S.sectionTitle}>Notifications</div>
      <div style={S.sectionSub}>Send and manage platform announcements</div>

      <div style={{ marginBottom: 20, display: "flex", justifyContent: "flex-end" }}>
        <button style={S.btn("primary")} onClick={() => setModal(true)}>+ Send Announcement</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {notes.map(n => (
          <div key={n.id} style={{
            ...S.tableWrap,
            padding: "16px 20px",
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            borderLeft: `3px solid ${typeColor[n.type]}`,
            opacity: n.read ? 0.65 : 1,
          }}>
            <span style={{ fontSize: 22 }}>{typeIcon[n.type]}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{n.title}</div>
              <div style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 8 }}>{n.message}</div>
              <div style={{ fontSize: 11, color: COLORS.textDim }}>{n.time}</div>
            </div>
            <div style={S.btnGroup}>
              {!n.read && <button style={S.btn("outline", "sm")} onClick={() => markRead(n.id)}>Mark Read</button>}
              <button style={S.btn("danger", "sm")} onClick={() => delNote(n.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <Modal title="Send Announcement" onClose={() => setModal(false)}
          footer={<><button style={S.btn("ghost")} onClick={() => setModal(false)}>Cancel</button><button style={S.btn("primary")} onClick={send}>Send</button></>}
        >
          <FormField label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} />
          <div style={S.formGroup}>
            <label style={S.label}>Message</label>
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
              style={{ ...S.input, height: 100, resize: "vertical" }} />
          </div>
          <FormField label="Send To" value={form.target} onChange={v => setForm({ ...form, target: v })}
            options={[{ value: "all", label: "All Owners" }, { value: "zone", label: "Specific Zone" }, { value: "staff", label: "All Staff" }]} />
        </Modal>
      )}
    </div>
  );
}

function SAAdmins() {
  const [admins, setAdmins] = useState([
    { id: "a1", name: "Alex Rivera", email: "super@gamezone.com", role: "superadmin", status: "active", lastLogin: "2025-03-11" },
    { id: "a2", name: "Dev Admin", email: "dev@gamezone.com", role: "admin", status: "active", lastLogin: "2025-03-08" },
  ]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "admin", status: "active" });

  const openNew = () => { setForm({ name: "", email: "", role: "admin", status: "active" }); setModal("new"); };
  const save = () => {
    if (modal === "new") setAdmins([...admins, { id: "a" + Date.now(), ...form, lastLogin: "Never" }]);
    else setAdmins(admins.map(a => a.id === modal ? { ...a, ...form } : a));
    setModal(null);
  };

  return (
    <div>
      <div style={S.sectionTitle}>Admin Management</div>
      <div style={S.sectionSub}>Manage internal administrators</div>
      <div style={S.tableWrap}>
        <div style={S.tableHeader}>
          <div style={S.tableTitle}>System Administrators</div>
          <button style={S.btn("primary")} onClick={openNew}>+ Add Admin</button>
        </div>
        <table style={S.table}>
          <thead><tr>{["Admin", "Email", "Role", "Status", "Last Login", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id}>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{a.name}</span></td>
                <td style={{ ...S.td, color: COLORS.textMuted }}>{a.email}</td>
                <td style={S.td}><span style={S.rolePill(a.role)}>{a.role}</span></td>
                <td style={S.td}>{statusBadge(a.status)}</td>
                <td style={{ ...S.td, color: COLORS.textMuted }}>{a.lastLogin}</td>
                <td style={S.td}>
                  <div style={S.btnGroup}>
                    <button style={S.btn("outline", "sm")} onClick={() => { setForm({ name: a.name, email: a.email, role: a.role, status: a.status }); setModal(a.id); }}>Edit</button>
                    <button style={S.btn("danger", "sm")} onClick={() => { if(confirm("Delete?")) setAdmins(admins.filter(x => x.id !== a.id)); }}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal === "new" ? "Add Admin" : "Edit Admin"} onClose={() => setModal(null)}
          footer={<><button style={S.btn("ghost")} onClick={() => setModal(null)}>Cancel</button><button style={S.btn("primary")} onClick={save}>Save</button></>}
        >
          <FormField label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <FormField label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
          <div style={S.grid2}>
            <FormField label="Role" value={form.role} onChange={v => setForm({ ...form, role: v })} options={[{ value: "superadmin", label: "Super Admin" }, { value: "admin", label: "Admin" }]} />
            <FormField label="Status" value={form.status} onChange={v => setForm({ ...form, status: v })} options={[{ value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }]} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function SASettings() {
  const [maintenance, setMaintenance] = useState(false);
  const [notif, setNotif] = useState("");

  const exportData = () => {
    const data = JSON.stringify({ zones: INITIAL_ZONES, owners: INITIAL_OWNERS, players: INITIAL_PLAYERS }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "gamezone_backup.json"; a.click();
    setNotif("Backup exported successfully!");
    setTimeout(() => setNotif(""), 3000);
  };

  return (
    <div>
      <div style={S.sectionTitle}>System Settings</div>
      <div style={S.sectionSub}>Platform-wide configuration and management tools</div>
      {notif && <div style={{ ...S.errorBox, background: `${COLORS.green}15`, color: COLORS.green, borderColor: `${COLORS.green}40`, marginBottom: 20 }}>✅ {notif}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {[
          {
            title: "🔧 Maintenance Mode",
            desc: "When enabled, all users except Super Admin will see a maintenance message.",
            action: (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button style={S.btn(maintenance ? "success" : "danger")} onClick={() => setMaintenance(!maintenance)}>
                  {maintenance ? "🔴 Maintenance ON" : "🟢 System Live"}
                </button>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>{maintenance ? "Click to go live" : "Click to enable maintenance"}</span>
              </div>
            ),
          },
          {
            title: "💾 Backup Database",
            desc: "Export all system data as a JSON backup file for safekeeping.",
            action: <button style={S.btn("outline")} onClick={exportData}>⬇ Export Backup</button>,
          },
          {
            title: "🔄 Reset System Data",
            desc: "Clear all recorded sessions, payments, and activity logs. This cannot be undone.",
            action: <button style={S.btn("danger")} onClick={() => confirm("Are you sure? This will clear all data!") && setNotif("Data reset initiated (demo mode)")}>⚠ Reset All Data</button>,
          },
          {
            title: "💳 Subscription Settings",
            desc: "Configure billing cycles and plan features across the platform.",
            action: (
              <div>
                {PLANS.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13 }}>{planBadge(p.name)}</span>
                    <span style={{ fontSize: 13, color: COLORS.accent, fontWeight: 700 }}>${p.price}/mo</span>
                  </div>
                ))}
              </div>
            ),
          },
        ].map(item => (
          <div key={item.title} style={{ ...S.tableWrap, padding: "22px 24px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</div>
            <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 20 }}>{item.desc}</div>
            {item.action}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OWNER DASHBOARD ──────────────────────────────────────────────────────────
function OwnerOverview({ user }) {
  const zone = INITIAL_ZONES.find(z => z.id === user.zoneId) || INITIAL_ZONES[0];
  return (
    <div>
      <div style={S.sectionTitle}>Owner Dashboard</div>
      <div style={S.sectionSub}>Managing: <strong style={{ color: COLORS.accent }}>{zone.name}</strong></div>
      <div style={S.statsGrid}>
        {[
          { label: "Monthly Revenue", value: fmt$(zone.revenue), color: COLORS.accent },
          { label: "Active Players", value: zone.players, color: COLORS.green },
          { label: "Total Stations", value: zone.stations, color: COLORS.purple },
          { label: "Plan", value: zone.plan, color: COLORS.yellow },
        ].map(s => (
          <div key={s.label} style={S.statCard(s.color)}>
            <div style={S.statCardAccent(s.color)} />
            <div style={S.statLabel}>{s.label}</div>
            <div style={{ ...S.statValue, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ ...S.tableWrap, padding: "20px 24px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Revenue Trend</div>
        <BarChart data={REVENUE_DATA} valueKey="revenue" color={COLORS.accent} height={120} />
      </div>
    </div>
  );
}

function OwnerStaff() {
  const [staff, setStaff] = useState([
    { id: "s1", name: "Sam Chen", email: "staff@gamezone.com", role: "Staff", status: "active", sessions: 124 },
    { id: "s2", name: "Jamie Fox", email: "jamie@gamezone.com", role: "Staff", status: "active", sessions: 98 },
  ]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "Staff" });
  return (
    <div>
      <div style={S.sectionTitle}>My Staff</div>
      <div style={S.sectionSub}>Manage staff accounts for your zone</div>
      <div style={S.tableWrap}>
        <div style={S.tableHeader}>
          <div style={S.tableTitle}>Staff Members</div>
          <button style={S.btn("primary")} onClick={() => { setForm({ name: "", email: "", role: "Staff" }); setModal("new"); }}>+ Add Staff</button>
        </div>
        <table style={S.table}>
          <thead><tr>{["Name", "Email", "Role", "Sessions", "Status", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id}>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{s.name}</span></td>
                <td style={{ ...S.td, color: COLORS.textMuted }}>{s.email}</td>
                <td style={S.td}><span style={S.rolePill("staff")}>{s.role}</span></td>
                <td style={S.td}>{s.sessions}</td>
                <td style={S.td}>{statusBadge(s.status)}</td>
                <td style={S.td}>
                  <div style={S.btnGroup}>
                    <button style={S.btn("danger", "sm")} onClick={() => setStaff(staff.map(x => x.id === s.id ? { ...x, status: x.status === "active" ? "suspended" : "active" } : x))}>{s.status === "active" ? "Suspend" : "Activate"}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title="Add Staff" onClose={() => setModal(null)}
          footer={<><button style={S.btn("ghost")} onClick={() => setModal(null)}>Cancel</button><button style={S.btn("primary")} onClick={() => { setStaff([...staff, { id: "s" + Date.now(), ...form, sessions: 0, status: "active" }]); setModal(null); }}>Add</button></>}
        >
          <FormField label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <FormField label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
        </Modal>
      )}
    </div>
  );
}

function OwnerEarnings() {
  return (
    <div>
      <div style={S.sectionTitle}>Earnings</div>
      <div style={S.sectionSub}>Your zone's financial performance</div>
      <div style={S.statsGrid}>
        {[
          { label: "This Month", value: fmt$(18450), color: COLORS.accent },
          { label: "Last Month", value: fmt$(15800), color: COLORS.green },
          { label: "Total Earned", value: fmt$(84200), color: COLORS.purple },
        ].map(s => (
          <div key={s.label} style={S.statCard(s.color)}>
            <div style={S.statCardAccent(s.color)} />
            <div style={S.statLabel}>{s.label}</div>
            <div style={{ ...S.statValue, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ ...S.tableWrap, padding: "20px 24px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Monthly Earnings Chart</div>
        <BarChart data={REVENUE_DATA} valueKey="revenue" color={COLORS.green} height={130} />
      </div>
    </div>
  );
}

function OwnerSubscription() {
  const plan = PLANS.find(p => p.name === "Pro");
  return (
    <div>
      <div style={S.sectionTitle}>Subscription</div>
      <div style={S.sectionSub}>Your current plan and billing info</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ ...S.tableWrap, padding: 24, border: `2px solid ${COLORS.accent}` }}>
          <div style={{ fontSize: 12, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Current Plan</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: COLORS.accent, marginBottom: 4 }}>{plan.name}</div>
          <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>${plan.price}<span style={{ fontSize: 14, fontWeight: 400, color: COLORS.textMuted }}>/mo</span></div>
          {plan.features.map(f => <div key={f} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: COLORS.textMuted }}><span style={{ color: COLORS.green }}>✓</span>{f}</div>)}
        </div>
        <div style={{ ...S.tableWrap, padding: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Billing Details</div>
          {[
            { label: "Next billing", value: "April 1, 2025" },
            { label: "Billing cycle", value: "Monthly" },
            { label: "Stations allowed", value: "25" },
            { label: "Current usage", value: "24 / 25" },
            { label: "Account status", value: statusBadge("active") },
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, borderBottom: `1px solid ${COLORS.border}20`, paddingBottom: 14 }}>
              <span style={{ color: COLORS.textMuted, fontSize: 13 }}>{r.label}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{r.value}</span>
            </div>
          ))}
          <button style={{ ...S.btn("outline"), width: "100%", marginTop: 8 }}>Upgrade Plan</button>
        </div>
      </div>
    </div>
  );
}

// ─── STAFF DASHBOARD ──────────────────────────────────────────────────────────
function StaffOverview() {
  return (
    <div>
      <div style={S.sectionTitle}>Staff Dashboard</div>
      <div style={S.sectionSub}>NeonArena Downtown — Today's Operations</div>
      <div style={S.statsGrid}>
        {[
          { label: "Active Sessions", value: "8", color: COLORS.accent },
          { label: "Players Today", value: "23", color: COLORS.green },
          { label: "Today's Revenue", value: fmt$(340), color: COLORS.yellow },
          { label: "Available Stations", value: "16 / 24", color: COLORS.purple },
        ].map(s => (
          <div key={s.label} style={S.statCard(s.color)}>
            <div style={S.statCardAccent(s.color)} />
            <div style={S.statLabel}>{s.label}</div>
            <div style={{ ...S.statValue, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffRegister() {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [done, setDone] = useState(false);

  const register = () => {
    if (!form.name || !form.email) return;
    setDone(true);
    setTimeout(() => { setDone(false); setForm({ name: "", email: "", phone: "" }); }, 3000);
  };

  return (
    <div>
      <div style={S.sectionTitle}>Register Player</div>
      <div style={S.sectionSub}>Add a new player to the system</div>
      {done && <div style={{ ...S.errorBox, background: `${COLORS.green}15`, color: COLORS.green, borderColor: `${COLORS.green}40`, marginBottom: 20 }}>✅ Player registered successfully!</div>}
      <div style={{ ...S.tableWrap, padding: 28, maxWidth: 480 }}>
        <FormField label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
        <FormField label="Email Address" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
        <FormField label="Phone Number" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
        <button style={{ ...S.btnPrimary, marginTop: 8 }} onClick={register}>Register Player</button>
      </div>
    </div>
  );
}

function StaffSessions() {
  const [sessions, setSessions] = useState([
    { id: "ss1", player: "Neon Cobra", station: 3, startTime: "10:30 AM", duration: "1h 22m", amount: 15, status: "active" },
    { id: "ss2", player: "Aria Shadow", station: 7, startTime: "11:00 AM", duration: "52m", amount: 10, status: "active" },
    { id: "ss3", player: "Ethan Blaze", station: 12, startTime: "09:45 AM", duration: "2h 07m", amount: 25, status: "active" },
    { id: "ss4", player: "Luna Storm", station: 2, startTime: "08:30 AM", duration: "3h 45m", amount: 40, status: "ended" },
  ]);

  const endSession = (id) => setSessions(sessions.map(s => s.id === id ? { ...s, status: "ended" } : s));

  return (
    <div>
      <div style={S.sectionTitle}>Active Sessions</div>
      <div style={S.sectionSub}>Monitor and manage current play sessions</div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr>{["Player", "Station", "Start Time", "Duration", "Amount", "Status", "Action"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id}>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{s.player}</span></td>
                <td style={S.td}>#{s.station}</td>
                <td style={{ ...S.td, color: COLORS.textMuted }}>{s.startTime}</td>
                <td style={S.td}>{s.duration}</td>
                <td style={{ ...S.td, color: COLORS.accent, fontWeight: 700 }}>{fmt$(s.amount)}</td>
                <td style={S.td}>{statusBadge(s.status)}</td>
                <td style={S.td}>
                  {s.status === "active" && <button style={S.btn("danger", "sm")} onClick={() => endSession(s.id)}>End Session</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StaffPayments() {
  return (
    <div>
      <div style={S.sectionTitle}>Payments</div>
      <div style={S.sectionSub}>Recent payment transactions</div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr>{["Player", "Amount", "Method", "Time", "Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {[
              { player: "Neon Cobra", amount: 25, method: "Card", time: "11:55 AM", status: "active" },
              { player: "Aria Shadow", amount: 15, method: "Cash", time: "11:30 AM", status: "active" },
              { player: "Luna Storm", amount: 40, method: "Card", time: "10:15 AM", status: "active" },
              { player: "Rex Void", amount: 20, method: "Cash", time: "09:40 AM", status: "active" },
              { player: "Ethan Blaze", amount: 30, method: "Card", time: "09:00 AM", status: "active" },
            ].map((p, i) => (
              <tr key={i}>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{p.player}</span></td>
                <td style={{ ...S.td, color: COLORS.green, fontWeight: 700 }}>{fmt$(p.amount)}</td>
                <td style={S.td}>{p.method}</td>
                <td style={{ ...S.td, color: COLORS.textMuted }}>{p.time}</td>
                <td style={S.td}>{statusBadge(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SHARED PAGES ─────────────────────────────────────────────────────────────
function SharedPlayers() {
  const [players] = useState(INITIAL_PLAYERS.slice(0, 3));
  return (
    <div>
      <div style={S.sectionTitle}>Players</div>
      <div style={S.sectionSub}>Players registered in your zone</div>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr>{["Player", "Sessions", "Total Spent", "Last Seen", "Status"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id}>
                <td style={S.td}><span style={{ fontWeight: 600 }}>{p.name}</span></td>
                <td style={S.td}>{p.sessions}</td>
                <td style={{ ...S.td, color: COLORS.accent, fontWeight: 700 }}>{fmt$(p.totalSpent)}</td>
                <td style={{ ...S.td, color: COLORS.textMuted }}>{p.lastSeen}</td>
                <td style={S.td}>{statusBadge(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PAGE ROUTER ──────────────────────────────────────────────────────────────
function renderPage(page, user) {
  if (user.role === "superadmin") {
    const pages = { overview: SAOverview, zones: SAZones, owners: SAOwners, players: SAPlayers, subscriptions: SASubscriptions, reports: SAReports, notifications: SANotifications, admins: SAAdmins, settings: SASettings };
    const Comp = pages[page] || SAOverview;
    return <Comp user={user} />;
  }
  if (user.role === "owner") {
    const pages = { overview: () => <OwnerOverview user={user} />, staff: OwnerStaff, players: SharedPlayers, sessions: StaffSessions, earnings: OwnerEarnings, subscription: OwnerSubscription };
    const Comp = pages[page] || (() => <OwnerOverview user={user} />);
    return <Comp user={user} />;
  }
  if (user.role === "staff") {
    const pages = { overview: StaffOverview, register: StaffRegister, sessions: StaffSessions, payments: StaffPayments };
    const Comp = pages[page] || StaffOverview;
    return <Comp user={user} />;
  }
  return <div>Unauthorized</div>;
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function GameZoneApp() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("overview");

  const handleLogin = (userData) => {
    setUser(userData);
    setPage("overview");
  };

  const handleLogout = () => {
    setUser(null);
    setPage("overview");
  };

  return (
    <div style={S.app}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${COLORS.bg}; }
        input:focus, select:focus, textarea:focus { border-color: ${COLORS.accent} !important; }
        tr:hover td { background: ${COLORS.surface}44; }
        button:hover { opacity: 0.88; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
      `}</style>

      {!user ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <Layout user={user} page={page} setPage={setPage} onLogout={handleLogout}>
          {renderPage(page, user)}
        </Layout>
      )}
    </div>
  );
}
