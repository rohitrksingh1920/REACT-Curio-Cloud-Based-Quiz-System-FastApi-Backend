// // import { useState, useEffect } from 'react'
// // import Sidebar from './Sidebar'
// // import TopHeader from './TopHeader'
// // import { NotificationsAPI } from '../../api'

// // export default function AppShell({ children, title, subtitle }) {
// //   const [notifCount, setNotifCount] = useState(0)

// //   useEffect(() => {
// //     let cancelled = false
// //     async function fetchBadge() {
// //       try {
// //         const data = await NotificationsAPI.list()
// //         if (!cancelled) setNotifCount(data?.unread_count || 0)
// //       } catch { /* silent */ }
// //     }
// //     fetchBadge()
// //     const interval = setInterval(fetchBadge, 60000)
// //     return () => { cancelled = true; clearInterval(interval) }
// //   }, [])

// //   return (
// //     <div className="app-shell">
// //       <Sidebar notifCount={notifCount} />
// //       <div className="main-area">
// //         <TopHeader title={title} subtitle={subtitle} notifCount={notifCount} />
// //         <div className="page-content">
// //           {children}
// //         </div>
// //       </div>
// //     </div>
// //   )
// // }

























// import { useState, useEffect, useCallback } from 'react'
// import Sidebar from './Sidebar'
// import TopHeader from './TopHeader'
// import { NotificationsAPI } from '../../api'

// export default function AppShell({ children, title, subtitle }) {
//   const [notifCount,    setNotifCount]    = useState(0)
//   const [sidebarOpen,   setSidebarOpen]   = useState(false)

//   // Close sidebar when route changes (clicking a nav link)
//   useEffect(() => {
//     setSidebarOpen(false)
//   }, [title])

//   // Close on Escape key
//   useEffect(() => {
//     function onKey(e) {
//       if (e.key === 'Escape') setSidebarOpen(false)
//     }
//     document.addEventListener('keydown', onKey)
//     return () => document.removeEventListener('keydown', onKey)
//   }, [])

//   // Prevent body scroll when sidebar open on mobile
//   useEffect(() => {
//     if (sidebarOpen) {
//       document.body.style.overflow = 'hidden'
//     } else {
//       document.body.style.overflow = ''
//     }
//     return () => { document.body.style.overflow = '' }
//   }, [sidebarOpen])

//   // Notification badge polling
//   useEffect(() => {
//     let cancelled = false
//     async function fetchBadge() {
//       try {
//         const data = await NotificationsAPI.list()
//         if (!cancelled) setNotifCount(data?.unread_count || 0)
//       } catch { /* silent */ }
//     }
//     fetchBadge()
//     const interval = setInterval(fetchBadge, 60_000)
//     return () => { cancelled = true; clearInterval(interval) }
//   }, [])

//   const closeSidebar = useCallback(() => setSidebarOpen(false), [])
//   const toggleSidebar = useCallback(() => setSidebarOpen(o => !o), [])

//   return (
//     <div className="app-shell">
//       {/* Sidebar (desktop: always visible, mobile: slide-in drawer) */}
//       <Sidebar
//         notifCount={notifCount}
//         isOpen={sidebarOpen}
//         onClose={closeSidebar}
//       />

//       {/* Mobile overlay backdrop */}
//       <div
//         className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
//         onClick={closeSidebar}
//         aria-hidden="true"
//       />

//       <div className="main-area">
//         <TopHeader
//           title={title}
//           subtitle={subtitle}
//           notifCount={notifCount}
//           onMenuClick={toggleSidebar}
//         />
//         <div className="page-content">
//           {children}
//         </div>
//       </div>
//     </div>
//   )
// }


































import { useState, useEffect, useCallback } from 'react'
import Sidebar from './Sidebar'
import TopHeader from './TopHeader'
import { NotificationsAPI } from '../../api'

export default function AppShell({ children, title, subtitle }) {
  const [notifCount,    setNotifCount]    = useState(0)
  const [sidebarOpen,   setSidebarOpen]   = useState(false)

  // Close sidebar when route changes (clicking a nav link)
  useEffect(() => {
    setSidebarOpen(false)
  }, [title])

  // Close on Escape key
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  // Notification badge polling
  useEffect(() => {
    let cancelled = false
    async function fetchBadge() {
      try {
        const data = await NotificationsAPI.list()
        if (!cancelled) setNotifCount(data?.unread_count || 0)
      } catch { /* silent */ }
    }
    fetchBadge()
    const interval = setInterval(fetchBadge, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen(o => !o), [])

  return (
    <div className="app-shell">
      {/* Sidebar (desktop: always visible, mobile: slide-in drawer) */}
      <Sidebar
        notifCount={notifCount}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      {/* Mobile overlay backdrop */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <div className="main-area">
        <TopHeader
          title={title}
          subtitle={subtitle}
          notifCount={notifCount}
          onMenuClick={toggleSidebar}
        />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  )
}
