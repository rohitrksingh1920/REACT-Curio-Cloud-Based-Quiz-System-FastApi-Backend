

# from datetime import datetime
# from typing import Optional

# from fastapi import APIRouter, Depends, HTTPException, Query, status
# from sqlalchemy.orm import Session

# from backend.app.core.database import get_db
# from backend.app.core.security import get_current_user, require_teacher
# from backend.app.core.timezone_utils import now_ist, IST          # ← IST import
# from backend.app.models.attempt import AttemptAnswer, QuizAttempt
# from backend.app.models.notification import Notification, NotificationType
# from backend.app.models.quiz import (
#     Quiz, Question, QuestionOption,
#     QuizCategory, QuizEnrollment, QuizStatus,
# )
# from backend.app.models.user import User, UserRole
# from backend.app.schemas.misc import (
#     AttemptResult,
#     AttemptSubmit,
#     EnrollRequest,
#     EnrollResponse,
# )
# from backend.app.schemas.quiz import (
#     QuizCreate,
#     QuizDetail,
#     QuizPublic,
#     QuizSummary,
#     QuizUpdate,
#     QuestionOut,
#     QuestionOutPublic,
#     OptionOut,
#     OptionOutPublic,
# )

# router = APIRouter()


# #  Shared helper: build IST-aware quiz datetime 

# def _quiz_ist_datetime(quiz: Quiz) -> Optional[datetime]:
#     """
#     Combine the stored date + time fields into a single timezone-aware
#     IST datetime, or None if the quiz has no schedule.

#     IMPORTANT: The teacher enters the time in IST (e.g. "17:13").
#     We must attach IST as the tzinfo — NOT UTC — otherwise the
#     comparison with now_ist() will be off by 5h 30m.
#     """
#     if not quiz.scheduled_date:
#         return None
#     return datetime.combine(
#         quiz.scheduled_date,
#         quiz.scheduled_time or datetime.min.time(),
#     ).replace(tzinfo=IST)                                          # ← IST, not UTC


# def _compute_status(quiz: Quiz, user_id: int) -> QuizStatus:
#     """Re-derive the live status for a quiz using the IST clock."""
#     now = now_ist()

#     # If the current user has a completed attempt, it's completed for them.
#     user_attempt = next(
#         (a for a in (quiz.attempts or []) if a.user_id == user_id and a.is_completed),
#         None,
#     )
#     if user_attempt:
#         return QuizStatus.completed

#     quiz_dt = _quiz_ist_datetime(quiz)
#     if quiz_dt and now < quiz_dt:
#         return QuizStatus.upcoming

#     return QuizStatus.active


# def _to_quiz_summary(quiz: Quiz, user_id: int) -> QuizSummary:
#     return QuizSummary(
#         id=quiz.id,
#         title=quiz.title,
#         category=quiz.category,
#         status=_compute_status(quiz, user_id),
#         duration_mins=quiz.duration_mins,
#         total_points=quiz.total_points,
#         scheduled_date=quiz.scheduled_date,
#         scheduled_time=quiz.scheduled_time,
#         enrolled_count=len(quiz.enrollments or []),
#         creator_name=quiz.creator.full_name if quiz.creator else "Unknown",
#         created_at=quiz.created_at,
#         is_attempted=bool(
#             next(
#                 (a for a in (quiz.attempts or []) if a.user_id == user_id and a.is_completed),
#                 None,
#             )
#         ),
#     )


# #  List quizzes 

# @router.get("", response_model=list[QuizSummary])
# def list_quizzes(
#     search: Optional[str] = Query(None),
#     status_filter: Optional[str] = Query(None, alias="status"),
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db),
# ):
#     """
#     Return the quizzes visible to the caller.
#     - Teachers/admins see all quizzes they created.
#     - Students see only quizzes they are enrolled in.
#     Status is re-computed live using IST so the list is always accurate.
#     """
#     if current_user.role in (UserRole.admin, UserRole.teacher):
#         query = db.query(Quiz).filter(Quiz.creator_id == current_user.id)
#     else:
#         enrolled_ids = [
#             e.quiz_id
#             for e in db.query(QuizEnrollment)
#             .filter(QuizEnrollment.user_id == current_user.id)
#             .all()
#         ]
#         if not enrolled_ids:
#             return []
#         query = db.query(Quiz).filter(Quiz.id.in_(enrolled_ids))

#     if search:
#         query = query.filter(Quiz.title.ilike(f"%{search}%"))

#     quizzes = query.order_by(Quiz.created_at.desc()).all()
#     summaries = [_to_quiz_summary(q, current_user.id) for q in quizzes]

#     # Apply live status filter AFTER computing real IST status
#     if status_filter and status_filter != "all":
#         summaries = [s for s in summaries if s.status == status_filter]

