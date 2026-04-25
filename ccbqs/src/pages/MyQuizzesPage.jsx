import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import QuizCard from '../components/quiz/QuizCard'
import { QuizAPI } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const STATUSES = ['all', 'active', 'upcoming', 'completed', 'draft']

export default function MyQuizzesPage() {
  const { isTeacher } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await QuizAPI.list()
      setQuizzes(Array.isArray(data) ? data : data?.quizzes || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this quiz? This cannot be undone.')) return
    try {
      await QuizAPI.delete(id)
      toast('Quiz deleted.', 'success')
      setQuizzes(prev => prev.filter(q => q.id !== id))
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  const filtered = quizzes.filter(q => {
    const matchSearch = !search || q.title.toLowerCase().includes(search.toLowerCase()) || q.category.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || q.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <AppShell title="My Quizzes" subtitle={isTeacher ? 'Manage and review your quizzes' : 'Quizzes assigned to you'}>
      {error && <div className="error-banner mb-6"><i className="ri-error-warning-line" /> {error}</div>}

      <div className="flex items-center justify-between mb-6" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="filter-bar" style={{ margin: 0, flex: 1 }}>
          {STATUSES.map(s => (
            <button
              key={s}
              className={`filter-chip${statusFilter === s ? ' active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-wrap">
            <i className="ri-search-line" />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {isTeacher && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/create-quiz')}>
              <i className="ri-add-line" /> New Quiz
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid-auto">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="card" style={{ padding: 22, height: 220 }}>
              <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 20 }} />
              <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 20 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="skeleton" style={{ height: 30, width: '40%' }} />
                <div className="skeleton" style={{ height: 30, width: '30%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <i className="ri-survey-line" />
            <h3>{search || statusFilter !== 'all' ? 'No quizzes match your filters' : 'No quizzes yet'}</h3>
            <p>{isTeacher ? 'Create your first quiz to get started.' : 'Your teacher hasn\'t assigned any quizzes yet.'}</p>
            {isTeacher && !search && statusFilter === 'all' && (
              <button className="btn btn-primary mt-4" onClick={() => navigate('/create-quiz')}>
                <i className="ri-add-line" /> Create Quiz
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
            Showing {filtered.length} quiz{filtered.length !== 1 ? 'zes' : ''}
          </p>
          <div className="grid-auto">
            {filtered.map(q => (
              <QuizCard
                key={q.id}
                quiz={q}
                showDelete={isTeacher}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}
    </AppShell>
  )
}
