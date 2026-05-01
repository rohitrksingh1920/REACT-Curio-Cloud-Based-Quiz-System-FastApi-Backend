"""merge heads

Revision ID: 8297b8631ba0
Revises: b5ec4c9e6c66, a1b2c3d4e5f6
Create Date: 2026-05-01 19:57:51.047198+05:30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8297b8631ba0'
down_revision: Union[str, None] = ('b5ec4c9e6c66', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
