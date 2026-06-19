from datetime import date

from sqlalchemy.orm import Session

from app.domain.enums import UserMovementType
from app.infrastructure.db import models


class UserMovementRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        *,
        user_id: int,
        movement_type: UserMovementType,
        movement_date: date,
    ) -> models.UserMovement:
        movement = models.UserMovement(
            user_id=user_id,
            movement_type=movement_type.value,
            movement_date=movement_date,
        )
        self.db.add(movement)
        return movement
