



# # from backend.app.models.user import User, UserRole
# # from backend.app.models.quiz import (
# #     Quiz, Question, QuestionOption,
# #     QuizStatus, QuizCategory,
# #     QuizEnrollment,          
# # )
# # from backend.app.models.attempt import QuizAttempt, AttemptAnswer
# # from backend.app.models.notification import Notification, NotificationType

# # __all__ = [
# #     "User", "UserRole",
# #     "Quiz", "Question", "QuestionOption", "QuizStatus", "QuizCategory",
# #     "QuizEnrollment",
# #     "QuizAttempt", "AttemptAnswer",
# #     "Notification", "NotificationType",
# # ]






















# # backend/app/models/__init__.py
# # ================================
# # CRITICAL: All models must be imported here so that:
# #   1. alembic/env.py  `from backend.app.models import *`  picks them up
# #   2. main.py  Base.metadata.create_all()  creates ALL tables
# #
# # Without ml.py imported here, ML tables are never created
# # even if the alembic migration runs.

# from backend.app.models.user import User, UserRole
# from backend.app.models.quiz import (
#     Quiz, Question, QuestionOption,
#     QuizEnrollment, QuizStatus, QuizCategory,
# )
# from backend.app.models.attempt import QuizAttempt, AttemptAnswer
# from backend.app.models.notification import Notification, NotificationType
# from backend.app.models.quizAssignment import QuizAssignment

# # ── ML models (MUST be imported for tables to be created) ────────────────────
# from backend.app.models.ml import (          # ← THIS WAS MISSING
#     QuestionDifficulty,
#     AttemptQuestionTiming,
#     UserTopicProfile,
#     RecommendationLog,
#     CheatingFlag,
#     SmartLeaderboardScore,
#     DifficultyLevel,
#     SuspicionType,
# )

# __all__ = [
#     # Core
#     "User", "UserRole",
#     "Quiz", "Question", "QuestionOption", "QuizEnrollment", "QuizStatus", "QuizCategory",
#     "QuizAttempt", "AttemptAnswer",
#     "Notification", "NotificationType",
#     "QuizAssignment",
#     # ML
#     "QuestionDifficulty", "AttemptQuestionTiming", "UserTopicProfile",
#     "RecommendationLog", "CheatingFlag", "SmartLeaderboardScore",
#     "DifficultyLevel", "SuspicionType",
# ]
















# backend/app/models/__init__.py
# ================================
# CRITICAL: All models must be imported here so that:
#   1. alembic/env.py  `from backend.app.models import *`  picks them up
#   2. main.py  Base.metadata.create_all()  creates ALL tables
#
# Without ml.py imported here, ML tables are never created
# even if the alembic migration runs.

from backend.app.models.user import User, UserRole
from backend.app.models.quiz import (
    Quiz, Question, QuestionOption,
    QuizEnrollment, QuizStatus, QuizCategory,
)
from backend.app.models.attempt import QuizAttempt, AttemptAnswer
from backend.app.models.notification import Notification, NotificationType
from backend.app.models.quizAssignment import QuizAssignment

# ── ML models (MUST be imported for tables to be created) ────────────────────
from backend.app.models.ml import (          # ← THIS WAS MISSING
    QuestionDifficulty,
    AttemptQuestionTiming,
    UserTopicProfile,
    RecommendationLog,
    CheatingFlag,
    SmartLeaderboardScore,
    DifficultyLevel,
    SuspicionType,
)

__all__ = [
    # Core
    "User", "UserRole",
    "Quiz", "Question", "QuestionOption", "QuizEnrollment", "QuizStatus", "QuizCategory",
    "QuizAttempt", "AttemptAnswer",
    "Notification", "NotificationType",
    "QuizAssignment",
    # ML
    "QuestionDifficulty", "AttemptQuestionTiming", "UserTopicProfile",
    "RecommendationLog", "CheatingFlag", "SmartLeaderboardScore",
    "DifficultyLevel", "SuspicionType",
]
