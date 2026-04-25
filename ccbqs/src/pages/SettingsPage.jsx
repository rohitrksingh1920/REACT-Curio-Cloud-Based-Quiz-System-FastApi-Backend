import { useState, useEffect, useRef } from 'react'
import AppShell from '../components/layout/AppShell'
import { SettingsAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import './SettingsPage.css'

const LANGS = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese']
const NAV_TABS = [
  { id: 'profile',  icon: 'ri-user-line',         label: 'Profile' },
  { id: 'security', icon: 'ri-shield-keyhole-line',label: 'Security' },
  { id: 'notifs',   icon: 'ri-notification-3-line',label: 'Notifications' },
  { id: 'prefs',    icon: 'ri-palette-line',       label: 'Preferences' },
]

export default function SettingsPage() {
  const { user, updateUser, setDark } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <AppShell title="Settings" subtitle="Manage your account and preferences">
      <div className="settings-layout">
        {/* Nav */}
        <nav className="settings-nav card">
          {NAV_TABS.map(t => (
            <button
              key={t.id}
              className={`settings-nav-item${activeTab === t.id ? ' active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <i className={t.icon} />
              {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="settings-content">
          {activeTab === 'profile'  && <ProfileTab user={user} updateUser={updateUser} toast={toast} />}
          {activeTab === 'security' && <SecurityTab user={user} toast={toast} />}
          {activeTab === 'notifs'   && <NotifsTab user={user} updateUser={updateUser} toast={toast} />}
          {activeTab === 'prefs'    && <PrefsTab user={user} updateUser={updateUser} setDark={setDark} toast={toast} />}
        </div>
      </div>
    </AppShell>
  )
}

/*  Profile Tab  */
function ProfileTab({ user, updateUser, toast }) {
  const [name, setName] = useState(user?.full_name || '')
  const [loading, setLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const fileRef = useRef()

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) { toast('Name cannot be empty.', 'error'); return }
    setLoading(true)
    try {
      const updated = await SettingsAPI.updateProfile({ full_name: name.trim() })
      updateUser({ ...user, ...updated })
      toast('Profile updated!', 'success')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowed.includes(file.type)) { toast('Only PNG or JPG files allowed.', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { toast('File too large. Max 5 MB.', 'error'); return }
    const fd = new FormData()
    fd.append('file', file)
    setAvatarLoading(true)
    try {
      const updated = await SettingsAPI.uploadAvatar(fd)
      updateUser({ ...user, ...updated })
      toast('Avatar updated!', 'success')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setAvatarLoading(false)
    }
  }

  return (
    <div className="card settings-card">
      <div className="settings-card-header">
        <h3>Profile Information</h3>
        <p>Update your name and profile picture</p>
      </div>

      {/* Avatar */}
      <div className="avatar-section">
        <div className="avatar-wrap">
          {user?.profile_picture ? (
            <img src={user.profile_picture} alt={user.full_name} className="avatar-img" />
          ) : (
            <div className="avatar-placeholder">{initials}</div>
          )}
          {avatarLoading && (
            <div className="avatar-loading">
              <span className="spinner" />
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={avatarLoading}
          >
            <i className="ri-upload-cloud-line" /> Upload Photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            style={{ display: 'none' }}
            onChange={handleAvatar}
          />
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>PNG or JPG, max 5 MB</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your full name"
          />
        </div>
        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            style={{ opacity: 0.6, cursor: 'not-allowed' }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
            Email cannot be changed after registration.
          </span>
        </div>
        <div className="form-group">
          <label>Role</label>
          <input
            type="text"
            value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
            disabled
            style={{ opacity: 0.6, cursor: 'not-allowed', textTransform: 'capitalize' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <><span className="spinner" /> Saving...</> : <><i className="ri-save-line" /> Save Changes</>}
        </button>
      </form>
    </div>
  )
}

/*  Security Tab  */
function SecurityTab({ user, toast }) {
  const [mode, setMode] = useState('choose') // 'choose' | 'otp' | 'direct'
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpForm, setOtpForm] = useState({ otp: '', new_password: '', confirm_password: '' })
  const [directForm, setDirectForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  async function sendOtp() {
    setOtpLoading(true)
    try {
      await SettingsAPI.requestOtp()
      setOtpSent(true)
      toast(`OTP sent to ${user.email}`, 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!otpForm.otp || otpForm.otp.length !== 6) errs.otp = 'Enter the 6-digit OTP'
    if (!otpForm.new_password || otpForm.new_password.length < 8) errs.new_password = 'Min 8 characters'
    if (otpForm.new_password !== otpForm.confirm_password) errs.confirm_password = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      await SettingsAPI.verifyOtp(otpForm.otp, otpForm.new_password, otpForm.confirm_password)
      toast('Password changed successfully!', 'success')
      setMode('choose'); setOtpSent(false)
      setOtpForm({ otp: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDirectSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!directForm.current_password) errs.current_password = 'Required'
    if (!directForm.new_password || directForm.new_password.length < 8) errs.new_password = 'Min 8 characters'
    if (directForm.new_password !== directForm.confirm_password) errs.confirm_password = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      await SettingsAPI.changePassword(directForm.current_password, directForm.new_password, directForm.confirm_password)
      toast('Password changed!', 'success')
      setMode('choose')
      setDirectForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function fieldErr(k) {
    return errors[k] ? <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors[k]}</span> : null
  }

  return (
    <div className="card settings-card">
      <div className="settings-card-header">
        <h3>Security</h3>
        <p>Manage your password</p>
      </div>

      {mode === 'choose' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 8 }}>
            Choose how you'd like to change your password:
          </p>
          <button className="btn btn-secondary" onClick={() => { setMode('otp'); setErrors({}) }}>
            <i className="ri-mail-send-line" /> Via Email OTP (requires SMTP)
          </button>
          <button className="btn btn-secondary" onClick={() => { setMode('direct'); setErrors({}) }}>
            <i className="ri-lock-password-line" /> Using Current Password
          </button>
        </div>
      )}

      {mode === 'otp' && (
        <div>
          {!otpSent ? (
            <div>
              <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>
                An OTP will be sent to <strong>{user?.email}</strong>
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={sendOtp} disabled={otpLoading}>
                  {otpLoading ? <><span className="spinner" /> Sending...</> : <><i className="ri-send-plane-line" /> Send OTP</>}
                </button>
                <button className="btn btn-ghost" onClick={() => setMode('choose')}>Back</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleOtpSubmit} noValidate>
              <div className="form-group">
                <label>6-Digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter OTP"
                  value={otpForm.otp}
                  onChange={e => { setOtpForm(p => ({ ...p, otp: e.target.value.replace(/\D/,'') })); setErrors(p => ({ ...p, otp: '' })) }}
                  style={{ letterSpacing: 6, fontSize: 20, textAlign: 'center', ...(errors.otp ? { borderColor: 'var(--danger)' } : {}) }}
                />
                {fieldErr('otp')}
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" placeholder="Min 8 characters" value={otpForm.new_password}
                  onChange={e => { setOtpForm(p => ({ ...p, new_password: e.target.value })); setErrors(p => ({ ...p, new_password: '' })) }}
                  style={errors.new_password ? { borderColor: 'var(--danger)' } : {}} />
                {fieldErr('new_password')}
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input type="password" placeholder="Repeat new password" value={otpForm.confirm_password}
                  onChange={e => { setOtpForm(p => ({ ...p, confirm_password: e.target.value })); setErrors(p => ({ ...p, confirm_password: '' })) }}
                  style={errors.confirm_password ? { borderColor: 'var(--danger)' } : {}} />
                {fieldErr('confirm_password')}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <><span className="spinner" /> Changing...</> : 'Change Password'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => { setMode('choose'); setOtpSent(false) }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {mode === 'direct' && (
        <form onSubmit={handleDirectSubmit} noValidate>
          <div className="form-group">
            <label>Current Password</label>
            <input type="password" placeholder="Your current password" value={directForm.current_password}
              onChange={e => { setDirectForm(p => ({ ...p, current_password: e.target.value })); setErrors(p => ({ ...p, current_password: '' })) }}
              style={errors.current_password ? { borderColor: 'var(--danger)' } : {}} />
            {fieldErr('current_password')}
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" placeholder="Min 8 characters" value={directForm.new_password}
              onChange={e => { setDirectForm(p => ({ ...p, new_password: e.target.value })); setErrors(p => ({ ...p, new_password: '' })) }}
              style={errors.new_password ? { borderColor: 'var(--danger)' } : {}} />
            {fieldErr('new_password')}
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input type="password" placeholder="Repeat new password" value={directForm.confirm_password}
              onChange={e => { setDirectForm(p => ({ ...p, confirm_password: e.target.value })); setErrors(p => ({ ...p, confirm_password: '' })) }}
              style={errors.confirm_password ? { borderColor: 'var(--danger)' } : {}} />
            {fieldErr('confirm_password')}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Changing...</> : 'Change Password'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setMode('choose')}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}

/*  Notifications Tab  */
function NotifsTab({ user, updateUser, toast }) {
  const [prefs, setPrefs] = useState({
    email_digests: user?.email_digests ?? true,
    push_alerts:   user?.push_alerts   ?? false,
  })
  const [loading, setLoading] = useState(false)

  async function handleToggle(key) {
    const updated = { ...prefs, [key]: !prefs[key] }
    setPrefs(updated)
    setLoading(true)
    try {
      const res = await SettingsAPI.updateNotificationPrefs(updated.email_digests, updated.push_alerts)
      updateUser({ ...user, ...res })
      toast('Preferences saved.', 'success')
    } catch (e) {
      setPrefs(prefs) // revert
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card settings-card">
      <div className="settings-card-header">
        <h3>Notification Preferences</h3>
        <p>Control how you receive notifications</p>
      </div>

      <div className="toggle-wrap">
        <div className="toggle-info">
          <h4>Email Digests</h4>
          <p>Receive email summaries of your quiz activity</p>
        </div>
        <button
          className={`toggle${prefs.email_digests ? ' on' : ''}`}
          onClick={() => handleToggle('email_digests')}
          disabled={loading}
          aria-label="Toggle email digests"
        />
      </div>

      <div className="toggle-wrap">
        <div className="toggle-info">
          <h4>Push Alerts</h4>
          <p>Get in-app alerts for quiz assignments and results</p>
        </div>
        <button
          className={`toggle${prefs.push_alerts ? ' on' : ''}`}
          onClick={() => handleToggle('push_alerts')}
          disabled={loading}
          aria-label="Toggle push alerts"
        />
      </div>
    </div>
  )
}

/*  Preferences Tab  */
function PrefsTab({ user, updateUser, setDark, toast }) {
  const [dark, setDarkLocal] = useState(user?.dark_mode ?? false)
  const [lang, setLang] = useState(user?.display_language || 'English')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      const res = await SettingsAPI.updateProfile({ dark_mode: dark, display_language: lang })
      updateUser({ ...user, ...res })
      setDark(dark)
      toast('Preferences saved!', 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card settings-card">
      <div className="settings-card-header">
        <h3>Preferences</h3>
        <p>Customize your experience</p>
      </div>

      <div className="toggle-wrap">
        <div className="toggle-info">
          <h4>Dark Mode</h4>
          <p>Switch between light and dark interface</p>
        </div>
        <button
          className={`toggle${dark ? ' on' : ''}`}
          onClick={() => { setDarkLocal(d => !d); setDark(!dark) }}
          aria-label="Toggle dark mode"
        />
      </div>

      <div style={{ paddingTop: 20 }}>
        <div className="form-group">
          <label>Display Language</label>
          <select value={lang} onChange={e => setLang(e.target.value)}>
            {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? <><span className="spinner" /> Saving...</> : <><i className="ri-save-line" /> Save Preferences</>}
        </button>
      </div>
    </div>
  )
}
