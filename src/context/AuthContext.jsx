// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, signIn, signOut as supabaseSignOut } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Supabase auth user
  const [profile, setProfile] = useState(null); // profiles table row
  const [loading, setLoading] = useState(true);

  // ─── Load session on mount ────────────────────────────────
  useEffect(() => {
    let mounted = true;

   // Hard timeout — never stuck longer than 6 seconds
    const hardTimeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 6000);

   async function loadSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          setUser(session.user);
          // Set loading false immediately, fetch profile in background
          clearTimeout(hardTimeout);
          if (mounted) setLoading(false);
          fetchProfile(session.user.id, mounted);
        } else {
          clearTimeout(hardTimeout);
          if (mounted) setLoading(false);
        }
      } catch (err) {
        console.error('Session load error:', err);
        clearTimeout(hardTimeout);
        if (mounted) setLoading(false);
      }
    }

    loadSession();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          await fetchProfile(session.user.id, mounted);
          if (mounted) setLoading(false);
        }

        if (event === 'INITIAL_SESSION') {
          if (mounted) setLoading(false);
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          if (mounted) setLoading(false);
        }

        if (event === 'TOKEN_REFRESHED' && session) {
          setUser(session.user);
        }

        if (event === 'PASSWORD_RECOVERY') {
          // Handled in the ResetPassword page
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(hardTimeout);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId, mounted = true) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (mounted) setProfile(data || null);
      return data || null;
    } catch (err) {
      console.error('Profile fetch error:', err);
      if (mounted) setProfile(null);
      return null;
    }
  }

  // ─── Login ────────────────────────────────────────────────
  async function login(email, password) {
    const result = await signIn(email, password);
    setUser(result.user);
    setProfile(result.profile);
    return result;
  }

  // ─── Logout ───────────────────────────────────────────────
  async function logout() {
    await supabaseSignOut();
    setUser(null);
    setProfile(null);
  }

  // ─── Refresh profile (call after updates) ─────────────────
  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  const value = {
    user,
    profile,
    loading,
    login,
    logout,
    refreshProfile,
    isAuthenticated: !!user && !!profile,
    isSuperAdmin: profile?.role === 'superadmin',
    isOwner: profile?.role === 'owner',
    isStaff: profile?.role === 'staff',
    zoneId: profile?.zone_id,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// ─── Route guard HOC ─────────────────────────────────────────
export function RequireAuth({ children, allowedRoles }) {
  const { isAuthenticated, profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0e1a', color: '#00d4ff', fontSize: 16 }}>
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login — works with React Router
    window.location.href = '/login';
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    window.location.href = '/unauthorized';
    return null;
  }

  return children;
}