#     return summaries


# #  Get single quiz (creator / admin view) 

# @router.get("/{quiz_id}", response_model=QuizDetail)
# def get_quiz(
#     quiz_id: int,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db),
# ):
#     quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
#     if not quiz:
#         raise HTTPException(status_code=404, detail="Quiz not found.")

#     # Students can only view quizzes they are enrolled in
#     if current_user.role == UserRole.student:
#         enrolled = db.query(QuizEnrollment).filter(
#             QuizEnrollment.quiz_id == quiz_id,
#             QuizEnrollment.user_id == current_user.id,
#         ).first()
#         if not enrolled:
#             raise HTTPException(
#                 status_code=403,
#                 detail="You are not enrolled in this quiz.",
#             )

#     questions = [
#         QuestionOut(
#             id=q.id,
#             text=q.text,
#             order=q.order,
#             options=[
#                 OptionOut(id=o.id, text=o.text, is_correct=o.is_correct, order=o.order)
#                 for o in sorted(q.options, key=lambda x: x.order)
#             ],
#         )
#         for q in sorted(quiz.questions, key=lambda x: x.order)
#     ]

#     return QuizDetail(
#         id=quiz.id,
#         title=quiz.title,
#         category=quiz.category,
#         status=_compute_status(quiz, current_user.id),
#         duration_mins=quiz.duration_mins,
#         total_points=quiz.total_points,
#         scheduled_date=quiz.scheduled_date,
#         scheduled_time=quiz.scheduled_time,
#         enrolled_count=len(quiz.enrollments or []),
#         creator_name=quiz.creator.full_name if quiz.creator else "Unknown",
#         created_at=quiz.created_at,
#         questions=questions,
#     )


# #  Create quiz 

# @router.post("", response_model=QuizSummary, status_code=status.HTTP_201_CREATED)
# def create_quiz(
#     payload: QuizCreate,
#     current_user: User = Depends(require_teacher),
#     db: Session = Depends(get_db),
# ):
#     # Determine initial status from schedule
#     if payload.scheduled_date:
#         quiz_dt = datetime.combine(
#             payload.scheduled_date,
#             payload.scheduled_time or datetime.min.time(),
#         ).replace(tzinfo=IST)                                      # ← IST
#         initial_status = QuizStatus.upcoming if now_ist() < quiz_dt else QuizStatus.active
#     else:
#         initial_status = QuizStatus.active

#     quiz = Quiz(
#         title=payload.title,
#         category=payload.category,
#         duration_mins=payload.duration_mins,
#         total_points=payload.total_points,
#         scheduled_date=payload.scheduled_date,
#         scheduled_time=payload.scheduled_time,
#         status=initial_status,
#         creator_id=current_user.id,
#     )
#     db.add(quiz)
#     db.flush()

#     # Add questions + options
#     for q_idx, q_data in enumerate(payload.questions, start=1):
#         question = Question(
#             quiz_id=quiz.id,
#             text=q_data.text,
#             order=q_data.order or q_idx,
#         )
#         db.add(question)
#         db.flush()
#         for o_idx, o_data in enumerate(q_data.options, start=1):
#             db.add(QuestionOption(
#                 question_id=question.id,
#                 text=o_data.text,
#                 is_correct=o_data.is_correct,
#                 order=o_data.order or o_idx,
#             ))

#     # Enroll students passed in the payload + send notifications
#     if payload.student_ids:
#         for uid in payload.student_ids:
#             existing = db.query(QuizEnrollment).filter(
#                 QuizEnrollment.quiz_id == quiz.id,
#                 QuizEnrollment.user_id == uid,
#             ).first()
#             if not existing:
#                 db.add(QuizEnrollment(quiz_id=quiz.id, user_id=uid))
#                 db.add(Notification(
#                     user_id=uid,
#                     type=NotificationType.quiz_assigned,
#                     title="New Quiz Assigned",
#                     message=(
#                         f"You have been enrolled in '{quiz.title}' "
#                         f"by {current_user.full_name}. Good luck!"
#                     ),
#                 ))

#     db.commit()
#     db.refresh(quiz)
#     return _to_quiz_summary(quiz, current_user.id)


# #  Update quiz 

# @router.patch("/{quiz_id}", response_model=QuizSummary)
# def update_quiz(
#     quiz_id: int,
#     payload: QuizUpdate,
#     current_user: User = Depends(require_teacher),
#     db: Session = Depends(get_db),
# ):
#     quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
#     if not quiz:
#         raise HTTPException(status_code=404, detail="Quiz not found.")
#     if quiz.creator_id != current_user.id and current_user.role != UserRole.admin:
#         raise HTTPException(status_code=403, detail="You can only edit your own quizzes.")

