// import { useState, useEffect, useRef, useCallback } from 'react'
// import { useParams, useNavigate } from 'react-router-dom'
// import { QuizAPI } from '../api'
// import { useToast } from '../context/ToastContext'
// import './TakeQuizPage.css'

// //  Error state component 
// function QuizError({ message, onBack }) {
//   // Detect "not yet available" error specifically to show a countdown-style UI
//   const isNotAvailable = message?.toLowerCase().includes('not yet available')
//     || message?.toLowerCase().includes('starts at')

//   return (
//     <div className="quiz-take-loading">
//       <div style={{
//         background: 'var(--surface)',
//         border: '1px solid var(--border)',
//         borderRadius: 'var(--radius-lg)',
//         padding: '48px 40px',
//         textAlign: 'center',
//         maxWidth: 480,
//         width: '100%',
//         boxShadow: 'var(--shadow-md)',
//       }}>
//         <div style={{
//           width: 64, height: 64,
//           borderRadius: '50%',
//           background: isNotAvailable ? 'var(--primary-light)' : 'var(--danger-bg)',
//           color: isNotAvailable ? 'var(--primary)' : 'var(--danger)',
//           display: 'flex', alignItems: 'center', justifyContent: 'center',
//           fontSize: 28, margin: '0 auto 20px',
//         }}>
//           <i className={isNotAvailable ? 'ri-time-line' : 'ri-error-warning-line'} />
//         </div>

//         <h3 style={{ fontSize: 18, marginBottom: 10, color: 'var(--text-1)' }}>
//           {isNotAvailable ? 'Quiz Not Yet Available' : 'Unable to Load Quiz'}
//         </h3>

//         <p style={{
//           fontSize: 14, color: 'var(--text-2)',
//           lineHeight: 1.6, marginBottom: 28,
//         }}>
//           {message || 'An unexpected error occurred. Please try again.'}
//         </p>

//         <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
//           <button className="btn btn-secondary" onClick={onBack}>
//             <i className="ri-arrow-left-line" /> Back to My Quizzes
//           </button>
//           {!isNotAvailable && (
//             <button className="btn btn-primary" onClick={() => window.location.reload()}>
//               <i className="ri-refresh-line" /> Retry
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }

// //  Result screen 
// function QuizResult({ result, onLeaderboard, onDashboard }) {
//   const passed = result.passed
//   return (
//     <div className="quiz-result-page">
//       <div className="quiz-result-card">
//         <div className={`result-icon-wrap ${passed ? 'pass' : 'fail'}`}>
//           <i className={`ri-${passed ? 'trophy' : 'emotion-sad'}-line`} />
//         </div>
//         <h2 style={{ marginBottom: 6 }}>
//           {passed ? '🎉 Quiz Completed!' : 'Quiz Completed'}
//         </h2>
//         <p style={{ color: 'var(--text-2)', marginBottom: 32, fontSize: 14 }}>
//           {passed
//             ? 'Great job! You passed the quiz.'
//             : "Keep practising — you'll get it next time!"}
//         </p>

//         <div className="result-stats">
//           <div className="result-stat">
//             <div className="result-stat-val" style={{ color: passed ? 'var(--success)' : 'var(--danger)' }}>
//               {result.score_pct?.toFixed(1)}%
//             </div>
//             <div className="result-stat-label">Score</div>
//           </div>
//           <div className="result-stat">
//             <div className="result-stat-val">{result.correct_count}/{result.total_questions}</div>
//             <div className="result-stat-label">Correct</div>
//           </div>
//           <div className="result-stat">
//             <div className="result-stat-val">{result.score?.toFixed(0)}</div>
//             <div className="result-stat-label">Points</div>
//           </div>
//         </div>

//         <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
//           <button className="btn btn-secondary" onClick={onDashboard}>
//             <i className="ri-dashboard-line" /> Dashboard
//           </button>
//           <button className="btn btn-primary" onClick={onLeaderboard}>
//             <i className="ri-trophy-line" /> View Leaderboard
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }

// //  Main TakeQuiz page 
// export default function TakeQuizPage() {
//   const { id } = useParams()
//   const navigate = useNavigate()
//   const { toast } = useToast()

