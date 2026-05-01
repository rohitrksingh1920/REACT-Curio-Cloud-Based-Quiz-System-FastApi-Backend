




import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Text, Enum, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.app.core.database import Base


# ─────────────────────────────────────────────────────────────────────────────
# Feature 1 — Adaptive Quiz Engine
# ─────────────────────────────────────────────────────────────────────────────

class DifficultyLevel(str, enum.Enum):
    easy   = "easy"
    medium = "medium"
    hard   = "hard"


class QuestionDifficulty(Base):
    """
    Stores the difficulty label for each question.
    Set by the teacher at creation time (default: medium).
    Updated automatically by the adaptive engine after enough attempts.
    """
    __tablename__ = "question_difficulty"

    id          = Column(Integer, primary_key=True, index=True)
    question_id = Column(
        Integer,
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    difficulty  = Column(Enum(DifficultyLevel), default=DifficultyLevel.medium, nullable=False)
    # How many times this question has been attempted / answered correctly
    attempt_count = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)

    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    question = relationship("Question", backref="difficulty_info")

    @property
    def accuracy_rate(self) -> float:
        if self.attempt_count == 0:
            return 0.0
        return round(self.correct_count / self.attempt_count, 4)

    def __repr__(self):
        return f"<QuestionDifficulty q={self.question_id} level={self.difficulty}>"


class AttemptQuestionTiming(Base):
    """
    Records how long (in seconds) a student spent on each question in an attempt.
    Powers: adaptive engine, cheating detection.
    """
    __tablename__ = "attempt_question_timing"

    id                 = Column(Integer, primary_key=True, index=True)
    attempt_id         = Column(
        Integer, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False
    )
    question_id        = Column(
        Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False
    )
    time_taken_seconds = Column(Float, nullable=False, default=0.0)
    is_correct         = Column(Boolean, default=False)

    attempt  = relationship("QuizAttempt", backref="question_timings")
    question = relationship("Question",    backref="timings")

    def __repr__(self):
        return f"<Timing attempt={self.attempt_id} q={self.question_id} t={self.time_taken_seconds}s>"


# ─────────────────────────────────────────────────────────────────────────────
# Features 1, 2, 3 — User Topic Profile (mastery per category)
# ─────────────────────────────────────────────────────────────────────────────

class UserTopicProfile(Base):
    """
    Aggregated mastery score per user per quiz category.
    Rebuilt after every quiz attempt.

    mastery_score  — 0.0 to 100.0 (weighted: accuracy + recency)
    accuracy       — raw correct / total for this topic
    is_weak_topic  — True if accuracy < 50%
    improvement    — delta from previous mastery score (for smart leaderboard)
    """
    __tablename__ = "user_topic_profile"
    __table_args__ = (
        UniqueConstraint("user_id", "category", name="uq_user_topic"),
    )

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    category     = Column(String(100), nullable=False)      # QuizCategory.value
    total_questions = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    quizzes_taken   = Column(Integer, default=0)
    mastery_score   = Column(Float, default=0.0)            # 0–100
    improvement     = Column(Float, default=0.0)            # delta from prev mastery
    is_weak_topic   = Column(Boolean, default=False)
    last_attempted  = Column(DateTime(timezone=True), nullable=True)
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="topic_profiles")

    @property
    def accuracy(self) -> float:
        if self.total_questions == 0:
            return 0.0
        return round(self.correct_answers / self.total_questions * 100, 1)

    def __repr__(self):
        return f"<TopicProfile user={self.user_id} cat={self.category} mastery={self.mastery_score}>"


# ─────────────────────────────────────────────────────────────────────────────
# Feature 2 — Recommendation Log
# ─────────────────────────────────────────────────────────────────────────────

class RecommendationLog(Base):
    """Tracks which quizzes were recommended to which user and whether they were taken."""
    __tablename__ = "recommendation_log"

    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quiz_id     = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    reason      = Column(String(200), nullable=True)    # e.g. "weak topic: Mathematics"
    score       = Column(Float, default=0.0)            # recommendation strength 0–1
    was_taken   = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User",  backref="recommendation_logs")
    quiz = relationship("Quiz",  backref="recommendation_logs")

    def __repr__(self):
        return f"<Recommendation user={self.user_id} quiz={self.quiz_id} score={self.score}>"


# ─────────────────────────────────────────────────────────────────────────────
# Feature 4 — Cheating / Suspicious Behavior Detection
# ─────────────────────────────────────────────────────────────────────────────

class SuspicionType(str, enum.Enum):
    too_fast          = "too_fast"           # answered too quickly
    pattern_answers   = "pattern_answers"    # same option selected throughout
    sudden_score_jump = "sudden_score_jump"  # score jumped > 40% vs history
    high_score_low_time = "high_score_low_time"  # > 90% score with < 20% time used


class CheatingFlag(Base):
    """
    A flag raised when suspicious behavior is detected.
    Does NOT automatically penalise — gives admin visibility.
    """
    __tablename__ = "cheating_flags"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    attempt_id     = Column(Integer, ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False)
    quiz_id        = Column(Integer, ForeignKey("quizzes.id",  ondelete="CASCADE"), nullable=False)
    suspicion_type = Column(Enum(SuspicionType), nullable=False)
    severity       = Column(String(10), default="low")      # low / medium / high
    detail         = Column(Text, nullable=True)            # human-readable explanation
    is_reviewed    = Column(Boolean, default=False)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    user    = relationship("User",        backref="cheating_flags")
    attempt = relationship("QuizAttempt", backref="cheating_flags")
    quiz    = relationship("Quiz",        backref="cheating_flags")

    def __repr__(self):
        return f"<CheatingFlag user={self.user_id} type={self.suspicion_type} sev={self.severity}>"


# ─────────────────────────────────────────────────────────────────────────────
# Feature 6 — Smart Leaderboard composite score
# ─────────────────────────────────────────────────────────────────────────────

class SmartLeaderboardScore(Base):
    """
    Pre-computed composite leaderboard score per user per quiz.
    Recomputed after each attempt.

    composite_score = 0.5 * avg_score
                    + 0.3 * consistency_score
                    + 0.2 * improvement_score
    """
    __tablename__ = "smart_leaderboard_score"
    __table_args__ = (
        UniqueConstraint("user_id", "quiz_id", name="uq_smart_lb"),
    )

    id                 = Column(Integer, primary_key=True, index=True)
    user_id            = Column(Integer, ForeignKey("users.id",   ondelete="CASCADE"), nullable=False)
    quiz_id            = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    avg_score          = Column(Float, default=0.0)        # mean score_pct across attempts
    consistency_score  = Column(Float, default=0.0)        # 100 - std_dev (higher = more consistent)
    improvement_score  = Column(Float, default=0.0)        # latest - first attempt
    composite_score    = Column(Float, default=0.0)        # weighted final
    attempt_count      = Column(Integer, default=0)
    updated_at         = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="smart_scores")
    quiz = relationship("Quiz", backref="smart_scores")

    def __repr__(self):
        return f"<SmartLB user={self.user_id} quiz={self.quiz_id} comp={self.composite_score}>"
