import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import {
  apiFetchNotifications,
  apiMarkNotificationRead,
  apiMarkAllNotificationsRead,
  apiClearAllNotifications,
  type Notification,
} from '@/api/notifications/api'

export type { Notification }

interface NotificationContextValue {
  notifications: Notification[]
  loading: boolean
  unreadCount: number
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  clearAll: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const userEmail = user?.email ?? null

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !userEmail) {
      setNotifications([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    apiFetchNotifications(userEmail).then((data) => {
      if (!cancelled) {
        setNotifications(data)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [userEmail, authLoading])

  // Realtime subscription — supabase channel setup is a genuine side effect
  useEffect(() => {
    if (!userEmail) return

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_email=eq.${userEmail}`,
        },
        (payload) => setNotifications((prev) => [payload.new as Notification, ...prev])
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userEmail])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    await apiMarkNotificationRead(id)
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userEmail) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await apiMarkAllNotificationsRead(userEmail)
  }, [userEmail])

  const clearAll = useCallback(async () => {
    if (!userEmail) return
    setNotifications([])
    await apiClearAllNotifications(userEmail)
  }, [userEmail])

  const value = useMemo(
    () => ({ notifications, loading, unreadCount, markAsRead, markAllAsRead, clearAll }),
    [notifications, loading, unreadCount, markAsRead, markAllAsRead, clearAll]
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
