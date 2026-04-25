import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QuizAPI } from '../api'
import { useToast } from '../context/ToastContext'
import './TakeQuizPage.css'

export default function TakeQuizPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [answers, setAnswers] = useState({}) // { questionId: optionId }
  const [current, setCurrent] = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await QuizAPI.take(id)
        if (!cancelled) {
          setQuiz(data)
          setTimeLeft((data.duration_mins || 30) * 60)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (timeLeft === null || result) return
    if (timeLeft <= 0) { handleSubmit(true); return }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timeLeft, result])

  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return
    if (!auto) {
      const unanswered = quiz?.questions?.filter(q => !answers[q.id]).length || 0
      if (unanswered > 0) {
        if (!window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return
      }
    }
    clearTimeout(timerRef.current)
    setSubmitting(true)
    try {
      const formatted = Object.entries(answers).map(([question_id, selected_option_id]) => ({
        question_id: Number(question_id),
        selected_option_id: Number(selected_option_id),
      }))
      const res = await QuizAPI.submit(id, formatted)
      setResult(res)
    } catch (e) {
      toast(e.message, 'error')
      setSubmitting(false)
    }
  }, [id, answers, quiz, submitting])

  function formatTime(secs) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  const isUrgent = timeLeft !== null && timeLeft <= 60

  if (loading) return (
    <div className="quiz-take-loading">
      <div className="spinner spinner-dark" style={{ width: 40, height: 40, borderWidth: 3 }} />
      <p>Loading quiz...</p>
    </div>
  )

  if (error) return (
    <div className="quiz-take-loading">
      <div className="error-banner" style={{ maxWidth: 400 }}>
        <i className="ri-error-warning-line" /> {error}
      </div>
      <button className="btn btn-secondary mt-4" onClick={() => navigate('/my-quizzes')}>
        Back to My Quizzes
      </button>
    </div>
  )

  if (result) return <QuizResult result={result} quiz={quiz} onLeaderboard={() => navigate(`/leaderboard/${id}`)} onDashboard={() => navigate('/dashboard')} />

  const questions = quiz?.questions || []
  const q = questions[current]
  const answered = Object.keys(answers).length
  const progress = questions.length ? (answered / questions.length) * 100 : 0

  return (
    <div className="quiz-take-page">
      {/* Header */}
      <div className="quiz-take-header">
        <div className="quiz-take-title">
          <h2>{quiz?.title}</h2>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{quiz?.category}</span>
        </div>
        <div className={`quiz-timer${isUrgent ? ' urgent' : ''}`}>
          <i className="ri-timer-line" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <div className="quiz-take-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
          {answered}/{questions.length} answered
        </span>
      </div>

      <div className="quiz-take-body">
        {/* Question Nav */}
        <div className="question-nav">
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              className={`q-nav-btn${i === current ? ' active' : ''}${answers[qq.id] ? ' answered' : ''}`}
              onClick={() => setCurrent(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question */}
        {q && (
          <div className="question-card">
            <div className="question-card-header">
              <span className="question-card-num">Question {current + 1} of {questions.length}</span>
            </div>
            <p className="question-card-text">{q.text}</p>
            <div className="options-list">
              {(q.options || []).map(opt => (
                <button
                  key={opt.id}
                  className={`option-btn${answers[q.id] === opt.id ? ' selected' : ''}`}
                  onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                >
                  <span className="option-letter">
                    {String.fromCharCode(65 + (q.options.indexOf(opt)))}
                  </span>
                  <span>{opt.text}</span>
                </button>
              ))}
            </div>

            <div className="question-nav-btns">
              <button
                className="btn btn-secondary"
                disabled={current === 0}
                onClick={() => setCurrent(c => c - 1)}
              >
                <i className="ri-arrow-left-line" /> Previous
              </button>
              {current < questions.length - 1 ? (
                <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)}>
                  Next <i className="ri-arrow-right-line" />
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => handleSubmit(false)} disabled={submitting}>
                  {submitting ? <><span className="spinner" /> Submitting...</> : <><i className="ri-check-line" /> Submit Quiz</>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function QuizResult({ result, quiz, onLeaderboard, onDashboard }) {
  const passed = result.passed
  return (
    <div className="quiz-result-page">
      <div className="quiz-result-card">
        <div className={`result-icon-wrap ${passed ? 'pass' : 'fail'}`}>
          <i className={`ri-${passed ? 'trophy' : 'emotion-sad'}-line`} />
        </div>
        <h2>{passed ? '🎉 Quiz Completed!' : 'Quiz Completed'}</h2>
        <p style={{ color: 'var(--text-2)', marginBottom: 32 }}>
          {passed ? "Great job! You passed the quiz." : "Keep practicing — you'll get it next time!"}
        </p>

        <div className="result-stats">
          <div className="result-stat">
            <div className="result-stat-val">{result.score_pct?.toFixed(1)}%</div>
            <div className="result-stat-label">Score</div>
          </div>
          <div className="result-stat">
            <div className="result-stat-val">{result.correct_count}/{result.total_questions}</div>
            <div className="result-stat-label">Correct</div>
          </div>
          <div className="result-stat">
            <div className="result-stat-val">{result.score?.toFixed(0)}</div>
            <div className="result-stat-label">Points</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
          <button className="btn btn-secondary" onClick={onDashboard}>
            <i className="ri-dashboard-line" /> Dashboard
          </button>
          <button className="btn btn-primary" onClick={onLeaderboard}>
            <i className="ri-trophy-line" /> View Leaderboard
          </button>
        </div>
      </div>
    </div>
  )
}