//   const [quiz, setQuiz]         = useState(null)
//   const [loading, setLoading]   = useState(true)
//   const [error, setError]       = useState(null)          // string | null
//   const [answers, setAnswers]   = useState({})            // { questionId: optionId }
//   const [current, setCurrent]   = useState(0)
//   const [timeLeft, setTimeLeft] = useState(null)
//   const [submitting, setSubmitting] = useState(false)
//   const [result, setResult]     = useState(null)
//   const timerRef = useRef(null)

//   //  Load quiz 
//   useEffect(() => {
//     let cancelled = false
//     async function load() {
//       setLoading(true)
//       setError(null)
//       try {
//         const data = await QuizAPI.take(id)
//         if (!cancelled) {
//           setQuiz(data)
//           setTimeLeft((data.duration_mins || 30) * 60)
//         }
//       } catch (e) {
//         if (!cancelled) setError(e.message)
//       } finally {
//         if (!cancelled) setLoading(false)
//       }
//     }
//     load()
//     return () => { cancelled = true }
//   }, [id])

//   //  Countdown timer 
//   useEffect(() => {
//     if (timeLeft === null || result || error) return
//     if (timeLeft <= 0) {
//       handleSubmit(true)
//       return
//     }
//     timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
//     return () => clearTimeout(timerRef.current)
//   }, [timeLeft, result, error])

//   //  Submit 
//   const handleSubmit = useCallback(async (auto = false) => {
//     if (submitting) return
//     if (!auto) {
//       const unanswered = quiz?.questions?.filter(q => !answers[q.id]).length || 0
//       if (unanswered > 0) {
//         if (!window.confirm(
//           `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`
//         )) return
//       }
//     }
//     clearTimeout(timerRef.current)
//     setSubmitting(true)
//     try {
//       const formatted = Object.entries(answers).map(([question_id, selected_option_id]) => ({
//         question_id: Number(question_id),
//         selected_option_id: Number(selected_option_id),
//       }))
//       const res = await QuizAPI.submit(id, formatted)
//       setResult(res)
//     } catch (e) {
//       // Duplicate submission — treat gracefully
//       if (e.message?.toLowerCase().includes('already')) {
//         toast('You have already submitted this quiz.', 'info')
//         navigate(`/leaderboard/${id}`)
//       } else {
//         toast(e.message || 'Submission failed. Please try again.', 'error')
//         setSubmitting(false)
//       }
//     }
//   }, [id, answers, quiz, submitting, navigate, toast])

//   //  Helpers 
//   function formatTime(secs) {
//     const m = Math.floor(secs / 60)
//     const s = secs % 60
//     return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
//   }

//   function selectAnswer(questionId, optionId) {
//     setAnswers(prev => ({ ...prev, [questionId]: optionId }))
//   }

//   //  Render states 
//   if (loading) {
//     return (
//       <div className="quiz-take-loading">
//         <div className="spinner spinner-dark" style={{ width: 44, height: 44, borderWidth: 3 }} />
//         <p style={{ color: 'var(--text-2)', marginTop: 12 }}>Loading quiz...</p>
//       </div>
//     )
//   }

//   if (error) {
//     return <QuizError message={error} onBack={() => navigate('/my-quizzes')} />
//   }

//   if (result) {
//     return (
//       <QuizResult
//         result={result}
//         onLeaderboard={() => navigate(`/leaderboard/${id}`)}
//         onDashboard={() => navigate('/dashboard')}
//       />
//     )
//   }

//   //  Quiz UI 
//   const questions = quiz?.questions || []
//   const q = questions[current]
//   const answered = Object.keys(answers).length
//   const progress = questions.length ? (answered / questions.length) * 100 : 0
//   const isUrgent = timeLeft !== null && timeLeft <= 60

//   return (
//     <div className="quiz-take-page">
//       {/*  Header  */}
//       <div className="quiz-take-header">
//         <div className="quiz-take-title">
//           <h2>{quiz?.title}</h2>
//           <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{quiz?.category}</span>
//         </div>
//         <div className={`quiz-timer${isUrgent ? ' urgent' : ''}`}>
//           <i className="ri-timer-line" />
//           {formatTime(timeLeft)}
//         </div>
//       </div>

