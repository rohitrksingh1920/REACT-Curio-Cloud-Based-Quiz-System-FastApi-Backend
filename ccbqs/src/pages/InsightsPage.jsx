


import { useState, useEffect } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts'
import AppShell from '../components/layout/AppShell'
// import { InsightsAPI } from '../utils/mlApi'
import { InsightsAPI } from '../api/ml'

import './InsightsPage.css'

const SEVERITY_CONFIG = {
  critical:   { color: '#ff4757', bg: '#fff0f1', icon: 'ri-alarm-warning-line',       label: 'Critical' },
  weak:       { color: '#ffa502', bg: '#fff8e6', icon: 'ri-alert-line',               label: 'Needs Work' },
  improving:  { color: '#3498db', bg: '#e8f4fd', icon: 'ri-arrow-up-circle-line',     label: 'Improving' },
}

const SUBJECT_COLORS = ['#5352ed','#2ed573','#ffa502','#ff4757','#00d2ff','#a29bfe','#fd79a8']

function WeakTopicCard({ topic }) {
  const cfg = SEVERITY_CONFIG[topic.severity] || SEVERITY_CONFIG.improving
  return (
    <div className="weak-card" style={{ borderLeft: `4px solid ${cfg.color}` }}>
      <div className="weak-card-top">
        <div className="weak-card-icon" style={{ background: cfg.bg, color: cfg.color }}>
          <i className={cfg.icon} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="weak-card-title">{topic.category}</div>
          <span className="weak-card-badge" style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.label}
          </span>
        </div>
        <div className="weak-card-pct" style={{ color: cfg.color }}>
          {topic.accuracy?.toFixed(0)}%
        </div>
      </div>
      <p className="weak-card-msg">{topic.message}</p>
      <div className="progress-bar" style={{ marginTop: 10 }}>
        <div
          className="progress-fill"
          style={{ width: `${topic.accuracy}%`, background: cfg.color }}
        />
      </div>
    </div>
  )
}

function InsightMessage({ msg }) {
  const emoji = msg.startsWith('🚀') ? 'success'
    : msg.startsWith('📈') ? 'info'
    : msg.startsWith('⚠') ? 'warning'
    : 'neutral'

  const colors = {
    success: { bg: '#e6fff1', color: '#2ed573', border: '#2ed573' },
    info:    { bg: '#eef2ff', color: '#5352ed', border: '#5352ed' },
    warning: { bg: '#fff8e6', color: '#ffa502', border: '#ffa502' },
    neutral: { bg: 'var(--surface-2)', color: 'var(--text-2)', border: 'var(--border)' },
  }
  const c = colors[emoji]

  return (
    <div style={{
      padding: '12px 16px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius-sm)',
      fontSize: 14,
      color: c.color,
      fontWeight: 500,
      lineHeight: 1.5,
    }}>
      {msg}
    </div>
  )
}

const RadarTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '8px 12px', fontSize: 13,
      }}>
        <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>
          {payload[0].payload.subject}
        </p>
        <p style={{ color: 'var(--primary)' }}>Mastery: {payload[0].value?.toFixed(1)}%</p>
      </div>
    )
  }
  return null
}

export default function InsightsPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false
    InsightsAPI.get()
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Build radar chart data from topic profile
  const radarData = (data?.topic_profile || []).map(t => ({
    subject:  t.category.replace('Computer Science', 'CS'),
    mastery:  t.mastery,
    fullMark: 100,
  }))

  // Build bar data from topic profile
  const barData = (data?.topic_profile || []).map((t, i) => ({
    category: t.category.replace('Computer Science', 'CS'),
    accuracy: t.accuracy,
    color:    SUBJECT_COLORS[i % SUBJECT_COLORS.length],
  }))

  return (
    <AppShell title="ML Insights" subtitle="AI-powered learning analytics and weak topic detection">

      {error && (
        <div className="error-banner mb-6">
          <i className="ri-error-warning-line" /> {error}
        </div>
      )}

      {/* ── Progress Messages ─────────────────────────────────────────────── */}
      {!loading && data?.improvement_messages?.length > 0 && (
        <div className="card insights-section mb-6">
          <h3 className="insights-section-title">
            <i className="ri-lightbulb-flash-line" /> Personalised Insights
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.improvement_messages.map((msg, i) => (
              <InsightMessage key={i} msg={msg} />
            ))}
          </div>
        </div>
      )}

      {/* ── Weak Topics ───────────────────────────────────────────────────── */}
      {!loading && (
        <div className="insights-grid mb-6">
          <div className="card insights-section">
            <h3 className="insights-section-title">
              <i className="ri-alarm-warning-line" style={{ color: 'var(--danger)' }} />
              Weak Topics
              {data?.weak_topics?.length > 0 && (
                <span className="insights-badge danger">{data.weak_topics.length}</span>
              )}
            </h3>

            {loading ? (
              [1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: 100, marginBottom: 10, borderRadius: 8 }} />
              ))
            ) : data?.weak_topic_details?.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 16px' }}>
                <i className="ri-checkbox-circle-line" style={{ color: 'var(--success)' }} />
                <h3 style={{ fontSize: 15 }}>No weak topics!</h3>
                <p style={{ fontSize: 13 }}>You're performing well across all subjects.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(data?.weak_topic_details || []).map((t, i) => (
                  <WeakTopicCard key={i} topic={t} />
                ))}
              </div>
            )}
          </div>

          {/* ── Radar Chart ─────────────────────────────────────────────── */}
          <div className="card insights-section">
            <h3 className="insights-section-title">
              <i className="ri-radar-line" /> Skill Radar
            </h3>
            {loading ? (
              <div className="skeleton" style={{ height: 280 }} />
            ) : radarData.length < 3 ? (
              <div className="empty-state" style={{ padding: '40px 16px' }}>
                <i className="ri-radar-line" />
                <p style={{ fontSize: 13 }}>Complete quizzes in 3+ topics to see your radar chart.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 11, fill: 'var(--text-2)' }}
                  />
                  <Radar
                    dataKey="mastery"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip content={<RadarTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ── Full Topic Profile Table ───────────────────────────────────────── */}
      {!loading && (data?.topic_profile?.length || 0) > 0 && (
        <div className="card mb-6">
          <div style={{ padding: '20px 24px 0' }}>
            <h3 className="insights-section-title">
              <i className="ri-bar-chart-box-line" /> Topic Mastery Breakdown
            </h3>
          </div>
          <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(data?.topic_profile || []).map((t, i) => (
              <div key={i}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{t.category}</span>
                    {t.is_weak && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, background: 'var(--danger-bg)',
                        color: 'var(--danger)', padding: '2px 8px', borderRadius: 99,
                        textTransform: 'uppercase', letterSpacing: 0.4,
                      }}>
                        Weak
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-3)' }}>{t.quizzes_taken} quiz{t.quizzes_taken !== 1 ? 'zes' : ''}</span>
                    <span style={{
                      fontWeight: 700,
                      color: t.improvement > 0 ? 'var(--success)'
                        : t.improvement < 0 ? 'var(--danger)'
                        : 'var(--text-3)',
                    }}>
                      {t.improvement > 0 ? '+' : ''}{t.improvement?.toFixed(1)}%
                    </span>
                    <span style={{ fontWeight: 700, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}>
                      {t.mastery?.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${t.mastery}%`,
                      background: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading skeletons ─────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-md)' }} />
          <div className="insights-grid">
            <div className="skeleton" style={{ height: 340, borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton" style={{ height: 340, borderRadius: 'var(--radius-md)' }} />
          </div>
        </div>
      )}
    </AppShell>
  )
}
