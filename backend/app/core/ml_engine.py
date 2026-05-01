



import math
import statistics
from collections import defaultdict
from datetime import timedelta
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.core.timezone_utils import now_ist
from backend.app.models.attempt import QuizAttempt, AttemptAnswer
from backend.app.models.quiz import Quiz, QuizCategory, QuizEnrollment
from backend.app.models.user import User
from backend.app.models.ml import (
    AttemptQuestionTiming,
    CheatingFlag,
    DifficultyLevel,
    QuestionDifficulty,
    RecommendationLog,
    SmartLeaderboardScore,
    SuspicionType,
    UserTopicProfile,
)


# ─────────────────────────────────────────────────────────────────────────────
# Feature 1 — Adaptive Quiz Engine
# ─────────────────────────────────────────────────────────────────────────────

# Thresholds (seconds) that define "fast" for a given difficulty
FAST_ANSWER_THRESHOLDS = {
    DifficultyLevel.easy:   5.0,
    DifficultyLevel.medium: 8.0,
    DifficultyLevel.hard:  12.0,
}

# How many attempts before we auto-update question difficulty
MIN_ATTEMPTS_FOR_UPDATE = 10


def adaptive_difficulty(user_accuracy: float) -> DifficultyLevel:
    """
    Rule-based difficulty recommendation.

    Args:
        user_accuracy: 0.0 → 1.0 (fraction of correct answers so far)

    Returns:
        DifficultyLevel enum value
    """
    if user_accuracy > 0.80:
        return DifficultyLevel.hard
    elif user_accuracy < 0.40:
        return DifficultyLevel.easy
    else:
        return DifficultyLevel.medium


def get_user_session_accuracy(
    db: Session, user_id: int, quiz_id: int
) -> float:
    """
    Compute the user's accuracy so far in the current quiz session
    from AttemptQuestionTiming rows for the in-progress attempt.
    Returns 0.5 (neutral) if no data.
    """
    # Find the latest incomplete attempt
    attempt = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.user_id == user_id,
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.is_completed == False,
        )
        .order_by(QuizAttempt.started_at.desc())
        .first()
    )
    if not attempt:
        return 0.5

    timings = db.query(AttemptQuestionTiming).filter(
        AttemptQuestionTiming.attempt_id == attempt.id
    ).all()

    if not timings:
        return 0.5

    correct = sum(1 for t in timings if t.is_correct)
    return correct / len(timings)


def update_question_difficulty_stats(
    db: Session,
    question_id: int,
    is_correct: bool,
) -> None:
    """
    Increment attempt/correct counters on QuestionDifficulty.
    Auto-update the difficulty label once MIN_ATTEMPTS_FOR_UPDATE is reached.
    """
    qd = db.query(QuestionDifficulty).filter(
        QuestionDifficulty.question_id == question_id
    ).first()

    if not qd:
        qd = QuestionDifficulty(question_id=question_id)
        db.add(qd)
        db.flush()

    qd.attempt_count += 1
    if is_correct:
        qd.correct_count += 1

    # Auto-calibrate label
    if qd.attempt_count >= MIN_ATTEMPTS_FOR_UPDATE:
        acc = qd.correct_count / qd.attempt_count
        qd.difficulty = adaptive_difficulty(acc)


def get_adaptive_next_question_ids(
    db: Session,
    quiz_id: int,
    user_id: int,
    answered_question_ids: list[int],
) -> list[int]:
    """
    Return remaining question IDs ordered by appropriate difficulty.
    Uses the user's current-session accuracy to decide which difficulty to serve next.
    """
    from backend.app.models.quiz import Question

    accuracy = get_user_session_accuracy(db, user_id, quiz_id)
    target   = adaptive_difficulty(accuracy)

    all_questions = (
        db.query(Question)
        .filter(
            Question.quiz_id == quiz_id,
            ~Question.id.in_(answered_question_ids),
        )
        .all()
    )

    # Fetch difficulty records
    difficulty_map: dict[int, DifficultyLevel] = {}
    for q in all_questions:
        qd = db.query(QuestionDifficulty).filter(
            QuestionDifficulty.question_id == q.id
        ).first()
        difficulty_map[q.id] = qd.difficulty if qd else DifficultyLevel.medium

    # Priority: target difficulty first, then others
    priority = {target: 0}
    others = [d for d in DifficultyLevel if d != target]
    for i, d in enumerate(others, start=1):
        priority[d] = i

    ordered = sorted(all_questions, key=lambda q: priority[difficulty_map[q.id]])
    return [q.id for q in ordered]


