


import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { formatDateIST, formatTimeIST } from '../../utils/dateUtils'  // ← IST utils

const STATUS_CONFIG = {
  active:    { cls: 'badge-active',    label: 'Active' },
  upcoming:  { cls: 'badge-upcoming',  label: 'Upcoming' },
  completed: { cls: 'badge-completed', label: 'Completed' },
  draft:     { cls: 'badge-draft',     label: 'Draft' },
}

export default function QuizCard({ quiz, onDelete, showDelete = false }) {
  const navigate = useNavigate()
  const { isTeacher } = useAuth()
  const cfg = STATUS_CONFIG[quiz.status] || STATUS_CONFIG.upcoming

  function handleAction() {
    if (quiz.is_attempted || quiz.status === 'completed') {
      navigate(`/leaderboard/${quiz.id}`)
    } else if (quiz.status === 'active') {
      navigate(`/take-quiz/${quiz.id}`)
    }
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="quiz-card-inner">
        <div className="quiz-card-header">
          <span className="quiz-card-category">{quiz.category}</span>
          <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
        </div>

        <h3 className="quiz-card-title">{quiz.title}</h3>

        <div className="quiz-card-meta">
          {quiz.scheduled_date && (
            <div className="quiz-card-meta-item">
              <i className="ri-calendar-line" />
              {/* formatDateIST renders the date in IST locale */}
              <span>{formatDateIST(quiz.scheduled_date)}</span>
            </div>
          )}
          {quiz.scheduled_time && (
            <div className="quiz-card-meta-item">
              <i className="ri-time-line" />
              {/* formatTimeIST renders HH:MM as 12-hr IST */}
              <span>{formatTimeIST(quiz.scheduled_time)} IST · {quiz.duration_mins} min</span>
            </div>
          )}
          {!quiz.scheduled_time && (
            <div className="quiz-card-meta-item">
              <i className="ri-timer-line" />
              <span>{quiz.duration_mins} minutes · {quiz.total_points} pts</span>
            </div>
          )}
          <div className="quiz-card-meta-item">
            <i className="ri-user-line" />
            <span>By {quiz.creator_name}</span>
          </div>
        </div>

        <div className="quiz-card-footer">
          <div className="quiz-card-enrolled">
            <i className="ri-group-line" />
            {quiz.enrolled_count || 0} enrolled
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {showDelete && isTeacher && onDelete && (
              <button
                className="btn btn-danger btn-sm"
                onClick={(e) => { e.stopPropagation(); onDelete(quiz.id) }}
              >
                <i className="ri-delete-bin-line" />
              </button>
            )}

            {(quiz.is_attempted || quiz.status === 'completed') ? (
              <button className="btn btn-secondary btn-sm" onClick={handleAction}>
                <i className="ri-trophy-line" /> Leaderboard
              </button>
            ) : quiz.status === 'upcoming' ? (
              <button className="btn btn-secondary btn-sm" disabled>
                <i className="ri-lock-line" /> Not Started
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={handleAction}>
                <i className="ri-play-line" /> Start Quiz
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
