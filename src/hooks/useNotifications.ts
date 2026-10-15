import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Notification } from '@/types';

export function useNotifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!profile) return;
    const [notifsRes, countRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false),
    ]);
    setNotifications((notifsRes.data as Notification[]) || []);
    setUnreadCount(countRes.count || 0);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Poll for new notifications every 15 seconds
  useEffect(() => {
    if (!profile) return;
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [profile, loadNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [profile]);

  const markAllAsRead = useCallback(async () => {
    if (!profile) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [profile]);

  const deleteNotification = useCallback(async (id: string) => {
    if (!profile) return;
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [profile]);

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
