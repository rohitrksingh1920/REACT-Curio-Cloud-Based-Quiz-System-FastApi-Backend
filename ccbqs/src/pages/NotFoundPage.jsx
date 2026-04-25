import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 32,
      textAlign: 'center',
      gap: 16,
    }}>
      <div style={{
        fontSize: 96,
        fontWeight: 900,
        fontFamily: 'var(--font-display)',
        background: 'linear-gradient(135deg, var(--primary), #a29bfe)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        lineHeight: 1,
        marginBottom: 8,
      }}>
        404
      </div>
      <h2 style={{ fontSize: 24 }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-2)', maxWidth: 360 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <i className="ri-arrow-left-line" /> Go Back
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          <i className="ri-home-line" /> Dashboard
        </button>
      </div>
    </div>
  )
}
