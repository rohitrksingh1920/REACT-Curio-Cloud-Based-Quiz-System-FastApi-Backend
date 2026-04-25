import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { LeaderboardAPI, QuizAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import './LeaderboardPage.css'

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }
const RANK_CLASS = { 1: 'lb-rank-1', 2: 'lb-rank-2', 3: 'lb-rank-3' }

function Avatar({ name, picture, size = 38 }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  if (picture) {
    return (
      <img
        src={picture}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
        }}
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

function TopThreeCard({ entry }) {
  const medals = ['🥇', '🥈', '🥉']
  const colors = ['#f9c846', '#b0b8c1', '#cd7f32']
  const sizes = [72, 60, 60]

  return (
    <div className={`lb-top-card ${entry.is_current_user ? 'lb-me' : ''}`}>
      <div className="lb-top-medal" style={{ color: colors[entry.rank - 1] }}>
        {medals[entry.rank - 1]}
      </div>
      <Avatar name={entry.full_name} picture={entry.profile_picture} size={sizes[entry.rank - 1]} />
      <div className="lb-top-name">{entry.full_name}</div>
      <div className="lb-top-score">{entry.score_pct}%</div>
      <div className="lb-top-detail">
        {entry.correct_count}/{entry.total_questions} correct
      </div>
      {entry.is_current_user && (
        <span style={{
          background: 'var(--primary)', color: '#fff',
          fontSize: 10, fontWeight: 700, padding: '2px 8px',
          borderRadius: 99, marginTop: 4,
        }}>YOU</span>
      )}
    </div>
  )
}

export default function LeaderboardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quizList, setQuizList] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(id || '')

  // Load quiz list for picker
  useEffect(() => {
    QuizAPI.list().then(d => {
      const list = Array.isArray(d) ? d : d?.quizzes || []
      setQuizList(list)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedQuiz) return
    setLoading(true)
    setError(null)
    LeaderboardAPI.get(selectedQuiz)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedQuiz])

  const top3 = data?.entries?.slice(0, 3) || []
  const rest = data?.entries?.slice(3) || []

  function formatDate(dt) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <AppShell title="Leaderboard" subtitle="See how everyone performed">

      {/* Quiz Picker */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <i className="ri-trophy-line" style={{ fontSize: 20, color: 'var(--primary)' }} />
          <label style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
            Select Quiz:
          </label>
          <select
            value={selectedQuiz}
            onChange={e => { setSelectedQuiz(e.target.value); navigate(`/leaderboard/${e.target.value}`) }}
            style={{ maxWidth: 360 }}
          >
            <option value="">— Choose a quiz —</option>
            {quizList.map(q => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedQuiz ? (
        <div className="card">
          <div className="empty-state">
            <i className="ri-trophy-line" />
            <h3>Select a quiz</h3>
            <p>Pick a quiz above to view its leaderboard.</p>
          </div>
        </div>
      ) : loading ? (
        <LeaderboardSkeleton />
      ) : error ? (
        <div className="error-banner"><i className="ri-error-warning-line" /> {error}</div>
      ) : data?.total_participants === 0 ? (
        <div className="card">
          <div className="empty-state">
            <i className="ri-user-search-line" />
            <h3>No attempts yet</h3>
            <p>No one has completed this quiz yet. Be the first!</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header Info */}
          <div className="lb-info-bar card mb-6">
            <div className="lb-info-item">
              <i className="ri-survey-line" />
              <span>{data.quiz_title}</span>
            </div>
            <div className="lb-info-item">
              <i className="ri-group-line" />
              <span>{data.total_participants} participants</span>
            </div>
            {data.current_user_rank && (
              <div className="lb-info-item" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                <i className="ri-user-star-line" />
                <span>Your rank: #{data.current_user_rank}</span>
              </div>
            )}
          </div>

          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <div className="lb-podium mb-6">
              {/* Reorder: 2nd, 1st, 3rd */}
              {[top3[1], top3[0], top3[2]].filter(Boolean).map(entry => (
                <TopThreeCard key={entry.rank} entry={entry} />
              ))}
            </div>
          )}

          {/* Rest of leaderboard */}
          {rest.length > 0 && (
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Student</th>
                      <th>Score</th>
                      <th>Correct</th>
                      <th>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rest.map(entry => (
                      <tr
                        key={entry.user_id}
                        className={entry.is_current_user ? 'lb-me-row' : ''}
                      >
                        <td>
                          <span className="lb-rank-badge">#{entry.rank}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar name={entry.full_name} picture={entry.profile_picture} size={32} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.full_name}</div>
                              {entry.is_current_user && (
                                <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>YOU</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            fontWeight: 700, fontSize: 15,
                            color: entry.score_pct >= 60 ? 'var(--success)' : 'var(--danger)',
                          }}>
                            {entry.score_pct}%
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-2)', fontSize: 13 }}>
                          {entry.correct_count}/{entry.total_questions}
                        </td>
                        <td style={{ color: 'var(--text-3)', fontSize: 12 }}>
                          {formatDate(entry.completed_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  )
}

function LeaderboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="skeleton" style={{ height: 60, borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-md)' }} />
    </div>
  )
}