# ─────────────────────────────────────────────────────────────────────────────
# Features 1, 2, 3 — User Topic Profile Builder
# ─────────────────────────────────────────────────────────────────────────────

def build_topic_profile(db: Session, user_id: int) -> list[UserTopicProfile]:
    """
    (Re-)compute the UserTopicProfile for every category the user has attempted.
    Called after every quiz submission.
    Returns the updated profile rows.
    """
    completed = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.user_id == user_id,
            QuizAttempt.is_completed == True,
        )
        .all()
    )

    # Group by category
    category_data: dict[str, dict] = defaultdict(
        lambda: {"total": 0, "correct": 0, "scores": [], "quizzes": 0, "last": None}
    )

    for attempt in completed:
        quiz = attempt.quiz
        if not quiz:
            continue
        cat = quiz.category.value if hasattr(quiz.category, "value") else str(quiz.category)
        answers = attempt.answers

        total   = len(answers)
        correct = sum(1 for a in answers if a.is_correct)

        category_data[cat]["total"]   += total
        category_data[cat]["correct"] += correct
        category_data[cat]["quizzes"] += 1
        if attempt.score_pct is not None:
            category_data[cat]["scores"].append(attempt.score_pct)
        if attempt.completed_at:
            if (
                category_data[cat]["last"] is None
                or attempt.completed_at > category_data[cat]["last"]
            ):
                category_data[cat]["last"] = attempt.completed_at

    updated_profiles = []

    for cat, data in category_data.items():
        accuracy = data["correct"] / data["total"] if data["total"] > 0 else 0.0

        # Recency weight: attempts in last 14 days count more
        now = now_ist()
        recent_scores = []
        for attempt in completed:
            quiz = attempt.quiz
            if not quiz:
                continue
            a_cat = quiz.category.value if hasattr(quiz.category, "value") else str(quiz.category)
            if a_cat != cat or attempt.score_pct is None:
                continue
            age_days = (now - attempt.completed_at).days if attempt.completed_at else 999
            weight   = 1.5 if age_days <= 14 else 1.0
            recent_scores.extend([attempt.score_pct] * int(weight * 10))

        mastery = round(sum(recent_scores) / len(recent_scores), 1) if recent_scores else 0.0

        # Get previous profile to compute improvement
        prev_profile = db.query(UserTopicProfile).filter(
            UserTopicProfile.user_id == user_id,
            UserTopicProfile.category == cat,
        ).first()

        prev_mastery = prev_profile.mastery_score if prev_profile else 0.0
        improvement  = round(mastery - prev_mastery, 1)

        if prev_profile:
            prev_profile.total_questions = data["total"]
            prev_profile.correct_answers = data["correct"]
            prev_profile.quizzes_taken   = data["quizzes"]
            prev_profile.mastery_score   = mastery
            prev_profile.improvement     = improvement
            prev_profile.is_weak_topic   = accuracy < 0.50
            prev_profile.last_attempted  = data["last"]
            updated_profiles.append(prev_profile)
        else:
            new_profile = UserTopicProfile(
                user_id         = user_id,
                category        = cat,
                total_questions = data["total"],
                correct_answers = data["correct"],
                quizzes_taken   = data["quizzes"],
                mastery_score   = mastery,
                improvement     = improvement,
                is_weak_topic   = accuracy < 0.50,
                last_attempted  = data["last"],
            )
            db.add(new_profile)
            updated_profiles.append(new_profile)

    db.flush()
    return updated_profiles


# ─────────────────────────────────────────────────────────────────────────────
# Feature 3 — Weak Topic Detection
# ─────────────────────────────────────────────────────────────────────────────

