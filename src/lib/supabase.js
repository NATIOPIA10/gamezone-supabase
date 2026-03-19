import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { 
    persistSession: true, 
    autoRefreshToken: true, 
    detectSessionInUrl: true,
    storageKey: 'gamezone-auth',
    storage: window.localStorage,
  },
});

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const { data: profile, error: profileErr } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
  if (profileErr) throw profileErr;
  if (profile.status === 'suspended') { await supabase.auth.signOut(); throw new Error('Your account is currently suspended. Please contact the administrator.'); }
  // Removed pending check - owners auto-activated by trigger
  return { user: data.user, profile };
}

export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role: 'owner', status: 'active' } } });
  if (error) throw error;
  return data;
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

export async function getAllZones() {
  const { data, error } = await supabase.from('game_zones').select('*, profiles!owner_id(name, email)').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getZone(zoneId) {
  const { data, error } = await supabase.from('game_zones').select('*, profiles!owner_id(name, email)').eq('id', zoneId).single();
  if (error) throw error;
  return data;
}

export async function createZone(zoneData) {
  const { data, error } = await supabase.from('game_zones').insert(zoneData).select().single();
  if (error) throw error;
  return data;
}

export async function updateZone(zoneId, updates) {
  const { data, error } = await supabase.from('game_zones').update(updates).eq('id', zoneId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteZone(zoneId) {
  const { error } = await supabase.from('game_zones').delete().eq('id', zoneId);
  if (error) throw error;
}

export async function getAllOwners() {
  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'owner').order('created_at', { ascending: false });
  if (error) {
    console.error('getAllOwners error:', error);
    throw error;
  }
  // Removed debug log
  return data;
}

export async function getStaffByZone(zoneId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('zone_id', zoneId).eq('role', 'staff');
  if (error) throw error;
  return data;
}

export async function getAllUsers() {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getGamesByZone(zoneId) {
  const { data, error } = await supabase.from('games').select('*').eq('zone_id', zoneId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getSessionsByZone(zoneId) {
  const { data, error } = await supabase.from('sessions').select('*, games(game_name, price)').eq('business_id', zoneId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllPlayers(zoneId = null) {
  let query = supabase.from('players').select('*, game_zones(name)').order('created_at', { ascending: false });
  if (zoneId) query = query.eq('zone_id', zoneId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createPlayer(playerData) {
  const { data, error } = await supabase.from('players').insert(playerData).select().single();
  if (error) throw error;
  return data;
}

export async function getActiveSessions(zoneId) {
  const { data, error } = await supabase.from('sessions').select('*, games(game_name, price)').eq('business_id', zoneId).eq('status', 'active').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function startSession(sessionData) {
  const { data, error } = await supabase.from('sessions').insert({ ...sessionData, status: 'active' }).select().single();
  if (error) throw error;
  return data;
}

export async function endSession(sessionId, endedBy, amountCharged) {
  const { data: session } = await supabase.from('sessions').select('started_at').eq('id', sessionId).single();
  const durationMinutes = Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000);
  const { data, error } = await supabase.from('sessions').update({ status: 'ended', ended_at: new Date().toISOString(), ended_by: endedBy, duration_minutes: durationMinutes, amount_charged: amountCharged }).eq('id', sessionId).select().single();
  if (error) throw error;
  return data;
}

export async function createPayment(paymentData) {
  const { data, error } = await supabase.from('payments').insert(paymentData).select().single();
  if (error) throw error;
  return data;
}

export async function getPaymentsByZone(zoneId, limit = 50) {
  let query = supabase.from('payments').select('*, players(name)').order('created_at', { ascending: false }).limit(limit);
  if (zoneId) query = query.eq('zone_id', zoneId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getRevenueByMonth(zoneId = null) {
  let query = supabase.from('monthly_revenue').select('*').order('month', { ascending: false }).limit(12);
  if (zoneId) query = query.eq('zone_id', zoneId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getNotifications(zoneId = null) {
  let query = supabase.from('notifications').select('*, profiles!sent_by(name), notification_reads(user_id)').order('created_at', { ascending: false });
  if (zoneId) query = query.or(`target_zone_id.eq.${zoneId},target_zone_id.is.null`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function sendNotification(notifData) {
  const { data, error } = await supabase.from('notifications').insert(notifData).select().single();
  if (error) throw error;
  return data;
}

export async function markNotificationRead(notificationId, userId) {
  const { error } = await supabase.from('notification_reads').upsert({ notification_id: notificationId, user_id: userId });
  if (error) throw error;
}

export async function getZoneAnalytics(zoneId = null) {
  let query = supabase.from('zone_analytics').select('*');
  if (zoneId) query = query.eq('zone_id', zoneId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getPlatformStats() {
  const [zones, players, subscriptions] = await Promise.all([
    supabase.from('game_zones').select('id, status'),
    supabase.from('players').select('id, status'),
    supabase.from('subscriptions').select('*, subscription_plans(price_monthly)').eq('status', 'active'),
  ]);
  const monthlyRevenue = (subscriptions.data || []).reduce((sum, s) => sum + Number(s.subscription_plans?.price_monthly || 0), 0);
  return {
    totalZones: zones.data?.length || 0,
    activeZones: zones.data?.filter(z => z.status === 'active').length || 0,
    totalPlayers: players.data?.length || 0,
    activePlayers: players.data?.filter(p => p.status === 'active').length || 0,
    monthlyRevenue,
    totalSubscriptions: subscriptions.data?.length || 0,
  };return {
    totalZones: zones.data?.length || 0,
    activeZones: zones.data?.filter(z => z.status === 'active').length || 0,
    totalPlayers: players.data?.length || 0,
    activePlayers: players.data?.filter(p => p.status === 'active').length || 0,
    monthlyRevenue: payments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0,
  };
}

export async function getSubscriptionPlans() {
  const { data, error } = await supabase.from('subscription_plans').select('*').eq('is_active', true).order('price_monthly');
  if (error) throw error;
  return data;
}

export async function getActiveSubscription(zoneId) {
  const { data, error } = await supabase.from('subscriptions').select('*, subscription_plans(*)').eq('zone_id', zoneId).eq('status', 'active').order('created_at', { ascending: false }).limit(1).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export function subscribeToSessions(zoneId, callback) {
  return supabase.channel(`sessions:${zoneId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `zone_id=eq.${zoneId}` }, callback).subscribe();
}

export function subscribeToNotifications(callback) {
  return supabase.channel('notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, callback).subscribe();
}
