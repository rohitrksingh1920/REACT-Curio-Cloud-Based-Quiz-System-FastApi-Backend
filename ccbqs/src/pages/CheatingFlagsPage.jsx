


import { useState, useEffect } from 'react'
import AppShell from '../components/layout/AppShell'
// import { CheatingAPI } from '../utils/mlApi'
import { CheatingAPI } from '../api/ml'

import { useToast } from '../context/ToastContext'
import { formatIST } from '../utils/dateUtils'
import './CheatingFlagsPage.css'

const SEVERITY_CFG = {
  high:   { bg: 'var(--danger-bg)',  color: 'var(--danger)',  label: 'High' },
  medium: { bg: '#fff8e6',           color: 'var(--warning)', label: 'Medium' },
  low:    { bg: 'var(--surface-2)',  color: 'var(--text-2)',  label: 'Low' },
}

const TYPE_CFG = {
  high_score_low_time:   { icon: 'ri-speed-line',         label: 'High Score, Low Time' },
  too_fast:              { icon: 'ri-timer-flash-line',    label: 'Answered Too Fast' },
  pattern_answers:       { icon: 'ri-repeat-line',         label: 'Pattern Answers' },
  sudden_score_jump:     { icon: 'ri-arrow-up-double-line',label: 'Sudden Score Jump' },
}

function FlagRow({ flag, onReview }) {
  const sev  = SEVERITY_CFG[flag.severity] || SEVERITY_CFG.low
  const type = TYPE_CFG[flag.suspicion_type] || { icon: 'ri-flag-line', label: flag.suspicion_type }

  return (
    <tr className={flag.is_reviewed ? 'flag-reviewed' : ''}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            background: sev.bg, color: sev.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>
            <i className={type.icon} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{type.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Flag #{flag.id}</div>
          </div>
        </div>
      </td>
      <td>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{flag.user_name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>User #{flag.user_id}</div>
      </td>
      <td style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 200 }}>
        {flag.quiz_title}
      </td>
      <td>
        <span style={{
          background: sev.bg, color: sev.color,
          padding: '3px 10px', borderRadius: 99,
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        }}>
          {sev.label}
        </span>
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 240 }}>
        {flag.detail || '—'}
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
        {formatIST(flag.created_at)}
      </td>
      <td>
        {flag.is_reviewed ? (
          <span style={{ fontSize: 12, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <i className="ri-checkbox-circle-line" /> Reviewed
          </span>
        ) : (
          <button className="btn btn-sm btn-secondary" onClick={() => onReview(flag.id)}>
            <i className="ri-check-line" /> Review
          </button>
        )}
      </td>
    </tr>
  )
}

export default function CheatingFlagsPage() {
  const { toast } = useToast()
  const [flags,    setFlags]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [reviewed, setReviewed] = useState(null)   // null | true | false
  const [severity, setSeverity] = useState('')

  useEffect(() => { load() }, [reviewed, severity])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await CheatingAPI.list(reviewed, severity || undefined)
      setFlags(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReview(id) {
    try {
      await CheatingAPI.review(id)
      setFlags(prev => prev.map(f => f.id === id ? { ...f, is_reviewed: true } : f))
      toast('Flag marked as reviewed.', 'success')
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const unreviewedCount = flags.filter(f => !f.is_reviewed).length

  const summaryCards = [
    { label: 'Total Flags',     value: flags.length,                                 icon: 'ri-flag-line',        bg: '#eef2ff',         color: 'var(--primary)' },
    { label: 'Unreviewed',      value: unreviewedCount,                              icon: 'ri-eye-off-line',     bg: 'var(--danger-bg)', color: 'var(--danger)' },
    { label: 'High Severity',   value: flags.filter(f => f.severity === 'high').length,   icon: 'ri-alarm-warning-line', bg: 'var(--danger-bg)', color: 'var(--danger)' },
    { label: 'Medium Severity', value: flags.filter(f => f.severity === 'medium').length, icon: 'ri-alert-line',   bg: '#fff8e6',         color: 'var(--warning)' },
  ]

  return (
    <AppShell title="Suspicious Behavior Flags" subtitle="ML-powered cheating detection — admin review panel">

      {/* Summary */}
      <div className="grid-4 mb-6">
        {summaryCards.map(s => (
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
      <div className="flex items-center gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
        <div className="filter-bar" style={{ margin: 0 }}>
          {[
            { label: 'All',        val: null  },
            { label: 'Unreviewed', val: false },
            { label: 'Reviewed',   val: true  },
          ].map(o => (
            <button
              key={String(o.val)}
              className={`filter-chip${reviewed === o.val ? ' active' : ''}`}
              onClick={() => setReviewed(o.val)}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="filter-bar" style={{ margin: 0 }}>
          {['', 'high', 'medium', 'low'].map(s => (
            <button
              key={s}
              className={`filter-chip${severity === s ? ' active' : ''}`}
              onClick={() => setSeverity(s)}
            >
              {s === '' ? 'All Severity' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 24 }}>
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton" style={{ height: 56, marginBottom: 10, borderRadius: 8 }} />
            ))}
          </div>
        ) : flags.length === 0 ? (
          <div className="empty-state">
            <i className="ri-shield-check-line" style={{ color: 'var(--success)' }} />
            <h3>No flags found</h3>
            <p>No suspicious behavior detected matching these filters.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>User</th>
                  <th>Quiz</th>
                  <th>Severity</th>
                  <th>Detail</th>
                  <th>Detected (IST)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {flags.map(f => (
                  <FlagRow key={f.id} flag={f} onReview={handleReview} />
                ))}
              </tbody>
            </table>
            <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}>
              Showing {flags.length} flag{flags.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
