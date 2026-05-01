




import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
// import { RecommendAPI } from '../utils/mlApi'
import { RecommendAPI } from '../api/ml'


export default function RecommendationsWidget() {
  const navigate = useNavigate()
  const [recs,    setRecs]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    RecommendAPI.get(4)
      .then(d => { if (!cancelled) setRecs(Array.isArray(d) ? d : []) })
      .catch(() => { if (!cancelled) setRecs([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (!loading && recs.length === 0) return null

  return (
    <div style={{ marginBottom: 32 }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: 'linear-gradient(135deg, #5352ed, #a29bfe)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              ✨ Recommended for You
            </span>
          </h2>
          <p style={{ fontSize: 13 }}>ML-powered suggestions based on your learning profile</p>
        </div>
      </div>

      {loading ? (
        <div className="grid-auto">
          {[1,2,3].map(i => (
            <div key={i} className="card" style={{ padding: 20, height: 130 }}>
              <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 18, width: '70%', marginBottom: 14 }} />
              <div className="skeleton" style={{ height: 13, width: '85%' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid-auto">
          {recs.map(rec => (
            <div
              key={rec.quiz_id}
              className="card"
              style={{
                padding: 20,
                cursor: 'pointer',
                border: '1.5px solid var(--border)',
                transition: 'all 0.2s',
                position: 'relative',
                overflow: 'hidden',
              }}
              onClick={() => navigate(`/take-quiz/${rec.quiz_id}`)}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)'
                e.currentTarget.style.boxShadow   = 'var(--shadow-md)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.boxShadow   = 'var(--shadow-xs)'
              }}
            >
              {/* ML badge */}
              <div style={{
                position: 'absolute', top: 12, right: 12,
                background: 'linear-gradient(135deg,#5352ed,#a29bfe)',
                color: '#fff', fontSize: 9, fontWeight: 800,
                padding: '3px 7px', borderRadius: 99,
                letterSpacing: 0.5, textTransform: 'uppercase',
              }}>
                ML Pick
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {rec.category}
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, paddingRight: 48 }}>
                {rec.title}
              </h4>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: 'var(--primary)',
                background: 'var(--primary-light)',
                padding: '4px 10px', borderRadius: 99,
                width: 'fit-content', marginBottom: 10,
              }}>
                <i className="ri-lightbulb-line" />
                {rec.reason}
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-3)' }}>
                <span><i className="ri-timer-line" /> {rec.duration_mins} min</span>
                <span><i className="ri-medal-line" /> {rec.total_points} pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
