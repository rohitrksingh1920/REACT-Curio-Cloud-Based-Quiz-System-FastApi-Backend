import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import TopHeader from './TopHeader'
import { NotificationsAPI } from '../../api'

export default function AppShell({ children, title, subtitle }) {
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function fetchBadge() {
      try {
        const data = await NotificationsAPI.list()
        if (!cancelled) setNotifCount(data?.unread_count || 0)
      } catch { /* silent */ }
    }
    fetchBadge()
    const interval = setInterval(fetchBadge, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return (
    <div className="app-shell">
      <Sidebar notifCount={notifCount} />
      <div className="main-area">
        <TopHeader title={title} subtitle={subtitle} notifCount={notifCount} />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  )
}