def detect_weak_topics(db: Session, user_id: int) -> list[dict]:
    """
    Return a list of weak topics with actionable detail messages.
    """
    profiles = (
        db.query(UserTopicProfile)
        .filter(
            UserTopicProfile.user_id   == user_id,
            UserTopicProfile.is_weak_topic == True,
        )
        .all()
    )

    result = []
    for p in profiles:
        acc = p.accuracy
        if acc < 30:
            severity = "critical"
            msg = f"You're struggling badly in {p.category} ({acc:.0f}% accuracy). Focus here first."
        elif acc < 50:
            severity = "weak"
            msg = f"You need more practice in {p.category} ({acc:.0f}% accuracy)."
        else:
            severity = "improving"
            msg = f"{p.category} is improving ({acc:.0f}%) but still below target."

        result.append({
            "category":    p.category,
            "accuracy":    acc,
            "mastery":     p.mastery_score,
            "severity":    severity,
            "message":     msg,
            "improvement": p.improvement,
        })

    return sorted(result, key=lambda x: x["accuracy"])


def compute_improvement_message(db: Session, user_id: int) -> list[str]:
    """
    Generate human-readable progress messages.
    e.g. "You improved 20% in DSA last week"
    """
    profiles = db.query(UserTopicProfile).filter(
        UserTopicProfile.user_id == user_id
    ).all()

    messages = []
    for p in profiles:
        if p.improvement > 15:
            messages.append(
                f"🚀 You improved {p.improvement:.0f}% in {p.category} — keep it up!"
            )
        elif p.improvement > 5:
            messages.append(
                f"📈 Solid progress in {p.category} (+{p.improvement:.0f}%)"
            )
        elif p.improvement < -10:
            messages.append(
                f"⚠️  Your {p.category} score dropped {abs(p.improvement):.0f}%. Review recent quizzes."
            )

    if not messages:
        messages.append("Complete more quizzes to unlock personalised insights.")

    return messages


# ─────────────────────────────────────────────────────────────────────────────
# Feature 2 — Smart Recommendation System
# ─────────────────────────────────────────────────────────────────────────────

def recommend_quizzes(
    db: Session,
    user_id: int,
    limit: int = 5,
) -> list[dict]:
    """
    Recommend quizzes using a scoring formula:

      score = 0.4 * (weak_topic_bonus)
            + 0.3 * (low_score_bonus)
            + 0.2 * (not_attempted_bonus)
            + 0.1 * (popular_bonus)

    Returns a list of dicts with quiz info + reason string.
    """
    # Quizzes the user is enrolled in
    enrolled_ids = {
        e.quiz_id
        for e in db.query(QuizEnrollment)
        .filter(QuizEnrollment.user_id == user_id)
        .all()
    }

    # Quizzes the user already completed
    completed_ids = {
        a.quiz_id
        for a in db.query(QuizAttempt)
        .filter(
            QuizAttempt.user_id   == user_id,
            QuizAttempt.is_completed == True,
        )
        .all()
    }

    # User's weak topics
    weak_topics = {
        p.category
        for p in db.query(UserTopicProfile)
        .filter(
            UserTopicProfile.user_id   == user_id,
            UserTopicProfile.is_weak_topic == True,
        )
        .all()
    }

    # Candidate quizzes: enrolled but not completed
    candidate_ids = enrolled_ids - completed_ids
    if not candidate_ids:
        return []

    candidates = db.query(Quiz).filter(Quiz.id.in_(candidate_ids)).all()

    # Popularity: attempt counts
    attempt_counts: dict[int, int] = {}
    for quiz in candidates:
        attempt_counts[quiz.id] = len(quiz.attempts or [])
    max_attempts = max(attempt_counts.values(), default=1) or 1

    # Low-score attempts
    low_score_attempts: dict[int, float] = {}
    for quiz in candidates:
        user_attempt = next(
            (a for a in (quiz.attempts or []) if a.user_id == user_id),
            None,
        )
        low_score_attempts[quiz.id] = (
            user_attempt.score_pct if user_attempt and user_attempt.score_pct else None
        )

    recommendations = []
    for quiz in candidates:
        cat = quiz.category.value if hasattr(quiz.category, "value") else str(quiz.category)
        score   = 0.0
        reasons = []

        # Weak topic bonus
        if cat in weak_topics:
            score += 0.4
            reasons.append(f"Weak topic: {cat}")

        # Low score bonus (previously attempted but low score)
        prev_score = low_score_attempts.get(quiz.id)
        if prev_score is not None and prev_score < 60:
            score += 0.3
            reasons.append(f"Improve your {prev_score:.0f}% score")
        elif prev_score is None:
            # Not yet attempted
            score += 0.2
            reasons.append("Not attempted yet")

        # Popularity bonus
        popularity = attempt_counts.get(quiz.id, 0) / max_attempts
        score += 0.1 * popularity
        if popularity > 0.5:
            reasons.append("Popular quiz")

        recommendations.append({
            "quiz_id":      quiz.id,
            "title":        quiz.title,
            "category":     cat,
            "score":        round(score, 3),
            "reason":       " · ".join(reasons) if reasons else "Recommended for you",
            "duration_mins": quiz.duration_mins,
            "total_points": quiz.total_points,
        })

    # Sort by score descending
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    return recommendations[:limit]


