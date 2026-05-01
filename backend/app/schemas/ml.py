

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─────────────────────────────────────────────────────────────────────────────
# Feature 1 — Adaptive Quiz
# ─────────────────────────────────────────────────────────────────────────────

class AdaptiveQuizResponse(BaseModel):
    quiz_id:                 int
    remaining_question_ids:  List[int]
    difficulty_map:          dict        # {question_id: "easy"|"medium"|"hard"}
    total_remaining:         int


class QuestionDifficultyOut(BaseModel):
    question_id:   int
    question_text: str
    difficulty:    str     # "easy" | "medium" | "hard"
    attempt_count: int
    accuracy_rate: float   # 0–100 %


# ─────────────────────────────────────────────────────────────────────────────
# Feature 2 — Recommendations
# ─────────────────────────────────────────────────────────────────────────────

class RecommendationItem(BaseModel):
    quiz_id:       int
    title:         str
    category:      str
    reason:        str
    score:         float
    duration_mins: int
    total_points:  int


# ─────────────────────────────────────────────────────────────────────────────
# Feature 3 — Insights & Weak Topics
# ─────────────────────────────────────────────────────────────────────────────

class WeakTopicItem(BaseModel):
    category:      str
    accuracy:      float    # 0–100 %
    mastery:       float    # 0–100 weighted mastery score
    is_weak:       bool
    improvement:   float    # delta from previous mastery
    quizzes_taken: int


class InsightsResponse(BaseModel):
    weak_topics:           List[str]        # just category names
    weak_topic_details:    List[dict]       # full detail with severity + message
    improvement_messages:  List[str]
    topic_profile:         List[WeakTopicItem]


# ─────────────────────────────────────────────────────────────────────────────
# Feature 4 — Cheating Detection
# ─────────────────────────────────────────────────────────────────────────────

class CheatingFlagOut(BaseModel):
    id:             int
    user_id:        int
    user_name:      str
    attempt_id:     int
    quiz_id:        int
    quiz_title:     str
    suspicion_type: str
    severity:       str
    detail:         Optional[str] = None
    is_reviewed:    bool
    created_at:     datetime
    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────────────────────
# Feature 6 — Smart Leaderboard
# ─────────────────────────────────────────────────────────────────────────────

class SmartLeaderboardEntry(BaseModel):
    rank:               int
    user_id:            int
    full_name:          str
    profile_picture:    Optional[str] = None
    avg_score:          float
    consistency_score:  float
    improvement_score:  float
    composite_score:    float
    attempt_count:      int
    is_current_user:    bool = False


class SmartLeaderboardResponse(BaseModel):
    quiz_id:            int
    quiz_title:         str
    total_participants: int
    entries:            List[SmartLeaderboardEntry]
    current_user_rank:  Optional[int] = None
    scoring_formula:    str


# ─────────────────────────────────────────────────────────────────────────────
# Timing payload (from frontend during quiz submission)
# ─────────────────────────────────────────────────────────────────────────────

class QuestionTimingItem(BaseModel):
    question_id:   int
    time_taken:    float    # seconds
    option_index:  int      # 0-based index of selected option (for pattern detection)
    is_correct:    bool


class SubmitWithTimingsPayload(BaseModel):
    """Extended submit payload that includes per-question timings."""
    answers:  List[dict]                    # same as existing AttemptSubmit.answers
    timings:  List[QuestionTimingItem]      # NEW: per-question timing data
