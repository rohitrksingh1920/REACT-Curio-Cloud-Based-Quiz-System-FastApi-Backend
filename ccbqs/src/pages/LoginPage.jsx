import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function LoginPage() {
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const e = {}
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await login(form.email.trim(), form.password)
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
          <h2>Learn smarter,<br />test better.</h2>
          <p>Create, assign, and take quizzes effortlessly with Curio's cloud-powered quiz platform.</p>
          <div className="auth-left-features">
            <div className="auth-left-feature">
              <i className="ri-checkbox-circle-line" />
              <span>Role-based access for admins, teachers & students</span>
            </div>
            <div className="auth-left-feature">
              <i className="ri-bar-chart-box-line" />
              <span>Real-time analytics and performance tracking</span>
            </div>
            <div className="auth-left-feature">
              <i className="ri-trophy-line" />
              <span>Live leaderboards for every quiz</span>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <h2>Welcome back</h2>
          <p className="auth-subtitle">Sign in to your Curio account</p>

          <form onSubmit={handleSubmit} noValidate>
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
              <label htmlFor="password">Password</label>
              <div className="input-icon-wrap">
                <i className="ri-lock-2-line" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  autoComplete="current-password"
                  style={errors.password ? { borderColor: 'var(--danger)' } : {}}
                />
              </div>
              {errors.password && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.password}</span>}
            </div>

            <div style={{ textAlign: 'right', marginBottom: 24 }}>
              <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--primary)' }}>
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account? <Link to="/signup">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
