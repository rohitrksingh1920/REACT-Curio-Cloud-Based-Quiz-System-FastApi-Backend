





from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, require_admin
from backend.app.core.ml_engine import (
    build_topic_profile,
    compute_improvement_message,
    compute_smart_leaderboard_score,
    detect_weak_topics,
    get_adaptive_next_question_ids,
    log_recommendations,
    recommend_quizzes,
)
from backend.app.models.ml import (
    CheatingFlag,
    QuestionDifficulty,
    SmartLeaderboardScore,
    UserTopicProfile,
    DifficultyLevel,
)
from backend.app.models.quiz import Quiz, QuizEnrollment
from backend.app.models.attempt import QuizAttempt
from backend.app.models.user import User, UserRole
from backend.app.schemas.ml import (
    AdaptiveQuizResponse,
    InsightsResponse,
    RecommendationItem,
    SmartLeaderboardEntry,
    SmartLeaderboardResponse,
    CheatingFlagOut,
    WeakTopicItem,
    QuestionDifficultyOut,
)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Feature 1 — Adaptive Question Order
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/adaptive/{quiz_id}", response_model=AdaptiveQuizResponse)
def get_adaptive_question_order(
    quiz_id: int,
    answered_ids: str = Query("", description="Comma-separated already-answered question IDs"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return remaining question IDs ordered by adaptive difficulty.
    The frontend calls this after each answer to get the next best question.
    """
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    # Validate enrollment
    if current_user.role == UserRole.student:
        enrolled = db.query(QuizEnrollment).filter(
            QuizEnrollment.quiz_id == quiz_id,
            QuizEnrollment.user_id == current_user.id,
        ).first()
        if not enrolled:
            raise HTTPException(status_code=403, detail="You are not enrolled in this quiz.")

    # Parse answered question IDs
    try:
        done_ids = [int(x) for x in answered_ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status_code=422, detail="answered_ids must be comma-separated integers.")

    ordered_ids = get_adaptive_next_question_ids(
        db=db,
        quiz_id=quiz_id,
        user_id=current_user.id,
        answered_question_ids=done_ids,
    )

    # Build difficulty map for response
    from backend.app.models.quiz import Question
    diff_map = {}
    for qid in ordered_ids:
        qd = db.query(QuestionDifficulty).filter(
            QuestionDifficulty.question_id == qid
        ).first()
        diff_map[qid] = qd.difficulty.value if qd else "medium"

    return AdaptiveQuizResponse(
        quiz_id=quiz_id,
        remaining_question_ids=ordered_ids,
        difficulty_map=diff_map,
        total_remaining=len(ordered_ids),
    )


@router.get("/difficulty/{quiz_id}", response_model=list[QuestionDifficultyOut])
def get_quiz_question_difficulties(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return difficulty info for all questions in a quiz (teacher/admin view)."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    result = []
    for q in quiz.questions:
        qd = db.query(QuestionDifficulty).filter(
            QuestionDifficulty.question_id == q.id
        ).first()
        result.append(QuestionDifficultyOut(
            question_id   = q.id,
            question_text = q.text[:80] + "..." if len(q.text) > 80 else q.text,
            difficulty    = qd.difficulty.value if qd else "medium",
            attempt_count = qd.attempt_count if qd else 0,
            accuracy_rate = round(qd.accuracy_rate * 100, 1) if qd else 0.0,
        ))

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Feature 2 — Smart Recommendations
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/recommendations", response_model=list[RecommendationItem])
def get_recommendations(
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return personalised quiz recommendations for the current user."""
    recs = recommend_quizzes(db=db, user_id=current_user.id, limit=limit)

    # Log recommendations (fire and forget — don't fail on error)
    try:
        log_recommendations(db=db, user_id=current_user.id, recommendations=recs)
        db.commit()
    except Exception:
        db.rollback()

    return [
        RecommendationItem(
            quiz_id       = r["quiz_id"],
            title         = r["title"],
            category      = r["category"],
            reason        = r["reason"],
            score         = r["score"],
            duration_mins = r["duration_mins"],
            total_points  = r["total_points"],
        )
        for r in recs
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Feature 3 — Insights & Weak Topic Detection
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/insights", response_model=InsightsResponse)
def get_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return weak topics, improvement messages, and full topic profile.
    Called by the Analytics page to enrich the existing static data.
    """
    # Rebuild profile to ensure freshness
    try:
        build_topic_profile(db=db, user_id=current_user.id)
        db.commit()
    except Exception:
        db.rollback()

    weak  = detect_weak_topics(db=db, user_id=current_user.id)
    msgs  = compute_improvement_message(db=db, user_id=current_user.id)

    profiles = db.query(UserTopicProfile).filter(
        UserTopicProfile.user_id == current_user.id
    ).all()

    topic_items = [
        WeakTopicItem(
            category     = p.category,
            accuracy     = p.accuracy,
            mastery      = p.mastery_score,
            is_weak      = p.is_weak_topic,
            improvement  = p.improvement,
            quizzes_taken= p.quizzes_taken,
        )
        for p in sorted(profiles, key=lambda x: x.mastery_score)
    ]

    return InsightsResponse(
        weak_topics          = [w["category"] for w in weak],
        weak_topic_details   = weak,
        improvement_messages = msgs,
        topic_profile        = topic_items,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Feature 6 — Smart Leaderboard
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/smart-leaderboard/{quiz_id}", response_model=SmartLeaderboardResponse)
def get_smart_leaderboard(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return a leaderboard ranked by composite score instead of raw score.
    composite = 0.5*avg_score + 0.3*consistency + 0.2*improvement
    """
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    rows = (
        db.query(SmartLeaderboardScore)
        .filter(SmartLeaderboardScore.quiz_id == quiz_id)
        .order_by(SmartLeaderboardScore.composite_score.desc())
        .all()
    )

    entries = []
    current_rank = None

    for rank, row in enumerate(rows, start=1):
        user = db.query(User).filter(User.id == row.user_id).first()
        is_me = row.user_id == current_user.id
        if is_me:
            current_rank = rank

        entries.append(SmartLeaderboardEntry(
            rank              = rank,
            user_id           = row.user_id,
            full_name         = user.full_name if user else "Unknown",
            profile_picture   = user.profile_picture if user else None,
            avg_score         = row.avg_score,
            consistency_score = row.consistency_score,
            improvement_score = row.improvement_score,
            composite_score   = row.composite_score,
            attempt_count     = row.attempt_count,
            is_current_user   = is_me,
        ))

    return SmartLeaderboardResponse(
        quiz_id           = quiz_id,
        quiz_title        = quiz.title,
        total_participants= len(entries),
        entries           = entries,
        current_user_rank = current_rank,
        scoring_formula   = "0.5 × avg_score + 0.3 × consistency + 0.2 × improvement",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Feature 4 — Cheating Flags (Admin only)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/cheating-flags", response_model=list[CheatingFlagOut])
def list_cheating_flags(
    reviewed: Optional[bool] = Query(None, description="Filter by reviewed status"),
    severity: Optional[str]  = Query(None, description="low | medium | high"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all suspicious behavior flags. Admin only."""
    query = db.query(CheatingFlag)
    if reviewed is not None:
        query = query.filter(CheatingFlag.is_reviewed == reviewed)
    if severity:
        if severity not in ("low", "medium", "high"):
            raise HTTPException(status_code=422, detail="severity must be low, medium, or high.")
        query = query.filter(CheatingFlag.severity == severity)

    flags = query.order_by(CheatingFlag.created_at.desc()).all()

    return [
        CheatingFlagOut(
            id             = f.id,
            user_id        = f.user_id,
            user_name      = f.user.full_name if f.user else "Unknown",
            attempt_id     = f.attempt_id,
            quiz_id        = f.quiz_id,
            quiz_title     = f.quiz.title if f.quiz else "Unknown",
            suspicion_type = f.suspicion_type.value,
            severity       = f.severity,
            detail         = f.detail,
            is_reviewed    = f.is_reviewed,
            created_at     = f.created_at,
        )
        for f in flags
    ]


@router.patch("/cheating-flags/{flag_id}/review")
def review_cheating_flag(
    flag_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Mark a cheating flag as reviewed. Admin only."""
    flag = db.query(CheatingFlag).filter(CheatingFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found.")
    flag.is_reviewed = True
    db.commit()
    return {"message": f"Flag {flag_id} marked as reviewed."}
