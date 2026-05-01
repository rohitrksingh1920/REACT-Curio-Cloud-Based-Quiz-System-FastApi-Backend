



import { apiFetch } from './index'

// ── Feature 1: Adaptive Quiz Engine ──────────────────────────────────────────
export const AdaptiveAPI = {
  getNextQuestions: (quizId, answeredIds = []) =>
    apiFetch(`/ml/adaptive/${quizId}?answered_ids=${answeredIds.join(',')}`),

  getQuestionDifficulties: (quizId) =>
    apiFetch(`/ml/difficulty/${quizId}`),
}

// ── Feature 2: Recommendations ───────────────────────────────────────────────
export const RecommendAPI = {
  get: (limit = 5) => apiFetch(`/ml/recommendations?limit=${limit}`),
}

// ── Feature 3: Insights & Weak Topics ────────────────────────────────────────
export const InsightsAPI = {
  get: () => apiFetch('/ml/insights'),
}

// ── Feature 4: Cheating Flags (Admin) ────────────────────────────────────────
export const CheatingAPI = {
  list: (reviewed, severity) => {
    const p = new URLSearchParams()
    if (reviewed !== undefined && reviewed !== null) p.set('reviewed', reviewed)
    if (severity) p.set('severity', severity)
    return apiFetch(`/ml/cheating-flags?${p}`)
  },
  review: (id) => apiFetch(`/ml/cheating-flags/${id}/review`, { method: 'PATCH' }),
}

// ── Feature 6: Smart Leaderboard ─────────────────────────────────────────────
export const SmartLeaderboardAPI = {
  get: (quizId) => apiFetch(`/ml/smart-leaderboard/${quizId}`),
}

// ── Extended submit: answers + per-question timings ───────────────────────────
export const QuizMLAPI = {
  submitWithTimings: (quizId, answers, timings) =>
    apiFetch(`/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers, timings }),
    }),
}