#     if payload.title is not None:
#         quiz.title = payload.title.strip()
#     if payload.category is not None:
#         quiz.category = payload.category
#     if payload.duration_mins is not None:
#         if payload.duration_mins < 1:
#             raise HTTPException(status_code=422, detail="Duration must be at least 1 minute.")
#         quiz.duration_mins = payload.duration_mins
#     if payload.total_points is not None:
#         if payload.total_points < 1:
#             raise HTTPException(status_code=422, detail="Total points must be at least 1.")
#         quiz.total_points = payload.total_points
#     if payload.scheduled_date is not None:
#         quiz.scheduled_date = payload.scheduled_date
#     if payload.scheduled_time is not None:
#         quiz.scheduled_time = payload.scheduled_time
#     if payload.status is not None:
#         quiz.status = payload.status

#     # Recompute status if schedule changed
#     if payload.scheduled_date is not None or payload.scheduled_time is not None:
#         quiz_dt = _quiz_ist_datetime(quiz)                         # ← IST
#         if quiz_dt:
#             quiz.status = QuizStatus.upcoming if now_ist() < quiz_dt else QuizStatus.active

#     db.commit()
#     db.refresh(quiz)
#     return _to_quiz_summary(quiz, current_user.id)


# #  Delete quiz 

# @router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
# def delete_quiz(
#     quiz_id: int,
#     current_user: User = Depends(require_teacher),
#     db: Session = Depends(get_db),
# ):
#     quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
#     if not quiz:
#         raise HTTPException(status_code=404, detail="Quiz not found.")
#     if quiz.creator_id != current_user.id and current_user.role != UserRole.admin:
#         raise HTTPException(status_code=403, detail="You can only delete your own quizzes.")
#     db.delete(quiz)
#     db.commit()


# #  Take quiz (student view — no correct answers exposed) 

# @router.get("/{quiz_id}/take", response_model=QuizPublic)
# def take_quiz(
#     quiz_id: int,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db),
# ):
#     """
#     Return the quiz to the student for answering.
#     Correct answers are stripped from the response.

#     BUG 1 FIX: availability check now uses now_ist() compared against an
#     IST-labelled datetime — NOT UTC.  Previously `replace(tzinfo=timezone.utc)`
#     made a 17:13 IST quiz appear unavailable until 22:43 IST.
#     """
#     quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
#     if not quiz:
#         raise HTTPException(status_code=404, detail="Quiz not found.")

#     #  Enrollment check  
#     if current_user.role == UserRole.student:
#         enrolled = db.query(QuizEnrollment).filter(
#             QuizEnrollment.quiz_id == quiz_id,
#             QuizEnrollment.user_id == current_user.id,
#         ).first()
#         if not enrolled:
#             raise HTTPException(
#                 status_code=403,
#                 detail="You are not enrolled in this quiz.",
#             )

#     #  Already completed check  
#     already_done = db.query(QuizAttempt).filter(
#         QuizAttempt.quiz_id == quiz_id,
#         QuizAttempt.user_id == current_user.id,
#         QuizAttempt.is_completed == True,
#     ).first()
#     if already_done:
#         raise HTTPException(
#             status_code=400,
#             detail="You have already completed this quiz. View the leaderboard for your results.",
#         )

#     #  Availability check (IST) 
#     quiz_dt = _quiz_ist_datetime(quiz)                             # ← IST helper
#     if quiz_dt:
#         now = now_ist()                                            # ← IST now
#         if now < quiz_dt:
#             # Format the start time in IST for the error message
#             ist_str = quiz_dt.strftime("%d %b %Y, %H:%M IST")
#             raise HTTPException(
#                 status_code=403,
#                 detail=f"This quiz is not yet available. It starts at {ist_str}.",
#             )

#     #  Return questions without correct answers 
#     questions_public = [
#         QuestionOutPublic(
#             id=q.id,
#             text=q.text,
#             order=q.order,
#             options=[
#                 OptionOutPublic(id=o.id, text=o.text, order=o.order)
#                 for o in sorted(q.options, key=lambda x: x.order)
#             ],
#         )
#         for q in sorted(quiz.questions, key=lambda x: x.order)
#     ]

#     return QuizPublic(
#         id=quiz.id,
#         title=quiz.title,
#         category=quiz.category,
#         duration_mins=quiz.duration_mins,
#         total_points=quiz.total_points,
#         questions=questions_public,
#     )


# #  Submit quiz 

# @router.post("/{quiz_id}/submit", response_model=AttemptResult)
# def submit_quiz(
#     quiz_id: int,
#     payload: AttemptSubmit,
#     current_user: User = Depends(get_current_user),
#     db: Session = Depends(get_db),
# ):
#     """Score the student's answers and persist the attempt."""
#     quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
#     if not quiz:
#         raise HTTPException(status_code=404, detail="Quiz not found.")