def log_recommendations(
    db: Session,
    user_id: int,
    recommendations: list[dict],
) -> None:
    """Persist recommendation log for analytics."""
    for rec in recommendations:
        db.add(RecommendationLog(
            user_id  = user_id,
            quiz_id  = rec["quiz_id"],
            reason   = rec["reason"],
            score    = rec["score"],
        ))
    db.flush()


# ─────────────────────────────────────────────────────────────────────────────
# Feature 4 — Cheating / Suspicious Behavior Detection
# ─────────────────────────────────────────────────────────────────────────────

# Minimum expected seconds per question for each difficulty
MIN_TIME_PER_Q = {
    DifficultyLevel.easy:   3.0,
    DifficultyLevel.medium: 6.0,
    DifficultyLevel.hard:   10.0,
}
DEFAULT_MIN_TIME = 4.0   # used when no difficulty info exists
PATTERN_THRESHOLD = 0.85  # if > 85% of answers pick same option index → suspicious
SCORE_JUMP_THRESHOLD = 40  # % improvement vs personal best considered suspicious


def detect_suspicious_behavior(
    db: Session,
    attempt_id: int,
    user_id: int,
    quiz_id: int,
    score_pct: float,
    timings: list[dict],   # [{"question_id": int, "time_taken": float, "option_index": int, "is_correct": bool}]
) -> list[CheatingFlag]:
    """
    Analyse a completed attempt for suspicious patterns.
    Returns a list of CheatingFlag objects (not yet committed).
    """
    flags: list[CheatingFlag] = []

    if not timings:
        return flags

    total_time = sum(t["time_taken"] for t in timings)
    n_questions = len(timings)
    avg_time    = total_time / n_questions if n_questions else 0

    # ── Check 1: High score + very low time ──────────────────────────────────
    if score_pct > 90 and avg_time < DEFAULT_MIN_TIME:
        flags.append(CheatingFlag(
            user_id        = user_id,
            attempt_id     = attempt_id,
            quiz_id        = quiz_id,
            suspicion_type = SuspicionType.high_score_low_time,
            severity       = "high",
            detail         = (
                f"Score {score_pct:.1f}% with average {avg_time:.1f}s per question "
                f"(threshold: {DEFAULT_MIN_TIME}s). "
                f"Possible external assistance."
            ),
        ))

    # ── Check 2: Very fast answers on individual questions ───────────────────
    fast_count = sum(1 for t in timings if t["time_taken"] < DEFAULT_MIN_TIME)
    fast_ratio = fast_count / n_questions
    if fast_ratio > 0.70:   # > 70% of questions answered too fast
        flags.append(CheatingFlag(
            user_id        = user_id,
            attempt_id     = attempt_id,
            quiz_id        = quiz_id,
            suspicion_type = SuspicionType.too_fast,
            severity       = "medium" if fast_ratio < 0.90 else "high",
            detail         = (
                f"{fast_count}/{n_questions} questions answered in < {DEFAULT_MIN_TIME}s. "
                f"Fast ratio: {fast_ratio:.0%}."
            ),
        ))

    # ── Check 3: Pattern answers (same option index always selected) ─────────
    if "option_index" in timings[0]:
        option_indices = [t["option_index"] for t in timings]
        most_common    = max(set(option_indices), key=option_indices.count)
        pattern_ratio  = option_indices.count(most_common) / n_questions
        if pattern_ratio >= PATTERN_THRESHOLD:
            flags.append(CheatingFlag(
                user_id        = user_id,
                attempt_id     = attempt_id,
                quiz_id        = quiz_id,
                suspicion_type = SuspicionType.pattern_answers,
                severity       = "medium",
                detail         = (
                    f"Option {most_common} selected {pattern_ratio:.0%} of the time "
                    f"({option_indices.count(most_common)}/{n_questions} questions)."
                ),
            ))

    # ── Check 4: Sudden score jump vs personal history ────────────────────────
    prev_attempts = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.user_id      == user_id,
            QuizAttempt.is_completed == True,
            QuizAttempt.id           != attempt_id,
        )
        .all()
    )
    if prev_attempts:
        prev_scores = [a.score_pct for a in prev_attempts if a.score_pct is not None]
        if prev_scores:
            personal_best = max(prev_scores)
            jump          = score_pct - personal_best
            if jump > SCORE_JUMP_THRESHOLD:
                flags.append(CheatingFlag(
                    user_id        = user_id,
                    attempt_id     = attempt_id,
                    quiz_id        = quiz_id,
                    suspicion_type = SuspicionType.sudden_score_jump,
                    severity       = "medium",
                    detail         = (
                        f"Score jumped from personal best {personal_best:.1f}% "
                        f"to {score_pct:.1f}% (Δ {jump:.1f}%)."
                    ),
                ))

    return flags


