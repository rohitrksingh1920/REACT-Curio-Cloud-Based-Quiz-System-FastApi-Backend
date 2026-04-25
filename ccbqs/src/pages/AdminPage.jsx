import { useState, useEffect } from 'react'
import AppShell from '../components/layout/AppShell'
import { AdminAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import './AdminPage.css'

const ROLES = ['all', 'admin', 'teacher', 'student']
const ROLE_COLORS = {
  admin:   { bg: '#fff0f5', color: '#ff4757' },
  teacher: { bg: '#eef2ff', color: '#5352ed' },
  student: { bg: '#e6fff1', color: '#2ed573' },
}

function RoleBadge({ role }) {
  const cfg = ROLE_COLORS[role] || { bg: '#f5f5f5', color: '#666' }
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      padding: '3px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: 0.5,
    }}>
      {role}
    </span>
  )
}

function UserRow({ u, currentUser, onRoleChange, onToggleActive, onDelete }) {
  const isSelf = u.id === currentUser?.id
  return (
    <tr className={!u.is_active ? 'user-inactive' : ''}>
      <td>
        <div className="flex items-center gap-3">
          <div className="admin-avatar">
            {u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {u.full_name} {isSelf && <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>(You)</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.email}</div>
          </div>
        </div>
      </td>
      <td><RoleBadge role={u.role} /></td>
      <td>
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: u.is_active ? 'var(--success)' : 'var(--danger)',
        }}>
          <i className={`ri-${u.is_active ? 'checkbox-circle' : 'forbid'}-line`} style={{ marginRight: 5 }} />
          {u.is_active ? 'Active' : 'Disabled'}
        </span>
      </td>
      <td>
        {isSelf ? (
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {/* Role Change */}
            <select
              className="admin-role-select"
              value={u.role}
              onChange={e => onRoleChange(u.id, e.target.value)}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>

            {/* Toggle Active */}
            <button
              className={`btn btn-sm ${u.is_active ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => onToggleActive(u.id, u.is_active)}
              title={u.is_active ? 'Disable account' : 'Enable account'}
            >
              <i className={`ri-${u.is_active ? 'user-forbid' : 'user-follow'}-line`} />
            </button>

            {/* Delete */}
            <button
              className="btn btn-sm btn-danger"
              onClick={() => onDelete(u.id, u.full_name)}
              title="Delete user"
            >
              <i className="ri-delete-bin-line" />
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

export default function AdminPage() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await AdminAPI.listUsers()
      setUsers(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(id, role) {
    try {
      const updated = await AdminAPI.updateRole(id, role)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: updated.role } : u))
      toast(`Role updated to ${role}.`, 'success')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function handleToggleActive(id, currentlyActive) {
    try {
      const res = await AdminAPI.toggleActive(id)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: res.is_active } : u))
      toast(res.is_active ? 'Account enabled.' : 'Account disabled.', 'success')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return
    try {
      await AdminAPI.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      toast('User deleted.', 'success')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    const matchSearch = !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    return matchRole && matchSearch
  })

  // Summary counts
  const counts = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1
    return acc
  }, {})

  return (
    <AppShell title="Admin Panel" subtitle="Manage users, roles, and access">

      {/* Summary Cards */}
      <div className="grid-4 mb-6">
        {[
          { label: 'Total Users',  value: users.length,        icon: 'ri-group-line',          bg: '#eef2ff',         color: 'var(--primary)' },
          { label: 'Admins',       value: counts.admin || 0,   icon: 'ri-shield-user-line',    bg: '#fff0f5',         color: '#ff4757' },
          { label: 'Teachers',     value: counts.teacher || 0, icon: 'ri-user-star-line',      bg: '#eef2ff',         color: 'var(--primary)' },
          { label: 'Students',     value: counts.student || 0, icon: 'ri-user-line',           bg: '#e6fff1',         color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="card stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
              <i className={s.icon} />
            </div>
            <div className="stat-body">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="error-banner mb-4"><i className="ri-error-warning-line" /> {error}</div>}

      {/* Filters */}
      <div className="flex items-center justify-between mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="filter-bar" style={{ margin: 0 }}>
          {ROLES.map(r => (
            <button
              key={r}
              className={`filter-chip${roleFilter === r ? ' active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
              {r !== 'all' && counts[r] ? ` (${counts[r]})` : ''}
            </button>
          ))}
        </div>
        <div className="search-wrap">
          <i className="ri-search-line" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 24 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton" style={{ height: 56, marginBottom: 10, borderRadius: 'var(--radius-sm)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <i className="ri-user-search-line" />
            <h3>No users found</h3>
            <p>{search ? 'Try a different search term.' : 'No users in this role.'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <UserRow
                    key={u.id}
                    u={u}
                    currentUser={currentUser}
                    onRoleChange={handleRoleChange}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)' }}>
              Showing {filtered.length} of {users.length} users
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
