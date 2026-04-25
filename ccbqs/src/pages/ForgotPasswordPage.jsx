import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthAPI } from '../api'
import { useToast } from '../context/ToastContext'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [step, setStep] = useState(1) // 1=email, 2=otp+new password
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ otp: '', new_password: '', confirm_password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSendOtp(e) {
    e.preventDefault()
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Enter a valid email address' })
      return
    }
    setErrors({})
    setLoading(true)
    try {
      await AuthAPI.forgotPassword(email.trim())
      toast('OTP sent to your email!', 'success')
      setStep(2)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    const errs = {}
    if (!form.otp || form.otp.length !== 6) errs.otp = 'Enter the 6-digit OTP'
    if (!form.new_password || form.new_password.length < 8) errs.new_password = 'Password must be at least 8 characters'
    if (form.new_password !== form.confirm_password) errs.confirm_password = 'Passwords do not match'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await AuthAPI.resetPassword(email, form.otp, form.new_password, form.confirm_password)
      setDone(true)
      toast('Password reset successfully!', 'success')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500, width: '100%' }}>
        <div style={{ width: '100%', padding: '48px 48px' }}>
          <div style={{ marginBottom: 32 }}>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-2)', marginBottom: 24 }}>
              <i className="ri-arrow-left-line" /> Back to Login
            </Link>
            <h2 style={{ fontSize: 26, marginBottom: 8 }}>Reset Password</h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)' }}>
              {step === 1 ? "Enter your registered email to receive an OTP." : `Enter the OTP sent to ${email}`}
            </p>
          </div>

          {done ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 52, color: 'var(--success)', marginBottom: 16 }}>
                <i className="ri-checkbox-circle-line" />
              </div>
              <h3 style={{ marginBottom: 8 }}>Password Reset!</h3>
              <p style={{ marginBottom: 24 }}>Your password has been updated successfully.</p>
              <Link to="/login" className="btn btn-primary">Sign In Now</Link>
            </div>
          ) : step === 1 ? (
            <form onSubmit={handleSendOtp} noValidate>
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-icon-wrap">
                  <i className="ri-mail-line" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrors({}) }}
                    style={errors.email ? { borderColor: 'var(--danger)' } : {}}
                  />
                </div>
                {errors.email && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.email}</span>}
              </div>
              <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" /> Sending OTP...</> : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} noValidate>
              <div className="form-group">
                <label>6-Digit OTP</label>
                <input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={form.otp}
                  onChange={e => setForm(p => ({ ...p, otp: e.target.value.replace(/\D/g,'') }))}
                  style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center', ...(errors.otp ? { borderColor: 'var(--danger)' } : {}) }}
                />
                {errors.otp && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.otp}</span>}
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Min 8 characters"
                  value={form.new_password}
                  onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))}
                  style={errors.new_password ? { borderColor: 'var(--danger)' } : {}}
                />
                {errors.new_password && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.new_password}</span>}
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label>Confirm Password</label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={form.confirm_password}
                  onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))}
                  style={errors.confirm_password ? { borderColor: 'var(--danger)' } : {}}
                />
                {errors.confirm_password && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{errors.confirm_password}</span>}
              </div>
              <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" /> Resetting...</> : 'Reset Password'}
              </button>
              <button
                type="button"
                className="btn btn-ghost w-full mt-2"
                onClick={() => setStep(1)}
              >
                Use different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