#     # Prevent duplicate submissions
#     existing = db.query(QuizAttempt).filter(
#         QuizAttempt.quiz_id == quiz_id,
#         QuizAttempt.user_id == current_user.id,
#         QuizAttempt.is_completed == True,
#     ).first()
#     if existing:
#         raise HTTPException(
#             status_code=400,
#             detail="You have already submitted this quiz.",
#         )

#     # Validate all question IDs belong to this quiz
#     valid_question_ids = {q.id for q in quiz.questions}
#     for ans in payload.answers:
#         if ans.question_id not in valid_question_ids:
#             raise HTTPException(
#                 status_code=422,
#                 detail=f"Question {ans.question_id} does not belong to this quiz.",
#             )

#     # Build correct-option lookup
#     correct_map: dict[int, int] = {}
#     for q in quiz.questions:
#         for opt in q.options:
#             if opt.is_correct:
#                 correct_map[q.id] = opt.id

#     # Score answers
#     attempt = QuizAttempt(
#         user_id=current_user.id,
#         quiz_id=quiz_id,
#         is_completed=True,
#         completed_at=now_ist(),                                    # ← IST timestamp
#     )
#     db.add(attempt)
#     db.flush()

#     correct_count = 0
#     for ans in payload.answers:
#         is_correct = correct_map.get(ans.question_id) == ans.selected_option_id
#         if is_correct:
#             correct_count += 1
#         db.add(AttemptAnswer(
#             attempt_id=attempt.id,
#             question_id=ans.question_id,
#             selected_option_id=ans.selected_option_id,
#             is_correct=is_correct,
#         ))

#     total_questions = len(quiz.questions)
#     score_pct  = round((correct_count / total_questions) * 100, 2) if total_questions else 0.0
#     score      = round((score_pct / 100) * quiz.total_points, 2)
#     passed     = score_pct >= 60

#     attempt.score     = score
#     attempt.score_pct = score_pct

#     # Performance notification
#     if passed:
#         msg = f"You scored {score_pct}% on '{quiz.title}'. Great work!"
#     else:
#         msg = f"You scored {score_pct}% on '{quiz.title}'. Keep practising!"

#     db.add(Notification(
#         user_id=current_user.id,
#         type=NotificationType.performance,
#         title="Quiz Result",
#         message=msg,
#     ))

#     db.commit()
#     db.refresh(attempt)

#     return AttemptResult(
#         attempt_id=attempt.id,
#         quiz_title=quiz.title,
#         score=score,
#         score_pct=score_pct,
#         total_points=quiz.total_points,
#         correct_count=correct_count,
#         total_questions=total_questions,
#         passed=passed,
#         completed_at=attempt.completed_at,
#     )


# #  Enroll students 

# @router.post("/{quiz_id}/enroll", response_model=EnrollResponse)
# def enroll_students(
#     quiz_id: int,
#     payload: EnrollRequest,
#     current_user: User = Depends(require_teacher),
#     db: Session = Depends(get_db),
# ):
#     quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
#     if not quiz:
#         raise HTTPException(status_code=404, detail="Quiz not found.")
#     if quiz.creator_id != current_user.id and current_user.role != UserRole.admin:
#         raise HTTPException(status_code=403, detail="You can only enroll students in your own quizzes.")

#     enrolled: list[int]         = []
#     already_enrolled: list[int] = []
#     not_found: list[int]        = []

#     for uid in payload.user_ids:
#         student = db.query(User).filter(
#             User.id == uid, User.role == UserRole.student,
#         ).first()
#         if not student:
#             not_found.append(uid)
#             continue

#         existing = db.query(QuizEnrollment).filter(
#             QuizEnrollment.quiz_id == quiz_id,
#             QuizEnrollment.user_id == uid,
#         ).first()
#         if existing:
#             already_enrolled.append(uid)
#             continue

#         db.add(QuizEnrollment(quiz_id=quiz_id, user_id=uid))
#         db.add(Notification(
#             user_id=uid,
#             type=NotificationType.quiz_assigned,
#             title="New Quiz Assigned",
#             message=(
#                 f"You have been enrolled in '{quiz.title}' "
#                 f"by {current_user.full_name}. Good luck!"
#             ),
#         ))
#         enrolled.append(uid)

#     db.commit()

#     parts = []
#     if enrolled:
#         parts.append(f"{len(enrolled)} student(s) enrolled")
#     if already_enrolled:
#         parts.append(f"{len(already_enrolled)} already enrolled")
#     if not_found:
#         parts.append(f"{len(not_found)} user ID(s) not found or not students")

