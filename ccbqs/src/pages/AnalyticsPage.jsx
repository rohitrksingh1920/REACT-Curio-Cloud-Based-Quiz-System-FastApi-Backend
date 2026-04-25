import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import AppShell from '../components/layout/AppShell'
import { AnalyticsAPI } from '../api'
import './AnalyticsPage.css'

const SUBJECT_COLORS = [
  '#5352ed','#2ed573','#ffa502','#ff4757','#00d2ff','#a29bfe','#fd79a8'
]

function StatCard({ icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div className="card stat-card">
      <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
        <i className={icon} />
      </div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', padding: '10px 14px',
        boxShadow: 'var(--shadow-md)', fontSize: 13,
      }}>
        <p style={{ color: 'var(--text-2)', marginBottom: 4 }}>{label}</p>
        <p style={{ color: 'var(--primary)', fontWeight: 700 }}>
          {payload[0].value}%
        </p>
      </div>
    )
  }
  return null
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    AnalyticsAPI.get()
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const trendData = (data?.score_trend || []).map(p => ({
    date: new Date(p.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    score: p.score_pct,
  }))

  const subjectData = (data?.subject_performance || []).map((s, i) => ({
    category: s.category.replace('Computer Science', 'CS'),
    score: s.avg_score,
    color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
  }))

  return (
    <AppShell title="Analytics" subtitle="Your performance overview and insights">
      {error && <div className="error-banner mb-6"><i className="ri-error-warning-line" /> {error}</div>}

      {/* Summary Stats */}
      <div className="grid-4 mb-6">
        {loading ? (
          [1,2,3,4].map(i => (
            <div key={i} className="card stat-card">
              <div className="skeleton" style={{ width: 50, height: 50, borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
              <div className="stat-body">
                <div className="skeleton" style={{ height: 13, width: '60%', marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 28, width: '40%' }} />
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard icon="ri-percent-line"    iconBg="#eef2ff" iconColor="var(--primary)"  label="Average Score"   value={`${data?.avg_score ?? 0}%`}    sub="All-time avg" />
            <StatCard icon="ri-survey-line"      iconBg="#e6fff1" iconColor="var(--success)"  label="Quizzes Taken"   value={data?.quizzes_taken ?? 0}       sub="Completed" />
            <StatCard icon="ri-checkbox-circle-line" iconBg="#fff8e6" iconColor="var(--warning)" label="Pass Rate"   value={`${data?.pass_rate ?? 0}%`}     sub="≥ 60% to pass" />
            <StatCard icon="ri-star-line"        iconBg="#fff0f5" iconColor="#ff4757"          label="Total Points"   value={data?.total_points ?? 0}        sub="Accumulated" />
          </>
        )}
      </div>

      {data?.quizzes_taken === 0 && !loading ? (
        <div className="card">
          <div className="empty-state">
            <i className="ri-bar-chart-box-line" />
            <h3>No analytics yet</h3>
            <p>Complete some quizzes to see your performance data here.</p>
          </div>
        </div>
      ) : (
        <div className="analytics-charts">
          {/* Score Trend */}
          <div className="card analytics-chart-card">
            <div className="analytics-chart-header">
              <div>
                <h3>Score Trend</h3>
                <p>Your quiz scores over time</p>
              </div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 260 }} />
            ) : trendData.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 24px' }}>
                <i className="ri-line-chart-line" />
                <p>Not enough data yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={{ fill: 'var(--primary)', r: 4, strokeWidth: 2, stroke: 'var(--surface)' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Subject Performance */}
          <div className="card analytics-chart-card">
            <div className="analytics-chart-header">
              <div>
                <h3>Performance by Subject</h3>
                <p>Average score per category</p>
              </div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 260 }} />
            ) : subjectData.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 24px' }}>
                <i className="ri-bar-chart-box-line" />
                <p>No subject data yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={subjectData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {subjectData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Subject Detail List */}
          {!loading && subjectData.length > 0 && (
            <div className="card analytics-chart-card" style={{ gridColumn: '1 / -1' }}>
              <div className="analytics-chart-header">
                <div>
                  <h3>Subject Breakdown</h3>
                  <p>Detailed performance per subject</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {subjectData.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{s.category}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.score}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${s.score}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}
