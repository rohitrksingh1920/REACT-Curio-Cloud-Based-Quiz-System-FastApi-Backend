// import { NavLink, useNavigate } from 'react-router-dom'
// import { useAuth } from '../../context/AuthContext'
// import './Sidebar.css'

// const NAV_ITEMS = [
//   { to: '/dashboard',    icon: 'ri-dashboard-line',     label: 'Dashboard' },
//   { to: '/create-quiz',  icon: 'ri-add-circle-line',    label: 'Create Quiz',   teacherOnly: true },
//   { to: '/my-quizzes',   icon: 'ri-list-check-2',       label: 'My Quizzes' },
//   { to: '/analytics',    icon: 'ri-bar-chart-box-line', label: 'Analytics' },
//   { to: '/leaderboard',  icon: 'ri-trophy-line',        label: 'Leaderboard',   hide: true },
//   { to: '/notifications',icon: 'ri-notification-3-line',label: 'Notifications' },
//   { to: '/settings',     icon: 'ri-settings-3-line',    label: 'Settings' },
//   { to: '/admin',        icon: 'ri-shield-user-line',   label: 'Admin',         adminOnly: true },
// ]

// export default function Sidebar({ notifCount = 0 }) {
//   const { user, logout, isAdmin, isTeacher } = useAuth()
//   const navigate = useNavigate()

//   function handleLogout() {
//     logout()
//     navigate('/login')
//   }

//   const initials = user?.full_name
//     ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
//     : '?'

//   return (
//     <aside className="sidebar">
//       <div className="sidebar-header">
//         <div className="sidebar-brand">
//           <div className="sidebar-brand-icon">
//             <i className="ri-cloud-line" />
//           </div>
//           <span>Curio</span>
//         </div>
//       </div>

//       <nav className="sidebar-nav">
//         {NAV_ITEMS.filter(item => {
//           if (item.hide) return false
//           if (item.adminOnly && !isAdmin) return false
//           if (item.teacherOnly && !isTeacher) return false
//           return true
//         }).map(item => (
//           <NavLink
//             key={item.to}
//             to={item.to}
//             className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
//           >
//             <i className={item.icon} />
//             <span>{item.label}</span>
//             {item.to === '/notifications' && notifCount > 0 && (
//               <span className="sidebar-badge">{notifCount}</span>
//             )}
//           </NavLink>
//         ))}
//       </nav>

//       <div className="sidebar-footer">
//         <div className="sidebar-user">
//           {user?.profile_picture ? (
//             <img
//               src={user.profile_picture}
//               alt={user.full_name}
//               className="sidebar-avatar sidebar-avatar-img"
//             />
//           ) : (
//             <div className="sidebar-avatar">{initials}</div>
//           )}
//           <div className="sidebar-user-info">
//             <div className="sidebar-user-name">
//               {user?.full_name?.split(' ')[0] ? `Hey, ${user.full_name.split(' ')[0]}!` : 'Welcome!'}
//             </div>
//             <div className="sidebar-user-role">{user?.role}</div>
//           </div>
//         </div>
//         <button className="sidebar-logout" onClick={handleLogout} title="Logout">
//           <i className="ri-logout-box-r-line" />
//         </button>
//       </div>
//     </aside>
//   )
// }





















import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Sidebar.css'

const NAV_ITEMS = [
  // ── Core ─────────────────────────────────────────────────────────────────
  { to: '/dashboard',           icon: 'ri-dashboard-line',        label: 'Dashboard' },
  { to: '/create-quiz',         icon: 'ri-add-circle-line',       label: 'Create Quiz',      teacherOnly: true },
  { to: '/my-quizzes',          icon: 'ri-list-check-2',          label: 'My Quizzes' },
  { to: '/analytics',           icon: 'ri-bar-chart-box-line',    label: 'Analytics' },

  // ── ML Features ──────────────────────────────────────────────────────────
  { divider: true, label: 'ML Features' },
  { to: '/insights',            icon: 'ri-lightbulb-flash-line',  label: 'Insights',         mlBadge: true },
  { to: '/smart-leaderboard',   icon: 'ri-ai-generate',           label: 'Smart Rank',       mlBadge: true },

  // ── Other ─────────────────────────────────────────────────────────────────
  { divider: true, label: 'Other' },
  { to: '/notifications',       icon: 'ri-notification-3-line',   label: 'Notifications',    showBadge: true },
  { to: '/settings',            icon: 'ri-settings-3-line',       label: 'Settings' },
  { to: '/admin',               icon: 'ri-shield-user-line',      label: 'Admin',            adminOnly: true },
  { to: '/admin/cheating',      icon: 'ri-flag-line',             label: 'Cheat Flags',      adminOnly: true, mlBadge: true },
]

export default function Sidebar({ notifCount = 0 }) {
  const { user, logout, isAdmin, isTeacher } = useAuth()
  const navigate = useNavigate()

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <i className="ri-cloud-line" />
          </div>
          <span>Curio</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, idx) => {
          // ── Divider ─────────────────────────────────────────────────────
          if (item.divider) {
            return (
              <div key={`divider-${idx}`} className="sidebar-divider">
                <span>{item.label}</span>
              </div>
            )
          }

          // ── Filter by role ───────────────────────────────────────────────
          if (item.adminOnly  && !isAdmin)   return null
          if (item.teacherOnly && !isTeacher) return null

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-item${isActive ? ' active' : ''}${item.mlBadge ? ' ml-item' : ''}`
              }
            >
              <i className={item.icon} />
              <span>{item.label}</span>

              {/* Notification badge */}
              {item.showBadge && notifCount > 0 && (
                <span className="sidebar-badge notif">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}

              {/* ML badge */}
              {item.mlBadge && (
                <span className="sidebar-badge ml">ML</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          {user?.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={user.full_name}
              className="sidebar-avatar sidebar-avatar-img"
            />
          ) : (
            <div className="sidebar-avatar">{initials}</div>
          )}
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">
              {user?.full_name?.split(' ')[0]
                ? `Hey, ${user.full_name.split(' ')[0]}!`
                : 'Welcome!'}
            </div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </div>
        <button
          className="sidebar-logout"
          onClick={() => { logout(); navigate('/login') }}
          title="Logout"
        >
          <i className="ri-logout-box-r-line" />
        </button>
      </div>
    </aside>
  )
}