# ─────────────────────────────────────────────────────────────────────────────
# Feature 6 — Smart Leaderboard Score
# ─────────────────────────────────────────────────────────────────────────────

def compute_smart_leaderboard_score(
    db: Session,
    user_id: int,
    quiz_id: int,
) -> SmartLeaderboardScore:
    """
    Compute / update the composite leaderboard score for a user on a quiz.

    composite = 0.5 * avg_score
              + 0.3 * consistency_score   (100 - std_dev, clamped 0–100)
              + 0.2 * improvement_score   (latest - first, clamped 0–100)
    """
    attempts = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.user_id      == user_id,
            QuizAttempt.quiz_id      == quiz_id,
            QuizAttempt.is_completed == True,
        )
        .order_by(QuizAttempt.completed_at.asc())
        .all()
    )

    scores = [a.score_pct for a in attempts if a.score_pct is not None]
    if not scores:
        return None

    avg_score = round(statistics.mean(scores), 2)

    if len(scores) >= 2:
        std_dev           = statistics.stdev(scores)
        consistency_score = round(max(0.0, 100.0 - std_dev), 2)
        improvement_score = round(max(0.0, min(100.0, scores[-1] - scores[0])), 2)
    else:
        consistency_score = 100.0   # only one attempt → perfectly consistent
        improvement_score = 0.0

    composite = round(
        0.5 * avg_score
        + 0.3 * consistency_score
        + 0.2 * improvement_score,
        2,
    )

    # Upsert
    row = db.query(SmartLeaderboardScore).filter(
        SmartLeaderboardScore.user_id == user_id,
        SmartLeaderboardScore.quiz_id == quiz_id,
    ).first()

    if row:
        row.avg_score         = avg_score
        row.consistency_score = consistency_score
        row.improvement_score = improvement_score
        row.composite_score   = composite
        row.attempt_count     = len(scores)
    else:
        row = SmartLeaderboardScore(
            user_id           = user_id,
            quiz_id           = quiz_id,
            avg_score         = avg_score,
            consistency_score = consistency_score,
            improvement_score = improvement_score,
            composite_score   = composite,
            attempt_count     = len(scores),
        )
        db.add(row)

    db.flush()
    return row
