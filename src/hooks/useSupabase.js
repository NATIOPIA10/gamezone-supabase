import { useState, useEffect, useCallback } from 'react';
import { supabase, subscribeToSessions, subscribeToNotifications } from '../lib/supabase';
import * as db from '../lib/supabase';

export function useFetch(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refetch: load };
}

export const useZones = () => useFetch(() => db.getAllZones(), []);
export const useZone = (id) => useFetch(() => id ? db.getZone(id) : Promise.resolve(null), [id]);
export const useOwners = () => useFetch(() => db.getAllOwners(), []);
export const useAllUsers = () => useFetch(() => db.getAllUsers(), []);
export const useStaff = (zoneId) => useFetch(() => zoneId ? db.getStaffByZone(zoneId) : Promise.resolve([]), [zoneId]);
export const usePlayers = (zoneId = null) => useFetch(() => db.getAllPlayers(zoneId), [zoneId]);
export const usePayments = (zoneId) => useFetch(() => zoneId ? db.getPaymentsByZone(zoneId) : Promise.resolve([]), [zoneId]);
export const usePlatformStats = () => useFetch(() => db.getPlatformStats(), []);
export const useZoneAnalytics = (zoneId = null) => useFetch(() => db.getZoneAnalytics(zoneId), [zoneId]);
export const useSubscriptionPlans = () => useFetch(() => db.getSubscriptionPlans(), []);
export const useActiveSubscription = (zoneId) => useFetch(() => zoneId ? db.getActiveSubscription(zoneId) : Promise.resolve(null), [zoneId]);
export const useRevenueByMonth = (zoneId = null) => useFetch(() => db.getRevenueByMonth(zoneId), [zoneId]);

export function useSessions(zoneId) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!zoneId) return;
    try {
      setLoading(true);
      const data = await db.getActiveSessions(zoneId);
      setSessions(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [zoneId]);

  useEffect(() => {
    load();
    const channel = subscribeToSessions(zoneId, (payload) => {
      if (payload.eventType === 'INSERT') setSessions(prev => [payload.new, ...prev]);
      if (payload.eventType === 'UPDATE') setSessions(prev => payload.new.status === 'ended' ? prev.filter(s => s.id !== payload.new.id) : prev.map(s => s.id === payload.new.id ? payload.new : s));
    });
    return () => { supabase.removeChannel(channel); };
  }, [zoneId, load]);

  return { data: sessions, loading, error, refetch: load };
}

export function useNotifications(zoneId = null) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await db.getNotifications(zoneId);
      setNotifications(data || []);
    } finally {
      setLoading(false);
    }
  }, [zoneId]);

  useEffect(() => {
    load();
    const channel = subscribeToNotifications((payload) => {
      setNotifications(prev => [payload.new, ...prev]);
    });
    return () => { supabase.removeChannel(channel); };
  }, [zoneId, load]);

  return { data: notifications, loading, refetch: load };
}

export function useMutation(mutateFn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const mutate = async (...args) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      const result = await mutateFn(...args);
      setSuccess(true);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error, success };
}
