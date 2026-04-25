import { useState, useEffect } from 'react'
import AppShell from '../components/layout/AppShell'
import { NotificationsAPI } from '../api'
import { useToast } from '../context/ToastContext'
import './NotificationsPage.css'

const TYPE_CONFIG = {
  quiz_assigned: { icon: 'ri-book-2-line',       cls: 'notif-quiz',        label: 'Quiz' },
  system:        { icon: 'ri-information-line',   cls: 'notif-system',      label: 'System' },
  achievement:   { icon: 'ri-star-line',          cls: 'notif-achievement', label: 'Achievement' },
  performance:   { icon: 'ri-bar-chart-line',     cls: 'notif-performance', label: 'Performance' },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function NotifCard({ notif, onMarkRead, onDelete }) {
  const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
  return (
    <div className={`notif-card${notif.is_read ? '' : ' unread'}`}>
      <div className={`notif-icon ${cfg.cls}`}>
        <i className={cfg.icon} />
      </div>
      <div className="notif-body">
        <div className="notif-title">{notif.title}</div>
        <div className="notif-message">{notif.message}</div>
        <div className="notif-time">
          <i className="ri-time-line" />
          {timeAgo(notif.created_at)}
        </div>
      </div>
      <div className="notif-actions">
        {!notif.is_read && (
          <button
            className="notif-action-btn read"
            title="Mark as read"
            onClick={() => onMarkRead(notif.id)}
          >
            <i className="ri-check-line" />
          </button>
        )}
        <button
          className="notif-action-btn delete"
          title="Delete"
          onClick={() => onDelete(notif.id)}
        >
          <i className="ri-delete-bin-line" />
        </button>
        {!notif.is_read && <span className="notif-dot" />}
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
  }, [filter])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await NotificationsAPI.list(filter === 'unread')
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkRead(id) {
    try {
      await NotificationsAPI.markRead(id)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(c => Math.max(0, c - 1))
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function handleDelete(id) {
    const wasUnread = notifications.find(n => n.id === id)?.is_read === false
    try {
      await NotificationsAPI.delete(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (wasUnread) setUnreadCount(c => Math.max(0, c - 1))
      toast('Notification deleted.', 'success')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function handleMarkAllRead() {
    try {
      await NotificationsAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
      toast('All notifications marked as read.', 'success')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const displayed = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications

  return (
    <AppShell title="Notifications" subtitle="Stay updated with your quiz activities">

      <div className="notif-page-header">
        <div className="flex items-center gap-3">
          <div className="filter-bar" style={{ margin: 0 }}>
            <button
              className={`filter-chip${filter === 'all' ? ' active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-chip${filter === 'unread' ? ' active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread {unreadCount > 0 && (
                <span style={{
                  background: 'var(--primary)', color: '#fff',
                  borderRadius: 99, fontSize: 10, fontWeight: 700,
                  padding: '1px 6px', marginLeft: 4,
                }}>{unreadCount}</span>
              )}
            </button>
          </div>
        </div>

        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
            <i className="ri-check-double-line" /> Mark all read
          </button>
        )}
      </div>

      {error && <div className="error-banner mb-4"><i className="ri-error-warning-line" /> {error}</div>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <i className="ri-notification-off-line" />
            <h3>No notifications</h3>
            <p>{filter === 'unread' ? 'You\'re all caught up!' : 'No notifications yet.'}</p>
          </div>
        </div>
      ) : (
        <div className="notif-list">
          {displayed.map(n => (
            <NotifCard
              key={n.id}
              notif={n}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </AppShell>
  )
}
