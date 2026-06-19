from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import String, and_, cast, delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.application import schemas
from app.domain.enums import AttendanceStatus, JustificationStatus, ReportStatus, UserMovementType, UserStatus
from app.infrastructure.db import models
from app.infrastructure.repositories.user_profile_sections import (
    NORMALIZED_USER_SECTION_FIELDS,
    UserProfileSectionsRepository,
)
from app.infrastructure.repositories.user_movements import UserMovementRepository
from app.interfaces.api.auth import hash_password


class CrudService:
    def __init__(self, db: Session):
        self.db = db
        self.user_profile_sections_repository = UserProfileSectionsRepository(db)
        self.user_movement_repository = UserMovementRepository(db)

    @staticmethod
    def _has_meaningful_data(value: object) -> bool:
        if value is None:
            return False
        if isinstance(value, str):
            return bool(value.strip())
        if isinstance(value, (int, float, bool)):
            return True
        if isinstance(value, dict):
            return any(CrudService._has_meaningful_data(item) for item in value.values())
        if isinstance(value, list):
            return any(CrudService._has_meaningful_data(item) for item in value)
        return True

    @staticmethod
    def _user_table_data(payload_data: dict) -> dict:
        return {
            key: value
            for key, value in payload_data.items()
            if key not in NORMALIZED_USER_SECTION_FIELDS
        }

    @staticmethod
    def _user_load_options() -> tuple:
        return (
            selectinload(models.User.responsible),
            selectinload(models.User.residential),
            selectinload(models.User.schooling),
        )

    def _delete_attendance_dependencies(
        self,
        *,
        user_ids: list[int] | None = None,
        activity_ids: list[int] | None = None,
    ) -> None:
        attendance_filters = []
        if user_ids:
            attendance_filters.append(models.Attendance.user_id.in_(user_ids))
        if activity_ids:
            attendance_filters.append(models.Attendance.activity_id.in_(activity_ids))
        if not attendance_filters:
            return

        attendance_ids = list(
            self.db.scalars(select(models.Attendance.id).where(or_(*attendance_filters))).all()
        )
        if attendance_ids:
            self.db.execute(
                delete(models.AbsenceJustification).where(
                    models.AbsenceJustification.attendance_id.in_(attendance_ids)
                )
            )
        self.db.execute(delete(models.Attendance).where(or_(*attendance_filters)))

    def _delete_report_dependencies(self, report_ids: list[int]) -> None:
        if not report_ids:
            return
        self.db.execute(delete(models.ReportApproval).where(models.ReportApproval.report_id.in_(report_ids)))
        self.db.execute(delete(models.ReportVersion).where(models.ReportVersion.report_id.in_(report_ids)))

    def _delete_participant_dependencies(self, participant_ids: list[int]) -> None:
        if not participant_ids:
            return
        self.db.execute(
            delete(models.ParticipantAttachment).where(
                models.ParticipantAttachment.participant_id.in_(participant_ids)
            )
        )
        self.db.execute(
            delete(models.ParticipantVersion).where(models.ParticipantVersion.participant_id.in_(participant_ids))
        )

    def create_atendimento(
        self,
        payload: schemas.AtendimentoCreate,
        unidade_social_id: int,
        colaborador_id: int | None,
        atendente_nome: str,
        atendente_funcao: str,
    ) -> models.Atendimento:
        if colaborador_id is not None:
            collaborator = self.db.get(models.Collaborator, colaborador_id)
            if collaborator is None:
                raise HTTPException(status_code=404, detail="Colaborador responsavel nao encontrado.")
            atendente_nome = collaborator.name
            atendente_funcao = collaborator.role
        item = models.Atendimento(
            unidade_social_id=unidade_social_id,
            colaborador_id=colaborador_id,
            atendente_nome=atendente_nome,
            atendente_funcao=atendente_funcao,
            **payload.model_dump(),
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def list_atendimentos(self, unidade_social_id: int | None = None) -> list[models.Atendimento]:
        query = select(models.Atendimento)
        if unidade_social_id is not None:
            query = query.where(models.Atendimento.unidade_social_id == unidade_social_id)
        query = query.order_by(models.Atendimento.data_atendimento.desc(), models.Atendimento.nome.asc())
        return list(self.db.scalars(query).all())

    def get_atendimento(self, atendimento_id: int) -> models.Atendimento:
        item = self.db.get(models.Atendimento, atendimento_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Atendimento nao encontrado.")
        return item

    def update_atendimento(
        self,
        atendimento_id: int,
        payload: schemas.AtendimentoUpdate,
    ) -> models.Atendimento:
        item = self.get_atendimento(atendimento_id)
        for key, value in payload.model_dump().items():
            setattr(item, key, value)
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_atendimento(self, atendimento_id: int) -> None:
        item = self.get_atendimento(atendimento_id)
        self.db.delete(item)
        self.db.commit()

    def create_unit(self, payload: schemas.UnitCreate) -> models.Unit:
        try:
            unit = models.Unit(**payload.model_dump())
            self.db.add(unit)
            self.db.commit()
            self.db.refresh(unit)
            return unit
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="JÃ¡ existe unidade com o mesmo nome ou e-mail.",
            )

    def list_units(self) -> list[models.Unit]:
        return list(self.db.scalars(select(models.Unit)).all())

    def get_unit(self, unit_id: int) -> models.Unit:
        unit = self.db.get(models.Unit, unit_id)
        if unit is None:
            raise HTTPException(status_code=404, detail="Unidade nÃ£o encontrada.")
        return unit

    def update_unit(self, unit_id: int, payload: schemas.UnitUpdate) -> models.Unit:
        unit = self.get_unit(unit_id)
        for key, value in payload.model_dump().items():
            setattr(unit, key, value)
        try:
            self.db.commit()
            self.db.refresh(unit)
            return unit
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="JÃ¡ existe unidade com o mesmo nome ou e-mail.",
            )

    def delete_unit(self, unit_id: int) -> None:
        unit = self.get_unit(unit_id)
        try:
            user_ids = list(self.db.scalars(select(models.User.id).where(models.User.unit_id == unit_id)).all())
            activity_ids = list(
                self.db.scalars(select(models.Activity.id).where(models.Activity.unit_id == unit_id)).all()
            )
            report_ids = list(self.db.scalars(select(models.Report.id).where(models.Report.unit_id == unit_id)).all())
            participant_ids = list(
                self.db.scalars(select(models.Participant.id).where(models.Participant.unit_id == unit_id)).all()
            )

            if user_ids or activity_ids:
                enrollment_filters = []
                if user_ids:
                    enrollment_filters.append(models.Enrollment.user_id.in_(user_ids))
                if activity_ids:
                    enrollment_filters.append(models.Enrollment.activity_id.in_(activity_ids))
                self.db.execute(
                    delete(models.Enrollment).where(or_(*enrollment_filters))
                )
                self._delete_attendance_dependencies(user_ids=user_ids, activity_ids=activity_ids)

            if report_ids:
                self._delete_report_dependencies(report_ids)
                self.db.execute(delete(models.Report).where(models.Report.id.in_(report_ids)))

            if participant_ids:
                self._delete_participant_dependencies(participant_ids)
                self.db.execute(delete(models.Participant).where(models.Participant.id.in_(participant_ids)))

            if activity_ids:
                self.db.execute(delete(models.Activity).where(models.Activity.id.in_(activity_ids)))

            if user_ids:
                self.db.execute(
                    delete(models.ComposicaoFamiliar).where(models.ComposicaoFamiliar.usuario_id.in_(user_ids))
                )
                self.db.execute(
                    delete(models.SituacaoHabitacional).where(models.SituacaoHabitacional.usuario_id.in_(user_ids))
                )
                self.db.execute(
                    delete(models.CondicaoSaude).where(models.CondicaoSaude.usuario_id.in_(user_ids))
                )
                self.db.execute(
                    delete(models.SituacaoFamiliar).where(models.SituacaoFamiliar.usuario_id.in_(user_ids))
                )
                self.db.execute(
                    delete(models.ParecerUsuario).where(models.ParecerUsuario.usuario_id.in_(user_ids))
                )
                self.db.execute(delete(models.User).where(models.User.id.in_(user_ids)))

            self.db.delete(unit)
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Unidade possui vÃ­nculos e nÃ£o pode ser excluÃ­da.",
            )

    def create_user(self, payload: schemas.UserCreate) -> models.User:
        payload_data = payload.model_dump(exclude={"composicao_familiar", "situacao_habitacional", "condicao_saude", "situacao_familiar", "parecer"})
        payload_data["status"] = UserStatus.ACTIVE.value
        payload_data["status_updated_at"] = None
        user_data = self._user_table_data(payload_data)
        composicao_payload = payload.model_dump().get("composicao_familiar", [])
        situacao_payload = payload.model_dump().get("situacao_habitacional")
        condicao_payload = payload.model_dump().get("condicao_saude")
        situacao_familiar_payload = payload.model_dump().get("situacao_familiar")
        parecer_payload = payload.model_dump().get("parecer")
        duplicate = self.db.scalar(
            select(models.User).where(
                or_(
                    models.User.rg == payload_data["rg"],
                    models.User.nis_number == payload_data["nis_number"],
                )
            )
        )
        if duplicate is not None:
            if duplicate.rg == payload_data["rg"]:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="JÃ¡ existe usuÃ¡rio com o mesmo RG.")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="JÃ¡ existe usuÃ¡rio com o mesmo NIS.")
        try:
            user = models.User(**user_data)
            self.db.add(user)
            self.db.flush()
            movement_date = user.created_at.date() if user.created_at else datetime.utcnow().date()
            self.user_movement_repository.create(
                user_id=user.id,
                movement_type=UserMovementType.ENTRADA,
                movement_date=movement_date,
            )
            self.db.add(models.UserSocialUnit(user_id=user.id, social_unit_id=user.unit_id))
            for item in composicao_payload:
                self.db.add(
                    models.ComposicaoFamiliar(
                        usuario_id=user.id,
                        nome=item["nome"],
                        parentesco=item["parentesco"],
                        sexo=item["sexo"],
                        idade=item["idade"],
                        naturalidade=item["naturalidade"],
                        estado_civil=item["estado_civil"],
                        escolaridade=item["escolaridade"],
                    )
                )
            if self._has_meaningful_data(situacao_payload):
                self.db.add(
                    models.SituacaoHabitacional(
                        usuario_id=user.id,
                        **situacao_payload,
                    )
                )
            if self._has_meaningful_data(condicao_payload):
                self.db.add(
                    models.CondicaoSaude(
                        usuario_id=user.id,
                        **condicao_payload,
                    )
                )
            if self._has_meaningful_data(situacao_familiar_payload):
                self.db.add(
                    models.SituacaoFamiliar(
                        usuario_id=user.id,
                        **situacao_familiar_payload,
                    )
                )
            if self._has_meaningful_data(parecer_payload):
                self.db.add(
                    models.ParecerUsuario(
                        usuario_id=user.id,
                        **parecer_payload,
                    )
                )
            self.user_profile_sections_repository.upsert_for_user(user.id, payload_data)
            self.db.commit()
            self.db.refresh(user)
            return user
        except IntegrityError as exc:
            self.db.rollback()
            message = str(getattr(exc, "orig", exc))
            if "full_name" in message:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Estrutura do banco desatualizada: coluna legada full_name impede o cadastro. Execute a migration corretiva.",
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="NÃ£o foi possÃ­vel salvar o usuÃ¡rio por conflito de dados.",
            )

    def list_users(self, status_filter: str | None = None) -> list[models.User]:
        query = select(models.User).options(*self._user_load_options())
        if status_filter:
            query = query.where(cast(models.User.status, String) == status_filter)
        return list(self.db.scalars(query).all())

    def get_user(self, user_id: int) -> models.User:
        user = self.db.scalar(
            select(models.User)
            .options(*self._user_load_options())
            .where(models.User.id == user_id)
        )
        if user is None:
            raise HTTPException(status_code=404, detail="UsuÃ¡rio nÃ£o encontrado.")
        return user

    def update_user(self, user_id: int, payload: schemas.UserUpdate) -> models.User:
        user = self.get_user(user_id)
        payload_data = payload.model_dump(exclude={"composicao_familiar", "situacao_habitacional", "condicao_saude", "situacao_familiar", "parecer"})
        payload_data["status"] = user.status
        user_data = self._user_table_data(payload_data)
        composicao_payload = payload.model_dump().get("composicao_familiar", [])
        situacao_payload = payload.model_dump().get("situacao_habitacional")
        condicao_payload = payload.model_dump().get("condicao_saude")
        situacao_familiar_payload = payload.model_dump().get("situacao_familiar")
        parecer_payload = payload.model_dump().get("parecer")
        duplicate = self.db.scalar(
            select(models.User).where(
                and_(
                    models.User.id != user_id,
                    or_(
                        models.User.rg == payload_data["rg"],
                        models.User.nis_number == payload_data["nis_number"],
                    ),
                )
            )
        )
        if duplicate is not None:
            if duplicate.rg == payload_data["rg"]:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="JÃ¡ existe usuÃ¡rio com o mesmo RG.")
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="JÃ¡ existe usuÃ¡rio com o mesmo NIS.")
        for key, value in user_data.items():
            setattr(user, key, value)
        try:
            self.db.execute(delete(models.UserSocialUnit).where(models.UserSocialUnit.user_id == user_id))
            self.db.add(models.UserSocialUnit(user_id=user.id, social_unit_id=user.unit_id))
            self.db.execute(delete(models.ComposicaoFamiliar).where(models.ComposicaoFamiliar.usuario_id == user_id))
            self.db.execute(delete(models.SituacaoHabitacional).where(models.SituacaoHabitacional.usuario_id == user_id))
            self.db.execute(delete(models.CondicaoSaude).where(models.CondicaoSaude.usuario_id == user_id))
            self.db.execute(delete(models.SituacaoFamiliar).where(models.SituacaoFamiliar.usuario_id == user_id))
            self.db.execute(delete(models.ParecerUsuario).where(models.ParecerUsuario.usuario_id == user_id))
            for item in composicao_payload:
                self.db.add(
                    models.ComposicaoFamiliar(
                        usuario_id=user.id,
                        nome=item["nome"],
                        parentesco=item["parentesco"],
                        sexo=item["sexo"],
                        idade=item["idade"],
                        naturalidade=item["naturalidade"],
                        estado_civil=item["estado_civil"],
                        escolaridade=item["escolaridade"],
                    )
                )
            if self._has_meaningful_data(situacao_payload):
                self.db.add(
                    models.SituacaoHabitacional(
                        usuario_id=user.id,
                        **situacao_payload,
                    )
                )
            if self._has_meaningful_data(condicao_payload):
                self.db.add(
                    models.CondicaoSaude(
                        usuario_id=user.id,
                        **condicao_payload,
                    )
                )
            if self._has_meaningful_data(situacao_familiar_payload):
                self.db.add(
                    models.SituacaoFamiliar(
                        usuario_id=user.id,
                        **situacao_familiar_payload,
                    )
                )
            if self._has_meaningful_data(parecer_payload):
                self.db.add(
                    models.ParecerUsuario(
                        usuario_id=user.id,
                        **parecer_payload,
                    )
                )
            self.user_profile_sections_repository.upsert_for_user(user.id, payload_data)
            self.db.commit()
            self.db.refresh(user)
            return user
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="NÃ£o foi possÃ­vel atualizar o usuÃ¡rio por conflito de dados.",
            )

    def delete_user(self, user_id: int) -> None:
        user = self.db.get(models.User, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="UsuÃ¡rio nÃ£o encontrado.")
        try:
            current_status = user.status.value if isinstance(user.status, UserStatus) else str(user.status)
            if current_status != UserStatus.INACTIVE.value:
                status_updated_at = datetime.utcnow()
                user.status = UserStatus.INACTIVE.value
                user.status_updated_at = status_updated_at
                self.user_movement_repository.create(
                    user_id=user.id,
                    movement_type=UserMovementType.SAIDA,
                    movement_date=status_updated_at.date(),
                )
                self.db.execute(delete(models.UserGroup).where(models.UserGroup.user_id == user_id))
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="UsuÃ¡rio possui vÃ­nculos e nÃ£o pode ser excluÃ­do.",
            )

    def activate_user(self, user_id: int) -> models.User:
        user = self.db.get(models.User, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="UsuÃ¡rio nÃ£o encontrado.")
        current_status = user.status.value if isinstance(user.status, UserStatus) else str(user.status)
        if current_status != UserStatus.ACTIVE.value:
            status_updated_at = datetime.utcnow()
            user.status = UserStatus.ACTIVE.value
            user.status_updated_at = status_updated_at
            self.user_movement_repository.create(
                user_id=user.id,
                movement_type=UserMovementType.ENTRADA,
                movement_date=status_updated_at.date(),
            )
        self.db.commit()
        self.db.refresh(user)
        return user

    def create_activity(self, payload: schemas.ActivityCreate) -> models.Activity:
        payload_data = payload.model_dump()
        weekdays = payload_data.pop("dias_semana", [])
        activity_name = payload_data["name"].strip()
        missing_groups = [
            group_id for group_id in payload_data["group_ids"] if self.db.get(models.Group, group_id) is None
        ]
        if missing_groups:
            raise HTTPException(status_code=404, detail="Grupo nao encontrado.")
        duplicate = self.db.scalar(
            select(models.Activity).where(func.lower(models.Activity.name) == activity_name.lower())
        )
        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ja existe uma atividade cadastrada com este nome.",
            )
        payload_data["name"] = activity_name
        payload_data["group_id"] = payload_data["group_ids"][0]
        payload_data.pop("group_ids", None)
        activity = models.Activity(**payload_data)
        self.db.add(activity)
        self.db.flush()
        for group_id in payload.group_ids:
            self.db.add(models.ActivityGroup(activity_id=activity.id, group_id=group_id))
        for weekday in weekdays:
            self.db.add(models.ActivityWeekday(activity_id=activity.id, weekday=weekday))
        self.db.commit()
        self.db.refresh(activity)
        return activity

    def list_activities(self) -> list[models.Activity]:
        return list(self.db.scalars(select(models.Activity).order_by(models.Activity.name.asc())).all())

    def get_activity(self, activity_id: int) -> models.Activity:
        activity = self.db.get(models.Activity, activity_id)
        if activity is None:
            raise HTTPException(status_code=404, detail="Atividade nao encontrada.")
        return activity

    def update_activity(self, activity_id: int, payload: schemas.ActivityUpdate) -> models.Activity:
        activity = self.get_activity(activity_id)
        activity_name = payload.name.strip()
        missing_groups = [group_id for group_id in payload.group_ids if self.db.get(models.Group, group_id) is None]
        if missing_groups:
            raise HTTPException(status_code=404, detail="Grupo nao encontrado.")
        duplicate = self.db.scalar(
            select(models.Activity).where(
                and_(
                    models.Activity.id != activity_id,
                    func.lower(models.Activity.name) == activity_name.lower(),
                )
            )
        )
        if duplicate is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ja existe uma atividade cadastrada com este nome.",
            )
        activity.name = activity_name
        activity.group_id = payload.group_ids[0]
        activity.description = payload.description
        self.db.execute(delete(models.ActivityGroup).where(models.ActivityGroup.activity_id == activity_id))
        for group_id in payload.group_ids:
            self.db.add(models.ActivityGroup(activity_id=activity_id, group_id=group_id))
        self.db.execute(delete(models.ActivityWeekday).where(models.ActivityWeekday.activity_id == activity_id))
        for weekday in payload.dias_semana:
            self.db.add(models.ActivityWeekday(activity_id=activity_id, weekday=weekday))
        self.db.commit()
        self.db.refresh(activity)
        return activity

    def delete_activity(self, activity_id: int) -> None:
        activity = self.get_activity(activity_id)
        try:
            self.db.execute(delete(models.ActivityWeekday).where(models.ActivityWeekday.activity_id == activity_id))
            self.db.execute(delete(models.Enrollment).where(models.Enrollment.activity_id == activity_id))
            self._delete_attendance_dependencies(activity_ids=[activity_id])
            self.db.delete(activity)
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Atividade possui vÃ­nculos e nÃ£o pode ser excluÃ­da.",
            )

    def create_group(self, payload: schemas.GroupCreate) -> models.Group:
        group_name = payload.name.strip()
        duplicate = self.db.scalar(
            select(models.Group).where(func.lower(models.Group.name) == group_name.lower())
        )
        if duplicate is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ja existe um grupo cadastrado com este nome.")
        item = models.Group(
            name=group_name,
            shift=payload.shift,
            initial_age=payload.initial_age,
            final_age=payload.final_age,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def list_groups(self) -> list[models.Group]:
        return list(self.db.scalars(select(models.Group).order_by(models.Group.name.asc())).all())

    def get_group(self, group_id: int) -> models.Group:
        item = self.db.get(models.Group, group_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Grupo nao encontrado.")
        return item

    def update_group(self, group_id: int, payload: schemas.GroupUpdate) -> models.Group:
        item = self.get_group(group_id)
        group_name = payload.name.strip()
        duplicate = self.db.scalar(
            select(models.Group).where(
                and_(
                    models.Group.id != group_id,
                    func.lower(models.Group.name) == group_name.lower(),
                )
            )
        )
        if duplicate is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ja existe um grupo cadastrado com este nome.")
        item.name = group_name
        item.shift = payload.shift
        item.initial_age = payload.initial_age
        item.final_age = payload.final_age
        self.db.commit()
        self.db.refresh(item)
        return item

    def delete_group(self, group_id: int) -> None:
        item = self.get_group(group_id)
        self.db.delete(item)
        self.db.commit()

    def create_enrollment(self, payload: schemas.EnrollmentCreate) -> models.Enrollment:
        enrollment = models.Enrollment(**payload.model_dump())
        self.db.add(enrollment)
        self.db.commit()
        self.db.refresh(enrollment)
        return enrollment

    def list_enrollments(self) -> list[models.Enrollment]:
        return list(self.db.scalars(select(models.Enrollment)).all())

    def delete_enrollment(self, enrollment_id: int) -> None:
        enrollment = self.db.get(models.Enrollment, enrollment_id)
        if enrollment is None:
            raise HTTPException(status_code=404, detail="InscriÃ§Ã£o nÃ£o encontrada.")
        try:
            self.db.delete(enrollment)
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="InscriÃ§Ã£o possui vÃ­nculos e nÃ£o pode ser excluÃ­da.",
            )

    def create_collaborator(self, payload: schemas.CollaboratorCreate) -> models.Collaborator:
        self._validate_collaborator_role(payload.role)
        try:
            values = payload.model_dump()
            values["password_hash"] = hash_password(payload.password)
            values.pop("password", None)
            collaborator = models.Collaborator(**values)
            self.db.add(collaborator)
            self.db.commit()
            self.db.refresh(collaborator)
            return collaborator
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=409, detail="Ja existe colaborador com mesmo CPF ou e-mail.")

    def list_collaborators(self) -> list[models.Collaborator]:
        return list(self.db.scalars(select(models.Collaborator)).all())

    def get_collaborator(self, collaborator_id: int) -> models.Collaborator:
        row = self.db.get(models.Collaborator, collaborator_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Colaborador nao encontrado.")
        return row

    def update_collaborator(
        self, collaborator_id: int, payload: schemas.CollaboratorUpdate
    ) -> models.Collaborator:
        self._validate_collaborator_role(payload.role)
        row = self.get_collaborator(collaborator_id)
        values = payload.model_dump()
        password = values.pop("password", None)
        for key, value in values.items():
            setattr(row, key, value)
        if password:
            row.password_hash = hash_password(password)
        try:
            self.db.commit()
            self.db.refresh(row)
            return row
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=409, detail="Ja existe colaborador com mesmo CPF ou e-mail.")

    def _validate_collaborator_role(self, role: str) -> None:
        profile = self.db.scalar(select(models.Profile).where(models.Profile.name == role))
        if profile is None:
            raise HTTPException(status_code=400, detail="Perfil de colaborador invalido.")

    def delete_collaborator(self, collaborator_id: int) -> None:
        row = self.get_collaborator(collaborator_id)
        self.db.delete(row)
        self.db.commit()


