






from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
# revision = 'ml_001_add_ml_tables'
revision = "a1b2c3d4e5f6"
# down_revision = None   # Set this to your current latest revision ID
down_revision = "c58384fec198"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── question_difficulty ───────────────────────────────────────────────────
    op.create_table(
        'question_difficulty',
        sa.Column('id',            sa.Integer(),     primary_key=True, index=True),
        sa.Column('question_id',   sa.Integer(),     sa.ForeignKey('questions.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('difficulty',    sa.String(10),    nullable=False, server_default='medium'),
        sa.Column('attempt_count', sa.Integer(),     nullable=False, server_default='0'),
        sa.Column('correct_count', sa.Integer(),     nullable=False, server_default='0'),
        sa.Column('created_at',    sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at',    sa.DateTime(timezone=True), nullable=True),
    )

    # ── attempt_question_timing ───────────────────────────────────────────────
    op.create_table(
        'attempt_question_timing',
        sa.Column('id',                  sa.Integer(), primary_key=True, index=True),
        sa.Column('attempt_id',          sa.Integer(), sa.ForeignKey('quiz_attempts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question_id',         sa.Integer(), sa.ForeignKey('questions.id',     ondelete='CASCADE'), nullable=False),
        sa.Column('time_taken_seconds',  sa.Float(),   nullable=False, server_default='0'),
        sa.Column('is_correct',          sa.Boolean(), nullable=False, server_default='false'),
    )
    op.create_index('ix_timing_attempt', 'attempt_question_timing', ['attempt_id'])
    op.create_index('ix_timing_question', 'attempt_question_timing', ['question_id'])

    # ── user_topic_profile ────────────────────────────────────────────────────
    op.create_table(
        'user_topic_profile',
        sa.Column('id',               sa.Integer(),  primary_key=True, index=True),
        sa.Column('user_id',          sa.Integer(),  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('category',         sa.String(100), nullable=False),
        sa.Column('total_questions',  sa.Integer(),  nullable=False, server_default='0'),
        sa.Column('correct_answers',  sa.Integer(),  nullable=False, server_default='0'),
        sa.Column('quizzes_taken',    sa.Integer(),  nullable=False, server_default='0'),
        sa.Column('mastery_score',    sa.Float(),    nullable=False, server_default='0'),
        sa.Column('improvement',      sa.Float(),    nullable=False, server_default='0'),
        sa.Column('is_weak_topic',    sa.Boolean(),  nullable=False, server_default='false'),
        sa.Column('last_attempted',   sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at',       sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('user_id', 'category', name='uq_user_topic'),
    )

    # ── recommendation_log ────────────────────────────────────────────────────
    op.create_table(
        'recommendation_log',
        sa.Column('id',         sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id',    sa.Integer(), sa.ForeignKey('users.id',   ondelete='CASCADE'), nullable=False),
        sa.Column('quiz_id',    sa.Integer(), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reason',     sa.String(200), nullable=True),
        sa.Column('score',      sa.Float(),     nullable=False, server_default='0'),
        sa.Column('was_taken',  sa.Boolean(),   nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    # ── cheating_flags ────────────────────────────────────────────────────────
    op.create_table(
        'cheating_flags',
        sa.Column('id',             sa.Integer(),  primary_key=True, index=True),
        sa.Column('user_id',        sa.Integer(),  sa.ForeignKey('users.id',         ondelete='CASCADE'), nullable=False),
        sa.Column('attempt_id',     sa.Integer(),  sa.ForeignKey('quiz_attempts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('quiz_id',        sa.Integer(),  sa.ForeignKey('quizzes.id',       ondelete='CASCADE'), nullable=False),
        sa.Column('suspicion_type', sa.String(40), nullable=False),
        sa.Column('severity',       sa.String(10), nullable=False, server_default='low'),
        sa.Column('detail',         sa.Text(),     nullable=True),
        sa.Column('is_reviewed',    sa.Boolean(),  nullable=False, server_default='false'),
        sa.Column('created_at',     sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('ix_cheat_user',    'cheating_flags', ['user_id'])
    op.create_index('ix_cheat_reviewed','cheating_flags', ['is_reviewed'])

    # ── smart_leaderboard_score ───────────────────────────────────────────────
    op.create_table(
        'smart_leaderboard_score',
        sa.Column('id',                sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id',           sa.Integer(), sa.ForeignKey('users.id',   ondelete='CASCADE'), nullable=False),
        sa.Column('quiz_id',           sa.Integer(), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('avg_score',         sa.Float(),   nullable=False, server_default='0'),
        sa.Column('consistency_score', sa.Float(),   nullable=False, server_default='0'),
        sa.Column('improvement_score', sa.Float(),   nullable=False, server_default='0'),
        sa.Column('composite_score',   sa.Float(),   nullable=False, server_default='0'),
        sa.Column('attempt_count',     sa.Integer(), nullable=False, server_default='0'),
        sa.Column('updated_at',        sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('user_id', 'quiz_id', name='uq_smart_lb'),
    )
    op.create_index('ix_smart_lb_quiz', 'smart_leaderboard_score', ['quiz_id'])


def downgrade() -> None:
    op.drop_table('smart_leaderboard_score')
    op.drop_table('cheating_flags')
    op.drop_table('recommendation_log')
    op.drop_table('user_topic_profile')
    op.drop_table('attempt_question_timing')
    op.drop_table('question_difficulty')