//       {/*  Progress bar  */}
//       <div className="quiz-take-progress">
//         <div className="progress-bar" style={{ flex: 1 }}>
//           <div className="progress-fill" style={{ width: `${progress}%` }} />
//         </div>
//         <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
//           {answered}/{questions.length} answered
//         </span>
//       </div>

//       {/*  Body  */}
//       <div className="quiz-take-body">
//         {/* Question navigation grid */}
//         <div className="question-nav">
//           {questions.map((qq, i) => (
//             <button
//               key={qq.id}
//               className={[
//                 'q-nav-btn',
//                 i === current ? 'active' : '',
//                 answers[qq.id] ? 'answered' : '',
//               ].filter(Boolean).join(' ')}
//               onClick={() => setCurrent(i)}
//               title={`Question ${i + 1}${answers[qq.id] ? ' (answered)' : ''}`}
//             >
//               {i + 1}
//             </button>
//           ))}
//         </div>

//         {/* Current question */}
//         {q && (
//           <div className="question-card">
//             <div className="question-card-header">
//               <span className="question-card-num">
//                 Question {current + 1} of {questions.length}
//               </span>
//               {answers[q.id] && (
//                 <span style={{
//                   fontSize: 11, fontWeight: 700, color: 'var(--success)',
//                   background: 'var(--success-bg)', padding: '3px 10px',
//                   borderRadius: 99,
//                 }}>
//                   <i className="ri-check-line" /> Answered
//                 </span>
//               )}
//             </div>

//             <p className="question-card-text">{q.text}</p>

//             <div className="options-list">
//               {(q.options || []).map((opt, idx) => (
//                 <button
//                   key={opt.id}
//                   className={`option-btn${answers[q.id] === opt.id ? ' selected' : ''}`}
//                   onClick={() => selectAnswer(q.id, opt.id)}
//                 >
//                   <span className="option-letter">
//                     {String.fromCharCode(65 + idx)}
//                   </span>
//                   <span>{opt.text}</span>
//                 </button>
//               ))}
//             </div>

//             <div className="question-nav-btns">
//               <button
//                 className="btn btn-secondary"
//                 disabled={current === 0}
//                 onClick={() => setCurrent(c => c - 1)}
//               >
//                 <i className="ri-arrow-left-line" /> Previous
//               </button>
//               {current < questions.length - 1 ? (
//                 <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)}>
//                   Next <i className="ri-arrow-right-line" />
//                 </button>
//               ) : (
//                 <button
//                   className="btn btn-primary"
//                   onClick={() => handleSubmit(false)}
//                   disabled={submitting}
//                 >
//                   {submitting
//                     ? <><span className="spinner" /> Submitting...</>
//                     : <><i className="ri-check-line" /> Submit Quiz</>}
//                 </button>
//               )}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }














import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QuizAPI } from '../api'
// import { QuizMLAPI, AdaptiveAPI } from '../utils/mlApi'
import { QuizMLAPI, AdaptiveAPI } from '../api/ml'

import { useToast } from '../context/ToastContext'
import './TakeQuizPage.css'

