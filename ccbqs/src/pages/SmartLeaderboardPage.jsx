



import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
// import { SmartLeaderboardAPI } from '../utils/mlApi'
import { SmartLeaderboardAPI } from '../api/ml'

import { QuizAPI } from '../api'
import { formatCompactIST } from '../utils/dateUtils'
import './SmartLeaderboardPage.css'

function Avatar({ name, picture, size = 36 }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  if (picture) {
    return (
      <img
        src={picture} alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--primary)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700,
      fontFamily: 'var(--font-display)', flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function ScoreBar({ value, max = 100, color = 'var(--primary)', label }) {
  return (
    <div style={{ flex: 1, minWidth: 60 }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className="progress-bar" style={{ flex: 1, height: 5 }}>
          <div
            className="progress-fill"
            style={{ width: `${Math.min(100, value)}%`, background: color }}
          />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>
          {value?.toFixed(0)}
        </span>
      </div>
    </div>
  )
}

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function SmartLeaderboardPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [quizList,  setQuizList]  = useState([])
  const [selected,  setSelected]  = useState(id || '')
  const [viewMode,  setViewMode]  = useState('smart') // 'smart' | 'classic'

  useEffect(() => {
    QuizAPI.list().then(d => {
      const list = Array.isArray(d) ? d : d?.quizzes || []
      setQuizList(list)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    setError(null)
    SmartLeaderboardAPI.get(selected)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [selected])

  return (
    <AppShell title="Smart Leaderboard" subtitle="ML-powered composite ranking — score, consistency & improvement">

      {/* Quiz picker */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <i className="ri-trophy-line" style={{ fontSize: 20, color: 'var(--primary)' }} />
          <label style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>Select Quiz:</label>
          <select
            value={selected}
            onChange={e => { setSelected(e.target.value); navigate(`/smart-leaderboard/${e.target.value}`) }}
            style={{ maxWidth: 360 }}
          >
            <option value="">— Choose a quiz —</option>
            {quizList.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
          </select>

          {selected && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button
                className={`filter-chip${viewMode === 'smart' ? ' active' : ''}`}
                onClick={() => setViewMode('smart')}
              >
                <i className="ri-ai-generate" /> Smart Rank
              </button>
              <button
                className={`filter-chip${viewMode === 'classic' ? ' active' : ''}`}
                onClick={() => setViewMode('classic')}
              >
                Classic Rank
              </button>
            </div>
          )}
        </div>
      </div>

      {!selected ? (
        <div className="card">
          <div className="empty-state">
            <i className="ri-trophy-line" />
            <h3>Select a quiz</h3>
            <p>Pick a quiz above to see the smart leaderboard.</p>
          </div>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      ) : error ? (
        <div className="error-banner"><i className="ri-error-warning-line" /> {error}</div>
      ) : data?.total_participants === 0 ? (
        <div className="card">
          <div className="empty-state">
            <i className="ri-user-search-line" />
            <h3>No attempts yet</h3>
            <p>No one has completed this quiz yet.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Formula banner */}
          {viewMode === 'smart' && (
            <div className="slb-formula-banner mb-6">
              <i className="ri-functions" />
              <span>
                <strong>Composite Score</strong> = 0.5 × Avg Score + 0.3 × Consistency + 0.2 × Improvement
              </span>
            </div>
          )}

          {/* Info bar */}
          <div className="card slb-info-bar mb-6">
            <div className="flex items-center gap-3">
              <i className="ri-survey-line" style={{ color: 'var(--text-3)' }} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{data?.quiz_title}</span>
            </div>
            <div className="flex items-center gap-3">
              <i className="ri-group-line" style={{ color: 'var(--text-3)' }} />
              <span style={{ fontSize: 14 }}>{data?.total_participants} participants</span>
            </div>
            {data?.current_user_rank && (
              <div className="flex items-center gap-3" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                <i className="ri-user-star-line" />
                <span>Your rank: #{data.current_user_rank}</span>
              </div>
            )}
          </div>

          {/* Entries */}
          <div className="slb-list">
            {(data?.entries || []).map(entry => (
              <div
                key={entry.user_id}
                className={`slb-row card${entry.is_current_user ? ' slb-me' : ''}`}
              >
                {/* Rank */}
                <div className="slb-rank">
                  {MEDAL[entry.rank] || (
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)' }}>
                      #{entry.rank}
                    </span>
                  )}
                </div>

                {/* User */}
                <div className="slb-user">
                  <Avatar name={entry.full_name} picture={entry.profile_picture} size={38} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {entry.full_name}
                      {entry.is_current_user && (
                        <span style={{
                          marginLeft: 8, fontSize: 10, fontWeight: 700,
                          background: 'var(--primary)', color: '#fff',
                          padding: '2px 6px', borderRadius: 99,
                        }}>YOU</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {entry.attempt_count} attempt{entry.attempt_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Score bars (smart mode) */}
                {viewMode === 'smart' ? (
                  <div className="slb-bars">
                    <ScoreBar value={entry.avg_score}         color="#5352ed" label="Avg Score" />
                    <ScoreBar value={entry.consistency_score} color="#2ed573" label="Consistency" />
                    <ScoreBar value={entry.improvement_score} color="#ffa502" label="Improvement" />
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    <div className="progress-bar" style={{ height: 6 }}>
                      <div className="progress-fill" style={{ width: `${entry.avg_score}%` }} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                      {entry.avg_score?.toFixed(1)}% avg score
                    </div>
                  </div>
                )}

                {/* Composite score */}
                <div className="slb-composite">
                  <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--primary)' }}>
                    {entry.composite_score?.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    composite
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  )
}
