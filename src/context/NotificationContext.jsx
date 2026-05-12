import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { logError } from '../lib/logger';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const userEmail = user?.email ?? null;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch notifications for current user
  useEffect(() => {
    if (authLoading || !userEmail) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(50);

      if (cancelled) return;

      if (error) {
        logError('Failed to load notifications', { message: error.message });
      } else {
        setNotifications(data || []);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userEmail, authLoading]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!userEmail) return;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_email=eq.${userEmail}` },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userEmail]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markAsRead = useCallback(async (notificationId) => {
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
    if (error) logError('Failed to mark notification read', { message: error.message });
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userEmail) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const { error } = await supabase.from('notifications').update({ read: true }).eq('user_email', userEmail).eq('read', false);
    if (error) logError('Failed to mark all notifications read', { message: error.message });
  }, [userEmail]);

  const clearAll = useCallback(async () => {
    if (!userEmail) return;
    setNotifications([]);
    const { error } = await supabase.from('notifications').delete().eq('user_email', userEmail);
    if (error) logError('Failed to clear notifications', { message: error.message });
  }, [userEmail]);

  const value = useMemo(() => ({
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  }), [notifications, loading, unreadCount, markAsRead, markAllAsRead, clearAll]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Send a notification to a user by email
export async function sendNotification({ userEmail, title, body = '', boardId = null, cardId = null }) {
  const { error } = await supabase
    .from('notifications')
    .insert({ user_email: userEmail, title, body, board_id: boardId, card_id: cardId });
  if (error) logError('Failed to send notification', { message: error.message });
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
