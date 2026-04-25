import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import QuizCard from '../components/quiz/QuizCard'
import { DashboardAPI } from '../api'
import { useAuth } from '../context/AuthContext'

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

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: 22, height: 220 }}>
      <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 16, width: '55%', marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 20 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton" style={{ height: 30, width: '40%' }} />
        <div className="skeleton" style={{ height: 30, width: '30%' }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, isTeacher } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [active, setActive] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [s, a, u] = await Promise.all([
          DashboardAPI.getStats(),
          DashboardAPI.getActiveQuizzes(),
          DashboardAPI.getUpcomingQuizzes(4),
        ])
        if (!cancelled) { setStats(s); setActive(a); setUpcoming(u) }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const firstName = user?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <AppShell title={`${greeting}, ${firstName}! 👋`} subtitle="Here's what's happening today">
      {error && (
        <div className="error-banner mb-6">
          <i className="ri-error-warning-line" /> {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid-3 mb-6">
        {loading ? (
          [1,2,3].map(i => (
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
            <StatCard
              icon="ri-survey-line"
              iconBg="#eef2ff" iconColor="var(--primary)"
              label={isTeacher ? 'Total Quizzes Created' : 'Enrolled Quizzes'}
              value={stats?.total_quizzes ?? 0}
              sub={isTeacher ? 'All time' : 'Assigned to you'}
            />
            <StatCard
              icon="ri-group-line"
              iconBg="#e6fff1" iconColor="var(--success)"
              label={isTeacher ? 'Total Participants' : 'Completed Quizzes'}
              value={stats?.total_participants ?? 0}
              sub="Unique students"
            />
            <StatCard
              icon="ri-bar-chart-2-line"
              iconBg="#fff8e6" iconColor="var(--warning)"
              label="Average Score"
              value={`${stats?.avg_score ?? 0}%`}
              sub="Across all attempts"
            />
          </>
        )}
      </div>

      {/* Active Quizzes */}
      <div style={{ marginBottom: 32 }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 style={{ fontSize: 18 }}>Active Quizzes</h2>
            <p style={{ fontSize: 13 }}>Ready to be taken now</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/my-quizzes')}>
            View All <i className="ri-arrow-right-line" />
          </button>
        </div>

        {loading ? (
          <div className="grid-auto">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : active.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <i className="ri-survey-line" />
              <h3>No active quizzes</h3>
              <p>{isTeacher ? 'Create a quiz to get started.' : 'No quizzes have been assigned to you yet.'}</p>
              {isTeacher && (
                <button className="btn btn-primary mt-4" onClick={() => navigate('/create-quiz')}>
                  <i className="ri-add-line" /> Create Quiz
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid-auto">
            {active.map(q => <QuizCard key={q.id} quiz={q} />)}
          </div>
        )}
      </div>

      {/* Upcoming Quizzes */}
      {(loading || upcoming.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 style={{ fontSize: 18 }}>Upcoming Quizzes</h2>
              <p style={{ fontSize: 13 }}>Scheduled for later</p>
            </div>
          </div>
          {loading ? (
            <div className="grid-auto">
              {[1,2].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid-auto">
              {upcoming.map(q => <QuizCard key={q.id} quiz={q} />)}
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}