// ── Error state ───────────────────────────────────────────────────────────────
function QuizError({ message, onBack }) {
  const isNotAvailable = message?.toLowerCase().includes('not yet available')
    || message?.toLowerCase().includes('starts at')
  return (
    <div className="quiz-take-loading">
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '48px 40px',
        textAlign: 'center', maxWidth: 480, width: '100%',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: isNotAvailable ? 'var(--primary-light)' : 'var(--danger-bg)',
          color: isNotAvailable ? 'var(--primary)' : 'var(--danger)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, margin: '0 auto 20px',
        }}>
          <i className={isNotAvailable ? 'ri-time-line' : 'ri-error-warning-line'} />
        </div>
        <h3 style={{ fontSize: 18, marginBottom: 10 }}>
          {isNotAvailable ? 'Quiz Not Yet Available' : 'Unable to Load Quiz'}
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 28 }}>
          {message || 'An unexpected error occurred.'}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onBack}>
            <i className="ri-arrow-left-line" /> Back to My Quizzes
          </button>
          {!isNotAvailable && (
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              <i className="ri-refresh-line" /> Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Result screen ─────────────────────────────────────────────────────────────
function QuizResult({ result, onLeaderboard, onSmartLeaderboard, onDashboard }) {
  const passed = result.passed
  return (
    <div className="quiz-result-page">
      <div className="quiz-result-card">
        <div className={`result-icon-wrap ${passed ? 'pass' : 'fail'}`}>
          <i className={`ri-${passed ? 'trophy' : 'emotion-sad'}-line`} />
        </div>
        <h2 style={{ marginBottom: 6 }}>
          {passed ? '🎉 Quiz Completed!' : 'Quiz Completed'}
        </h2>
        <p style={{ color: 'var(--text-2)', marginBottom: 32, fontSize: 14 }}>
          {passed ? 'Great job! You passed.' : "Keep practising — you'll get it!"}
        </p>

        <div className="result-stats">
          <div className="result-stat">
            <div className="result-stat-val"
              style={{ color: passed ? 'var(--success)' : 'var(--danger)' }}>
              {result.score_pct?.toFixed(1)}%
            </div>
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

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={onDashboard}>
            <i className="ri-dashboard-line" /> Dashboard
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onLeaderboard}>
            <i className="ri-trophy-line" /> Leaderboard
          </button>
          <button className="btn btn-primary btn-sm" onClick={onSmartLeaderboard}>
            <i className="ri-ai-generate" /> Smart Rank
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main TakeQuiz page (with timing + adaptive ordering) ──────────────────────
export default function TakeQuizPage() {
  const { id } = useParams()
  const navigate  = useNavigate()
  const { toast } = useToast()

  const [quiz,        setQuiz]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [answers,     setAnswers]     = useState({})    // { questionId: optionId }
  const [current,     setCurrent]     = useState(0)
  const [timeLeft,    setTimeLeft]    = useState(null)
  const [submitting,  setSubmitting]  = useState(false)
  const [result,      setResult]      = useState(null)

  // Timing tracking for ML (Feature 1 & 4)
  const [questionOrder,  setQuestionOrder]  = useState([]) // ordered question IDs
  const questionStartRef = useRef(null)                    // when current question was shown
  const timingsRef       = useRef({})                      // { questionId: { time, optionIndex } }
  const timerRef         = useRef(null)

  // ── Load quiz ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await QuizAPI.take(id)
        if (!cancelled) {
          setQuiz(data)
          setTimeLeft((data.duration_mins || 30) * 60)
          // Default order = as returned
          const defaultOrder = (data.questions || []).map(q => q.id)
          setQuestionOrder(defaultOrder)
          questionStartRef.current = Date.now()
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

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || result || error) return
    if (timeLeft <= 0) { handleSubmit(true); return }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timeLeft, result, error])

  // ── Record timing when question changes ─────────────────────────────────────
  function recordCurrentTiming(selectedOptionIdx = null) {
    const elapsed = (Date.now() - (questionStartRef.current || Date.now())) / 1000
    const questions = quiz?.questions || []
    const orderedQuestions = questionOrder
      .map(qid => questions.find(q => q.id === qid))
      .filter(Boolean)
    const currentQ = orderedQuestions[current]
    if (currentQ) {
      timingsRef.current[currentQ.id] = {
        time_taken:   Math.max(0.5, elapsed),
        option_index: selectedOptionIdx ?? -1,
      }
    }
    questionStartRef.current = Date.now()
  }

  function handleSelectAnswer(questionId, optionId, optionIndex) {
    recordCurrentTiming(optionIndex)
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  function handleNavigate(newIdx) {
    recordCurrentTiming()
    setCurrent(newIdx)
    questionStartRef.current = Date.now()
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return
    if (!auto) {
      const unanswered = quiz?.questions?.filter(q => !answers[String(q.id)]).length || 0
      if (unanswered > 0) {
        if (!window.confirm(
          `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`
        )) return
      }
    }
    clearTimeout(timerRef.current)
    recordCurrentTiming()
    setSubmitting(true)

    try {
      const formattedAnswers = Object.entries(answers).map(([qid, oid]) => ({
        question_id:       Number(qid),
        selected_option_id: Number(oid),
      }))

      // Build timings array for ML
      const questions = quiz?.questions || []
      const timingsPayload = questions
        .filter(q => timingsRef.current[q.id])
        .map(q => {
          const t = timingsRef.current[q.id]
          // Find option index selected
          const selOpt = q.options?.findIndex(o => o.id === answers[String(q.id)])
          return {
            question_id:  q.id,
            time_taken:   t.time_taken,
            option_index: selOpt >= 0 ? selOpt : (t.option_index ?? 0),
            is_correct:   false, // backend will determine correctness
          }
        })

      let res
      try {
        // Try ML-enhanced submit first (includes timings for adaptive + cheating detection)
        res = await QuizMLAPI.submitWithTimings(id, formattedAnswers, timingsPayload)
      } catch {
        // Fallback to standard submit if ML endpoint fails
        res = await QuizAPI.submit(id, formattedAnswers)
      }

      setResult(res)
    } catch (e) {
      if (e.message?.toLowerCase().includes('already')) {
        toast('You have already submitted this quiz.', 'info')
        navigate(`/leaderboard/${id}`)
      } else {
        toast(e.message || 'Submission failed. Please try again.', 'error')
        setSubmitting(false)
      }
    }
  }, [id, answers, quiz, submitting, navigate, toast])

  function formatTime(secs) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // ── Render guards ───────────────────────────────────────────────────────────
  if (loading) return (
    <div className="quiz-take-loading">
      <div className="spinner spinner-dark" style={{ width: 44, height: 44, borderWidth: 3 }} />
      <p style={{ color: 'var(--text-2)', marginTop: 12 }}>Loading quiz...</p>
    </div>
  )

  if (error) return <QuizError message={error} onBack={() => navigate('/my-quizzes')} />

  if (result) return (
    <QuizResult
      result={result}
      onLeaderboard={() => navigate(`/leaderboard/${id}`)}
      onSmartLeaderboard={() => navigate(`/smart-leaderboard/${id}`)}
      onDashboard={() => navigate('/dashboard')}
    />
  )

  // ── Quiz UI ─────────────────────────────────────────────────────────────────
  const allQuestions   = quiz?.questions || []
  const orderedQuestions = questionOrder
    .map(qid => allQuestions.find(q => q.id === qid))
    .filter(Boolean)

  const q        = orderedQuestions[current]
  const answered = Object.keys(answers).length
  const progress = allQuestions.length ? (answered / allQuestions.length) * 100 : 0
  const isUrgent = timeLeft !== null && timeLeft <= 60

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
        <div className="progress-bar" style={{ flex: 1 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
          {answered}/{allQuestions.length} answered
        </span>
      </div>

      {/* Body */}
      <div className="quiz-take-body">
        {/* Question nav */}
        <div className="question-nav">
          {orderedQuestions.map((qq, i) => (
            <button
              key={qq.id}
              className={[
                'q-nav-btn',
                i === current ? 'active' : '',
                answers[qq.id] ? 'answered' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleNavigate(i)}
              title={`Question ${i + 1}${answers[qq.id] ? ' (answered)' : ''}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question card */}
        {q && (
          <div className="question-card">
            <div className="question-card-header">
              <span className="question-card-num">
                Question {current + 1} of {orderedQuestions.length}
              </span>
              {answers[String(q.id)] && (
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--success)',
                  background: 'var(--success-bg)', padding: '3px 10px', borderRadius: 99,
                }}>
                  <i className="ri-check-line" /> Answered
                </span>
              )}
            </div>

            <p className="question-card-text">{q.text}</p>

            <div className="options-list">
              {(q.options || []).map((opt, idx) => (
                <button
                  key={opt.id}
                  className={`option-btn${answers[String(q.id)] === opt.id ? ' selected' : ''}`}
                  onClick={() => handleSelectAnswer(q.id, opt.id, idx)}
                >
                  <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                  <span>{opt.text}</span>
                </button>
              ))}
            </div>

            <div className="question-nav-btns">
              <button
                className="btn btn-secondary"
                disabled={current === 0}
                onClick={() => handleNavigate(current - 1)}
              >
                <i className="ri-arrow-left-line" /> Previous
              </button>
              {current < orderedQuestions.length - 1 ? (
                <button className="btn btn-primary" onClick={() => handleNavigate(current + 1)}>
                  Next <i className="ri-arrow-right-line" />
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                >
                  {submitting
                    ? <><span className="spinner" /> Submitting...</>
                    : <><i className="ri-check-line" /> Submit Quiz</>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