#     return EnrollResponse(
#         enrolled=enrolled,
#         already_enrolled=already_enrolled,
#         not_found=not_found,
#         message=". ".join(parts) + "." if parts else "No changes made.",
#     )


# #  Remove enrollment 

# @router.delete("/{quiz_id}/enroll/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
# def remove_enrollment(
#     quiz_id: int,
#     user_id: int,
#     current_user: User = Depends(require_teacher),
#     db: Session = Depends(get_db),
# ):
#     quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
#     if not quiz:
#         raise HTTPException(status_code=404, detail="Quiz not found.")
#     if quiz.creator_id != current_user.id and current_user.role != UserRole.admin:
#         raise HTTPException(status_code=403, detail="Access denied.")

#     enrollment = db.query(QuizEnrollment).filter(
#         QuizEnrollment.quiz_id == quiz_id,
#         QuizEnrollment.user_id == user_id,
#     ).first()
#     if not enrollment:
#         raise HTTPException(status_code=404, detail="Enrollment not found.")

#     db.delete(enrollment)
#     db.commit()


# #  List enrolled students for a quiz 

# @router.get("/{quiz_id}/students")
# def get_enrolled_students(
#     quiz_id: int,
#     current_user: User = Depends(require_teacher),
#     db: Session = Depends(get_db),
# ):
#     quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
#     if not quiz:
#         raise HTTPException(status_code=404, detail="Quiz not found.")

#     return [
#         {
#             "id": e.user.id,
#             "full_name": e.user.full_name,
#             "email": e.user.email,
#             "enrolled_at": e.enrolled_at,
#         }
#         for e in quiz.enrollments
#         if e.user
#     ]
















from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, require_teacher
from backend.app.core.timezone_utils import now_ist, IST
from backend.app.models.attempt import AttemptAnswer, QuizAttempt
from backend.app.models.notification import Notification, NotificationType
from backend.app.models.quiz import (
    Quiz, Question, QuestionOption,
    QuizCategory, QuizEnrollment, QuizStatus,
)
from backend.app.models.user import User, UserRole
from backend.app.schemas.misc import (
    AttemptResult, AttemptSubmit, EnrollRequest, EnrollResponse,
)
from backend.app.schemas.quiz import (
    QuizCreate, QuizDetail, QuizPublic, QuizSummary, QuizUpdate,
    QuestionOut, QuestionOutPublic, OptionOut, OptionOutPublic,
)
from backend.app.schemas.ml import QuestionTimingItem

# ML imports — all wrapped in try/except so a missing migration never breaks the core
try:
    from backend.app.core.ml_engine import (
        build_topic_profile,
        compute_smart_leaderboard_score,
        detect_suspicious_behavior,
        update_question_difficulty_stats,
    )
    from backend.app.models.ml import AttemptQuestionTiming
    ML_ENABLED = True
except Exception:
    ML_ENABLED = False

router = APIRouter()


# ── IST datetime helper ───────────────────────────────────────────────────────

def _quiz_ist_datetime(quiz: Quiz) -> Optional[datetime]:
    if not quiz.scheduled_date:
        return None
    return datetime.combine(
        quiz.scheduled_date,
        quiz.scheduled_time or datetime.min.time(),
    ).replace(tzinfo=IST)


def _compute_status(quiz: Quiz, user_id: int) -> QuizStatus:
    now = now_ist()
    user_attempt = next(
        (a for a in (quiz.attempts or []) if a.user_id == user_id and a.is_completed),
        None,
    )
    if user_attempt:
        return QuizStatus.completed
    quiz_dt = _quiz_ist_datetime(quiz)
    if quiz_dt and now < quiz_dt:
        return QuizStatus.upcoming
    return QuizStatus.active


def _to_quiz_summary(quiz: Quiz, user_id: int) -> QuizSummary:
    return QuizSummary(
        id=quiz.id, title=quiz.title, category=quiz.category,
        status=_compute_status(quiz, user_id),
        duration_mins=quiz.duration_mins, total_points=quiz.total_points,
        scheduled_date=quiz.scheduled_date, scheduled_time=quiz.scheduled_time,
        enrolled_count=len(quiz.enrollments or []),
        creator_name=quiz.creator.full_name if quiz.creator else "Unknown",
        created_at=quiz.created_at,
        is_attempted=bool(
            next(
                (a for a in (quiz.attempts or []) if a.user_id == user_id and a.is_completed),
                None,
            )
        ),
    )


# ── List quizzes ──────────────────────────────────────────────────────────────

