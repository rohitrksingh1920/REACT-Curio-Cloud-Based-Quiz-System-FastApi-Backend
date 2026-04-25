import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './TopHeader.css'

export default function TopHeader({ title, subtitle, notifCount = 0 }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="top-header">
      <div className="top-header-left">
        {title && (
          <div>
            <h1 className="top-header-title">{title}</h1>
            {subtitle && <p className="top-header-sub">{subtitle}</p>}
          </div>
        )}
      </div>
      <div className="top-header-right">
        <button
          className="header-notif-btn"
          onClick={() => navigate('/notifications')}
          title="Notifications"
        >
          <i className="ri-notification-3-line" />
          {notifCount > 0 && (
            <span className="header-notif-badge">{notifCount > 99 ? '99+' : notifCount}</span>
          )}
        </button>

        <div className="header-user" onClick={() => navigate('/settings')} role="button" tabIndex={0}>
          {user?.profile_picture ? (
            <img src={user.profile_picture} alt={user.full_name} className="header-avatar header-avatar-img" />
          ) : (
            <div className="header-avatar">
              {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
            </div>
          )}
          <div className="header-user-info">
            <span className="header-user-name">{user?.full_name}</span>
            <span className="header-user-role">{user?.role}</span>
          </div>
          <i className="ri-arrow-down-s-line header-chevron" />
        </div>
      </div>
    </header>
  )
}
