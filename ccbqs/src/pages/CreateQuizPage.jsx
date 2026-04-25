import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { QuizAPI, AdminAPI } from '../api'
import { useToast } from '../context/ToastContext'
import './CreateQuizPage.css'

const CATEGORIES = ['Computer Science','Mathematics','History','Science','Geography','English','Other']

function QuestionBuilder({ question, qIndex, onChange, onRemove }) {
  function updateQuestion(key, val) {
    onChange({ ...question, [key]: val })
  }
  function updateOption(oIndex, key, val) {
    const opts = question.options.map((o, i) => i === oIndex ? { ...o, [key]: val } : o)
    onChange({ ...question, options: opts })
  }
  function setCorrect(oIndex) {
    const opts = question.options.map((o, i) => ({ ...o, is_correct: i === oIndex }))
    onChange({ ...question, options: opts })
  }
  function addOption() {
    if (question.options.length >= 6) return
    onChange({ ...question, options: [...question.options, { text: '', is_correct: false, order: question.options.length + 1 }] })
  }
  function removeOption(oIndex) {
    if (question.options.length <= 2) return
    const opts = question.options.filter((_, i) => i !== oIndex).map((o, i) => ({ ...o, order: i + 1 }))
    onChange({ ...question, options: opts })
  }

  return (
    <div className="question-block">
      <div className="question-block-header">
        <span className="question-num">Question {qIndex + 1}</span>
        <button type="button" className="btn btn-danger btn-sm" onClick={onRemove}>
          <i className="ri-delete-bin-line" /> Remove
        </button>
      </div>

      <div className="form-group">
        <label>Question Text</label>
        <textarea
          placeholder="Enter your question..."
          value={question.text}
          onChange={e => updateQuestion('text', e.target.value)}
          rows={2}
          style={question._error?.text ? { borderColor: 'var(--danger)' } : {}}
        />
        {question._error?.text && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{question._error.text}</span>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label style={{ marginBottom: 0 }}>Answer Options <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 12 }}>(select correct)</span></label>
          {question.options.length < 6 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={addOption}>
              <i className="ri-add-line" /> Add Option
            </button>
          )}
        </div>
        {question._error?.options && (
          <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{question._error.options}</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {question.options.map((opt, oIndex) => (
            <div key={oIndex} className={`option-row${opt.is_correct ? ' option-correct' : ''}`}>
              <button
                type="button"
                className={`option-radio${opt.is_correct ? ' selected' : ''}`}
                onClick={() => setCorrect(oIndex)}
                title="Mark as correct"
              >
                {opt.is_correct ? <i className="ri-checkbox-circle-fill" /> : <i className="ri-circle-line" />}
              </button>
              <input
                type="text"
                placeholder={`Option ${oIndex + 1}`}
                value={opt.text}
                onChange={e => updateOption(oIndex, 'text', e.target.value)}
                style={{ border: 'none', background: 'transparent', flex: 1, outline: 'none', fontSize: 14, color: 'var(--text-1)' }}
              />
              {question.options.length > 2 && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '4px 6px' }} onClick={() => removeOption(oIndex)}>
                  <i className="ri-close-line" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CreateQuizPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    title: '',
    category: '',
    duration_mins: 30,
    total_points: 100,
    scheduled_date: '',
    scheduled_time: '',
  })
  const [formErrors, setFormErrors] = useState({})

  const [questions, setQuestions] = useState([
    { text: '', options: [
      { text: '', is_correct: true, order: 1 },
      { text: '', is_correct: false, order: 2 },
      { text: '', is_correct: false, order: 3 },
      { text: '', is_correct: false, order: 4 },
    ], order: 1 }
  ])

  useEffect(() => {
    AdminAPI.listStudents().then(setStudents).catch(() => {})
  }, [])

  function addQuestion() {
    setQuestions(prev => [...prev, {
      text: '',
      options: [
        { text: '', is_correct: true, order: 1 },
        { text: '', is_correct: false, order: 2 },
        { text: '', is_correct: false, order: 3 },
        { text: '', is_correct: false, order: 4 },
      ],
      order: prev.length + 1,
    }])
  }

  function updateQuestion(idx, updated) {
    setQuestions(prev => prev.map((q, i) => i === idx ? updated : q))
  }

  function removeQuestion(idx) {
    if (questions.length <= 1) { toast('A quiz must have at least 1 question.', 'error'); return }
    setQuestions(prev => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i + 1 })))
  }

  function toggleStudent(id) {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  function validateForm() {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Quiz title is required'
    if (!form.category) errs.category = 'Select a category'
    if (!form.duration_mins || form.duration_mins < 1) errs.duration_mins = 'Duration must be at least 1 minute'
    if (!form.total_points || form.total_points < 1) errs.total_points = 'Total points must be at least 1'
    setFormErrors(errs)

    // Validate questions
    let qValid = true
    const updatedQs = questions.map(q => {
      const qErr = {}
      if (!q.text.trim()) { qErr.text = 'Question text is required'; qValid = false }
      const hasCorrect = q.options.some(o => o.is_correct)
      const emptyOpts = q.options.filter(o => !o.text.trim())
      if (!hasCorrect) { qErr.options = 'Mark one option as correct'; qValid = false }
      if (emptyOpts.length > 0) { qErr.options = (qErr.options || '') + ' Fill in all option texts.'; qValid = false }
      return { ...q, _error: qErr }
    })
    if (!qValid) setQuestions(updatedQs)

    return Object.keys(errs).length === 0 && qValid
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateForm()) {
      toast('Please fix the errors before submitting.', 'error')
      return
    }
    setLoading(true)
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        duration_mins: Number(form.duration_mins),
        total_points: Number(form.total_points),
        scheduled_date: form.scheduled_date || null,
        scheduled_time: form.scheduled_time || null,
        questions: questions.map((q, i) => ({
          text: q.text,
          order: i + 1,
          options: q.options.map((o, j) => ({ text: o.text, is_correct: o.is_correct, order: j + 1 })),
        })),
        student_ids: selectedStudents,
      }
      const created = await QuizAPI.create(payload)
      toast('Quiz created successfully!', 'success')
      navigate('/my-quizzes')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function setField(k, v) {
    setForm(p => ({ ...p, [k]: v }))
    if (formErrors[k]) setFormErrors(p => ({ ...p, [k]: '' }))
  }

  return (
    <AppShell title="Create Quiz" subtitle="Build a new quiz and assign it to students">
      <form onSubmit={handleSubmit} noValidate>
        <div className="create-quiz-layout">
          {/* Left - Quiz Details */}
          <div className="create-quiz-main">
            <div className="card" style={{ padding: 28, marginBottom: 20 }}>
              <h3 style={{ marginBottom: 20, fontSize: 16 }}>Quiz Details</h3>

              <div className="form-group">
                <label>Quiz Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Python Concepts"
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                  style={formErrors.title ? { borderColor: 'var(--danger)' } : {}}
                />
                {formErrors.title && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{formErrors.title}</span>}
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  value={form.category}
                  onChange={e => setField('category', e.target.value)}
                  style={formErrors.category ? { borderColor: 'var(--danger)' } : {}}
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {formErrors.category && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{formErrors.category}</span>}
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Duration (minutes) *</label>
                  <input
                    type="number"
                    min="1" max="360"
                    value={form.duration_mins}
                    onChange={e => setField('duration_mins', e.target.value)}
                    style={formErrors.duration_mins ? { borderColor: 'var(--danger)' } : {}}
                  />
                  {formErrors.duration_mins && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{formErrors.duration_mins}</span>}
                </div>
                <div className="form-group">
                  <label>Total Points *</label>
                  <input
                    type="number"
                    min="1" max="1000"
                    value={form.total_points}
                    onChange={e => setField('total_points', e.target.value)}
                    style={formErrors.total_points ? { borderColor: 'var(--danger)' } : {}}
                  />
                  {formErrors.total_points && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{formErrors.total_points}</span>}
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Scheduled Date <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                  <input type="date" value={form.scheduled_date} onChange={e => setField('scheduled_date', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Scheduled Time <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                  <input type="time" value={form.scheduled_time} onChange={e => setField('scheduled_time', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {questions.map((q, idx) => (
                <QuestionBuilder
                  key={idx}
                  question={q}
                  qIndex={idx}
                  onChange={updated => updateQuestion(idx, updated)}
                  onRemove={() => removeQuestion(idx)}
                />
              ))}
            </div>

            <button type="button" className="btn btn-secondary w-full mt-4" onClick={addQuestion}>
              <i className="ri-add-circle-line" /> Add Question
            </button>
          </div>

          {/* Right - Students + Submit */}
          <div className="create-quiz-sidebar">
            <div className="card" style={{ padding: 24, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, marginBottom: 16 }}>
                Assign Students
                <span style={{ marginLeft: 8, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                  {selectedStudents.length}
                </span>
              </h3>
              {students.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No students available.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                  {students.map(s => (
                    <label key={s.id} className="student-select-item">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(s.id)}
                        onChange={() => toggleStudent(s.id)}
                      />
                      <span className="student-select-avatar">
                        {s.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{s.full_name}</span>
                    </label>
                  ))}
                </div>
              )}
              {students.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm w-full mt-2"
                  onClick={() => setSelectedStudents(
                    selectedStudents.length === students.length ? [] : students.map(s => s.id)
                  )}
                >
                  {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-2)' }}>Questions</span>
                  <span style={{ fontWeight: 700 }}>{questions.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-2)' }}>Students</span>
                  <span style={{ fontWeight: 700 }}>{selectedStudents.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>Duration</span>
                  <span style={{ fontWeight: 700 }}>{form.duration_mins} min</span>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? <><span className="spinner" /> Creating...</> : <><i className="ri-check-line" /> Create Quiz</>}
              </button>
              <button type="button" className="btn btn-ghost w-full mt-2" onClick={() => navigate('/my-quizzes')}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </AppShell>
  )
}