@router.get("", response_model=list[QuizSummary])
def list_quizzes(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role in (UserRole.admin, UserRole.teacher):
        query = db.query(Quiz).filter(Quiz.creator_id == current_user.id)
    else:
        enrolled_ids = [
            e.quiz_id for e in db.query(QuizEnrollment)
            .filter(QuizEnrollment.user_id == current_user.id).all()
        ]
        if not enrolled_ids:
            return []
        query = db.query(Quiz).filter(Quiz.id.in_(enrolled_ids))

    if search:
        query = query.filter(Quiz.title.ilike(f"%{search}%"))

    quizzes   = query.order_by(Quiz.created_at.desc()).all()
    summaries = [_to_quiz_summary(q, current_user.id) for q in quizzes]

    if status_filter and status_filter != "all":
        summaries = [s for s in summaries if s.status == status_filter]

    return summaries


# ── Get quiz detail ───────────────────────────────────────────────────────────

@router.get("/{quiz_id}", response_model=QuizDetail)
def get_quiz(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    if current_user.role == UserRole.student:
        enrolled = db.query(QuizEnrollment).filter(
            QuizEnrollment.quiz_id == quiz_id,
            QuizEnrollment.user_id == current_user.id,
        ).first()
        if not enrolled:
            raise HTTPException(status_code=403, detail="You are not enrolled in this quiz.")

    questions = [
        QuestionOut(
            id=q.id, text=q.text, order=q.order,
            options=[
                OptionOut(id=o.id, text=o.text, is_correct=o.is_correct, order=o.order)
                for o in sorted(q.options, key=lambda x: x.order)
            ],
        )
        for q in sorted(quiz.questions, key=lambda x: x.order)
    ]

    return QuizDetail(
        id=quiz.id, title=quiz.title, category=quiz.category,
        status=_compute_status(quiz, current_user.id),
        duration_mins=quiz.duration_mins, total_points=quiz.total_points,
        scheduled_date=quiz.scheduled_date, scheduled_time=quiz.scheduled_time,
        enrolled_count=len(quiz.enrollments or []),
        creator_name=quiz.creator.full_name if quiz.creator else "Unknown",
        created_at=quiz.created_at, questions=questions,
    )


# ── Create quiz ───────────────────────────────────────────────────────────────

@router.post("", response_model=QuizSummary, status_code=status.HTTP_201_CREATED)
def create_quiz(
    payload: QuizCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    if payload.scheduled_date:
        quiz_dt = datetime.combine(
            payload.scheduled_date,
            payload.scheduled_time or datetime.min.time(),
        ).replace(tzinfo=IST)
        initial_status = QuizStatus.upcoming if now_ist() < quiz_dt else QuizStatus.active
    else:
        initial_status = QuizStatus.active

    quiz = Quiz(
        title=payload.title, category=payload.category,
        duration_mins=payload.duration_mins, total_points=payload.total_points,
        scheduled_date=payload.scheduled_date, scheduled_time=payload.scheduled_time,
        status=initial_status, creator_id=current_user.id,
    )
    db.add(quiz)
    db.flush()

    for q_idx, q_data in enumerate(payload.questions, start=1):
        question = Question(quiz_id=quiz.id, text=q_data.text, order=q_data.order or q_idx)
        db.add(question)
        db.flush()
        for o_idx, o_data in enumerate(q_data.options, start=1):
            db.add(QuestionOption(
                question_id=question.id, text=o_data.text,
                is_correct=o_data.is_correct, order=o_data.order or o_idx,
            ))
        # Seed default difficulty record for ML
        if ML_ENABLED:
            from backend.app.models.ml import QuestionDifficulty, DifficultyLevel
            db.add(QuestionDifficulty(question_id=question.id, difficulty=DifficultyLevel.medium))

    if payload.student_ids:
        for uid in payload.student_ids:
            existing = db.query(QuizEnrollment).filter(
                QuizEnrollment.quiz_id == quiz.id,
                QuizEnrollment.user_id == uid,
            ).first()
            if not existing:
                db.add(QuizEnrollment(quiz_id=quiz.id, user_id=uid))
                db.add(Notification(
                    user_id=uid, type=NotificationType.quiz_assigned,
                    title="New Quiz Assigned",
                    message=f"You have been enrolled in '{quiz.title}' by {current_user.full_name}. Good luck!",
                ))

    db.commit()
    db.refresh(quiz)
    return _to_quiz_summary(quiz, current_user.id)


# ── Update quiz ───────────────────────────────────────────────────────────────

@router.patch("/{quiz_id}", response_model=QuizSummary)
def update_quiz(
    quiz_id: int,
    payload: QuizUpdate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    if quiz.creator_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="You can only edit your own quizzes.")

    if payload.title is not None:
        quiz.title = payload.title.strip()
    if payload.category is not None:
        quiz.category = payload.category
    if payload.duration_mins is not None:
        if payload.duration_mins < 1:
            raise HTTPException(status_code=422, detail="Duration must be at least 1 minute.")
        quiz.duration_mins = payload.duration_mins
    if payload.total_points is not None:
        if payload.total_points < 1:
            raise HTTPException(status_code=422, detail="Total points must be at least 1.")
        quiz.total_points = payload.total_points
    if payload.scheduled_date is not None:
        quiz.scheduled_date = payload.scheduled_date
    if payload.scheduled_time is not None:
        quiz.scheduled_time = payload.scheduled_time
    if payload.status is not None:
        quiz.status = payload.status

    if payload.scheduled_date is not None or payload.scheduled_time is not None:
        quiz_dt = _quiz_ist_datetime(quiz)
        if quiz_dt:
            quiz.status = QuizStatus.upcoming if now_ist() < quiz_dt else QuizStatus.active

    db.commit()
    db.refresh(quiz)
    return _to_quiz_summary(quiz, current_user.id)


# ── Delete quiz ───────────────────────────────────────────────────────────────

@router.delete("/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quiz(
    quiz_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    if quiz.creator_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="You can only delete your own quizzes.")
    db.delete(quiz)
    db.commit()


# ── Take quiz ─────────────────────────────────────────────────────────────────

@router.get("/{quiz_id}/take", response_model=QuizPublic)
def take_quiz(
    quiz_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    if current_user.role == UserRole.student:
        enrolled = db.query(QuizEnrollment).filter(
            QuizEnrollment.quiz_id == quiz_id,
            QuizEnrollment.user_id == current_user.id,
        ).first()
        if not enrolled:
            raise HTTPException(status_code=403, detail="You are not enrolled in this quiz.")

    already_done = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.is_completed == True,
    ).first()
    if already_done:
        raise HTTPException(
            status_code=400,
            detail="You have already completed this quiz. View the leaderboard for your results.",
        )

    quiz_dt = _quiz_ist_datetime(quiz)
    if quiz_dt:
        now = now_ist()
        if now < quiz_dt:
            ist_str = quiz_dt.strftime("%d %b %Y, %H:%M IST")
            raise HTTPException(
                status_code=403,
                detail=f"This quiz is not yet available. It starts at {ist_str}.",
            )

    questions_public = [
        QuestionOutPublic(
            id=q.id, text=q.text, order=q.order,
            options=[
                OptionOutPublic(id=o.id, text=o.text, order=o.order)
                for o in sorted(q.options, key=lambda x: x.order)
            ],
        )
        for q in sorted(quiz.questions, key=lambda x: x.order)
    ]

    return QuizPublic(
        id=quiz.id, title=quiz.title, category=quiz.category,
        duration_mins=quiz.duration_mins, total_points=quiz.total_points,
        questions=questions_public,
    )


# ── Submit quiz (with ML hooks) ───────────────────────────────────────────────

@router.post("/{quiz_id}/submit", response_model=AttemptResult)
def submit_quiz(
    quiz_id: int,
    payload: AttemptSubmit,
    timings: Optional[List[QuestionTimingItem]] = Body(None, embed=True,
        description="Per-question timing data for adaptive engine and cheating detection"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Score the student's answers and persist the attempt.
    Optionally accepts per-question timings for ML features.
    """
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    existing = db.query(QuizAttempt).filter(
        QuizAttempt.quiz_id == quiz_id,
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.is_completed == True,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted this quiz.")

    valid_question_ids = {q.id for q in quiz.questions}
    for ans in payload.answers:
        if ans.question_id not in valid_question_ids:
            raise HTTPException(
                status_code=422,
                detail=f"Question {ans.question_id} does not belong to this quiz.",
            )

    correct_map: dict[int, int] = {}
    for q in quiz.questions:
        for opt in q.options:
            if opt.is_correct:
                correct_map[q.id] = opt.id

    attempt = QuizAttempt(
        user_id=current_user.id, quiz_id=quiz_id,
        is_completed=True, completed_at=now_ist(),
    )
    db.add(attempt)
    db.flush()

    correct_count = 0
    for ans in payload.answers:
        is_correct = correct_map.get(ans.question_id) == ans.selected_option_id
        if is_correct:
            correct_count += 1
        db.add(AttemptAnswer(
            attempt_id=attempt.id, question_id=ans.question_id,
            selected_option_id=ans.selected_option_id, is_correct=is_correct,
        ))
        # ML: update per-question difficulty stats
        if ML_ENABLED:
            try:
                update_question_difficulty_stats(
                    db=db, question_id=ans.question_id, is_correct=is_correct
                )
            except Exception:
                pass

    total_questions = len(quiz.questions)
    score_pct = round((correct_count / total_questions) * 100, 2) if total_questions else 0.0
    score     = round((score_pct / 100) * quiz.total_points, 2)
    passed    = score_pct >= 60

    attempt.score     = score
    attempt.score_pct = score_pct

    # ── ML: persist question timings ─────────────────────────────────────────
    if ML_ENABLED and timings:
        try:
            timing_map = {t.question_id: t for t in timings}
            for ans in payload.answers:
                t = timing_map.get(ans.question_id)
                if t:
                    db.add(AttemptQuestionTiming(
                        attempt_id=attempt.id,
                        question_id=ans.question_id,
                        time_taken_seconds=t.time_taken,
                        is_correct=(correct_map.get(ans.question_id) == ans.selected_option_id),
                    ))
        except Exception:
            pass

    db.flush()

    # ── ML: build topic profile + smart leaderboard ───────────────────────────
    if ML_ENABLED:
        try:
            build_topic_profile(db=db, user_id=current_user.id)
        except Exception:
            pass
        try:
            compute_smart_leaderboard_score(
                db=db, user_id=current_user.id, quiz_id=quiz_id
            )
        except Exception:
            pass

    # ── ML: cheating detection ────────────────────────────────────────────────
    if ML_ENABLED and timings:
        try:
            timing_dicts = [
                {
                    "question_id":  t.question_id,
                    "time_taken":   t.time_taken,
                    "option_index": t.option_index,
                    "is_correct":   correct_map.get(t.question_id) == (
                        next(
                            (a.selected_option_id for a in payload.answers
                             if a.question_id == t.question_id),
                            None,
                        )
                    ),
                }
                for t in timings
            ]
            flags = detect_suspicious_behavior(
                db=db,
                attempt_id=attempt.id,
                user_id=current_user.id,
                quiz_id=quiz_id,
                score_pct=score_pct,
                timings=timing_dicts,
            )
            for flag in flags:
                db.add(flag)
        except Exception:
            pass

    # Performance notification
    db.add(Notification(
        user_id=current_user.id,
        type=NotificationType.performance,
        title="Quiz Result",
        message=(
            f"You scored {score_pct}% on '{quiz.title}'. Great work!"
            if passed else
            f"You scored {score_pct}% on '{quiz.title}'. Keep practising!"
        ),
    ))

    db.commit()
    db.refresh(attempt)

    return AttemptResult(
        attempt_id=attempt.id, quiz_title=quiz.title,
        score=score, score_pct=score_pct, total_points=quiz.total_points,
        correct_count=correct_count, total_questions=total_questions,
        passed=passed, completed_at=attempt.completed_at,
    )


# ── Enroll students ───────────────────────────────────────────────────────────

@router.post("/{quiz_id}/enroll", response_model=EnrollResponse)
def enroll_students(
    quiz_id: int,
    payload: EnrollRequest,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    if quiz.creator_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="You can only enroll students in your own quizzes.")

    enrolled: list[int]         = []
    already_enrolled: list[int] = []
    not_found: list[int]        = []

    for uid in payload.user_ids:
        student = db.query(User).filter(User.id == uid, User.role == UserRole.student).first()
        if not student:
            not_found.append(uid)
            continue

        existing = db.query(QuizEnrollment).filter(
            QuizEnrollment.quiz_id == quiz_id,
            QuizEnrollment.user_id == uid,
        ).first()
        if existing:
            already_enrolled.append(uid)
            continue

        db.add(QuizEnrollment(quiz_id=quiz_id, user_id=uid))
        db.add(Notification(
            user_id=uid, type=NotificationType.quiz_assigned,
            title="New Quiz Assigned",
            message=f"You have been enrolled in '{quiz.title}' by {current_user.full_name}. Good luck!",
        ))
        enrolled.append(uid)

    db.commit()
    parts = []
    if enrolled:        parts.append(f"{len(enrolled)} student(s) enrolled")
    if already_enrolled: parts.append(f"{len(already_enrolled)} already enrolled")
    if not_found:       parts.append(f"{len(not_found)} not found or not students")

    return EnrollResponse(
        enrolled=enrolled, already_enrolled=already_enrolled, not_found=not_found,
        message=". ".join(parts) + "." if parts else "No changes made.",
    )


@router.delete("/{quiz_id}/enroll/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_enrollment(
    quiz_id: int, user_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    if quiz.creator_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied.")

    enrollment = db.query(QuizEnrollment).filter(
        QuizEnrollment.quiz_id == quiz_id,
        QuizEnrollment.user_id == user_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found.")

    db.delete(enrollment)
    db.commit()


@router.get("/{quiz_id}/students")
def get_enrolled_students(
    quiz_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    return [
        {
            "id":          e.user.id,
            "full_name":   e.user.full_name,
            "email":       e.user.email,
            "enrolled_at": e.enrolled_at,
        }
        for e in quiz.enrollments if e.user
    ]