class AttendanceService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, payload: schemas.AttendanceCreate) -> models.Attendance:
        attendance = models.Attendance(**payload.model_dump())
        self.db.add(attendance)
        self.db.commit()
        self.db.refresh(attendance)
        return attendance

    def bulk_register(self, payloads: list[schemas.AttendanceCreate]) -> list[models.Attendance]:
        rows = [models.Attendance(**item.model_dump()) for item in payloads]
        self.db.add_all(rows)
        self.db.commit()
        for row in rows:
            self.db.refresh(row)
        return rows

    def justify_absence(self, payload: schemas.JustificationCreate) -> models.AbsenceJustification:
        attendance = self.db.get(models.Attendance, payload.attendance_id)
        if attendance is None or attendance.status != AttendanceStatus.ABSENT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Justificativa sÃ³ pode ser criada para falta registrada.",
            )
        justification = models.AbsenceJustification(**payload.model_dump())
        attendance.status = AttendanceStatus.JUSTIFIED_ABSENT
        self.db.add(justification)
        self.db.commit()
        self.db.refresh(justification)
        return justification

    def decide_justification(
        self, justification_id: int, payload: schemas.JustificationDecision
    ) -> models.AbsenceJustification:
        item = self.db.get(models.AbsenceJustification, justification_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Justificativa nÃ£o encontrada.")
        item.status = payload.status
        self.db.commit()
        self.db.refresh(item)
        return item


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    def create_report(self, payload: schemas.ReportCreate) -> models.Report:
        report = models.Report(unit_id=payload.unit_id, title=payload.title)
        self.db.add(report)
        self.db.flush()

        version = models.ReportVersion(report_id=report.id, version_number=1, content=payload.content)
        self.db.add(version)
        self.db.commit()
        self.db.refresh(report)
        return report

    def send_report(self, report_id: int) -> models.Report:
        report = self.db.get(models.Report, report_id)
        if report is None:
            raise HTTPException(status_code=404, detail="RelatÃ³rio nÃ£o encontrado")
        report.status = ReportStatus.SENT
        self.db.commit()
        self.db.refresh(report)
        return report

    def review_report(self, report_id: int, payload: schemas.ReportDecision) -> models.Report:
        report = self.db.get(models.Report, report_id)
        if report is None:
            raise HTTPException(status_code=404, detail="RelatÃ³rio nÃ£o encontrado")
        if payload.decision == ReportStatus.REJECTED and not payload.reason:
            raise HTTPException(status_code=400, detail="Motivo obrigatÃ³rio para reprovaÃ§Ã£o")
        report.status = payload.decision
        approval = models.ReportApproval(
            report_id=report_id,
            decision=payload.decision,
            reviewer_name=payload.reviewer_name,
            reason=payload.reason,
        )
        self.db.add(approval)
        self.db.commit()
        self.db.refresh(report)
        return report


class ParticipantService:
    REQUIRED_CONCLUDE_FIELDS = ["identificacao", "responsavel", "endereco", "escolaridade", "autorizacoes", "parecer"]

    def __init__(self, db: Session):
        self.db = db

    def create(self, payload: schemas.ParticipantCreate) -> models.Participant:
        item = models.Participant(**payload.model_dump(), status="rascunho", current_data={})
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update_stage(self, participant_id: int, payload: schemas.ParticipantStageUpdate) -> models.Participant:
        item = self.db.get(models.Participant, participant_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Participante nÃ£o encontrado")
        current = item.current_data or {}
        current[payload.stage] = payload.data
        item.current_data = current

        version_count = self.db.scalar(
            select(func.count(models.ParticipantVersion.id)).where(
                models.ParticipantVersion.participant_id == participant_id
            )
        )
        version = models.ParticipantVersion(
            participant_id=participant_id,
            version_number=(version_count or 0) + 1,
            payload=current,
        )
        self.db.add(version)
        self.db.commit()
        self.db.refresh(item)
        return item

    def conclude(self, participant_id: int, _: schemas.ParticipantConclude) -> models.Participant:
        item = self.db.get(models.Participant, participant_id)
        if item is None:
            raise HTTPException(status_code=404, detail="Participante nÃ£o encontrado")
        current = item.current_data or {}
        missing = [key for key in self.REQUIRED_CONCLUDE_FIELDS if key not in current]
        if missing:
            raise HTTPException(status_code=400, detail=f"Etapas obrigatÃ³rias pendentes: {', '.join(missing)}")
        item.status = "concluido"
        self.db.commit()
        self.db.refresh(item)
        return item

    def list_participants(self) -> list[models.Participant]:
        return list(self.db.scalars(select(models.Participant)).all())

    def history(self, participant_id: int) -> list[models.ParticipantVersion]:
        query = select(models.ParticipantVersion).where(
            models.ParticipantVersion.participant_id == participant_id
        )
        return list(self.db.scalars(query).all())


class GroupClassificationService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _normalize_shift(value: str | None) -> str:
        if not value:
            return ""
        lowered = value.strip().lower()
        return (
            lowered.replace("ã", "a")
            .replace("á", "a")
            .replace("â", "a")
            .replace("é", "e")
            .replace("ê", "e")
            .replace("í", "i")
            .replace("ó", "o")
            .replace("ô", "o")
            .replace("õ", "o")
            .replace("ú", "u")
            .replace("ç", "c")
        )

    def _is_user_active(self, user: models.User) -> bool:
        return str(user.status).lower() in {"ativo", "active", "userstatus.active"}

    def _is_compatible(self, user: models.User, group: models.Group) -> bool:
        if not self._is_user_active(user):
            return False
        if self._normalize_shift(user.shift) != self._normalize_shift(group.shift):
            return False
        return int(group.initial_age) <= int(user.age) <= int(group.final_age)

    def _linked_user_group_ids(self) -> set[tuple[int, int]]:
        rows = self.db.scalars(select(models.UserGroup)).all()
        return {(row.user_id, row.group_id) for row in rows}

    def list_classification(self, group_id: int | None = None) -> list[schemas.GroupClassificationItem]:
        groups_query = select(models.Group).order_by(models.Group.shift.asc(), models.Group.name.asc())
        if group_id is not None:
            groups_query = groups_query.where(models.Group.id == group_id)
        groups = list(self.db.scalars(groups_query).all())
        users = list(self.db.scalars(select(models.User)).all())
        linked = self._linked_user_group_ids()

        response: list[schemas.GroupClassificationItem] = []
        for group in groups:
            classified_users: list[schemas.GroupClassificationUser] = []
            for user in users:
                if not self._is_compatible(user, group):
                    continue
                binding_status = "vinculado" if (user.id, group.id) in linked else "pendente"
                classified_users.append(
                    schemas.GroupClassificationUser(
                        user_id=user.id,
                        name=user.name,
                        age=user.age,
                        shift=user.shift,
                        status=binding_status,
                    )
                )
            response.append(
                schemas.GroupClassificationItem(
                    group_id=group.id,
                    group_name=group.name,
                    shift=group.shift,
                    initial_age=group.initial_age,
                    final_age=group.final_age,
                    age_range=f"{group.initial_age} a {group.final_age} anos",
                    users=classified_users,
                )
            )
        return response

    def link_user(self, payload: schemas.GroupClassificationLinkPayload) -> None:
        user = self.db.get(models.User, payload.user_id)
        group = self.db.get(models.Group, payload.group_id)
        if user is None:
            raise HTTPException(status_code=404, detail="Usuario nao encontrado.")
        if group is None:
            raise HTTPException(status_code=404, detail="Grupo nao encontrado.")
        if not self._is_user_active(user):
            raise HTTPException(status_code=400, detail="Usuario inativo nao pode ser vinculado.")
        if self._normalize_shift(user.shift) != self._normalize_shift(group.shift):
            raise HTTPException(status_code=400, detail="Usuario nao pertence ao turno deste grupo.")
        if not (group.initial_age <= user.age <= group.final_age):
            raise HTTPException(status_code=400, detail="Usuario nao pertence a faixa etaria deste grupo.")
        duplicate = self.db.scalar(
            select(models.UserGroup).where(
                and_(models.UserGroup.user_id == payload.user_id, models.UserGroup.group_id == payload.group_id)
            )
        )
        if duplicate is not None:
            raise HTTPException(status_code=409, detail="Usuario ja esta vinculado a este grupo.")
        self.db.add(models.UserGroup(user_id=payload.user_id, group_id=payload.group_id))
        self.db.commit()

    def unlink_user(self, payload: schemas.GroupClassificationLinkPayload) -> None:
        row = self.db.scalar(
            select(models.UserGroup).where(
                and_(models.UserGroup.user_id == payload.user_id, models.UserGroup.group_id == payload.group_id)
            )
        )
        if row is None:
            return
        self.db.delete(row)
        self.db.commit()



