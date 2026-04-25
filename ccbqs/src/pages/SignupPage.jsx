import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function SignupPage() {
  const { signup } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await signup(form.full_name.trim(), form.email.trim(), form.password)
      navigate('/dashboard')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function setField(k, v) {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }))
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-left">
          <div className="auth-left-brand">
            <div className="brand-icon"><i className="ri-cloud-line" /></div>
            <span>Curio</span>
          </div>
          <h2>Start your learning journey today.</h2>
          <p>Join Curio to access quizzes, track your progress, and climb the leaderboard.</p>
          <div className="auth-left-features">
            <div className="auth-left-feature">
              <i className="ri-book-2-line" />
              <span>Access quizzes assigned by your teachers</span>
            </div>
            <div className="auth-left-feature">
              <i className="ri-line-chart-line" />
              <span>Track your scores and improvement over time</span>
            </div>
            <div className="auth-left-feature">
              <i className="ri-medal-line" />
              <span>Compete with classmates on leaderboards</span>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <h2>Create Account</h2>
          <p className="auth-subtitle">Join Curio as a student today</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="full_name">Full Name</label>
              <div className="input-icon-wrap">
                <i className="ri-user-line" />
                <input
                  id="full_name"
                  type="text"
                  placeholder="Your full name"
                  value={form.full_name}
                  onChange={e => setField('full_name', e.target.value)}
                  autoComplete="name"
                  style={errors.full_name ? { borderColor: 'var(--danger)' } : {}}
                />
              </div>
              {errors.full_name && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.full_name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-icon-wrap">
                <i className="ri-mail-line" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  autoComplete="email"
                  style={errors.email ? { borderColor: 'var(--danger)' } : {}}
                />
              </div>
              {errors.email && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(min 8 chars)</span></label>
              <div className="input-icon-wrap">
                <i className="ri-lock-2-line" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  autoComplete="new-password"
                  style={errors.password ? { borderColor: 'var(--danger)' } : {}}
                />
              </div>
              {errors.password && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.password}</span>}
            </div>

            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
