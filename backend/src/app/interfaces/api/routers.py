# -*- coding: utf-8 -*-
import calendar
from datetime import date, datetime, timedelta
from io import BytesIO
import re
import unicodedata
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import and_, delete, func, select
from sqlalchemy.orm import Session

from app.application import schemas
from app.application.services import (
    AttendanceService,
    CrudService,
    GroupClassificationService,
    ParticipantService,
    ReportService,
)
from app.domain.enums import UserMovementType, UserStatus
from app.infrastructure.db import models
from app.infrastructure.db.session import get_db
from app.interfaces.api.auth import (
    AuthContext,
    create_access_token,
    enforce_unit_scope,
    get_current_auth_context,
    require_permission,
    verify_password,
)

router = APIRouter(prefix='/api/v1')


def _can_manage_group_classification(ctx: AuthContext) -> bool:
    if ctx.is_admin:
        return True
    profile = (ctx.profile or "").strip().lower()
    return profile in {"coordenador", "coordinator", "secretária executiva", "secretaria executiva"}


def _can_manage_atendimentos(ctx: AuthContext) -> bool:
    if ctx.is_admin:
        return True
    profile = unicodedata.normalize("NFKD", (ctx.profile or "").strip()).encode("ascii", "ignore").decode("ascii").lower()
    return profile in {"coordenador", "coordenadora", "tecnico"}


def _can_access_unit_followup(ctx: AuthContext) -> bool:
    if ctx.is_admin:
        return True
    profile = unicodedata.normalize("NFKD", (ctx.profile or "").strip()).encode("ascii", "ignore").decode("ascii").lower()
    return profile in {"coordenador", "coordenadora", "administrador do sistema"}


def _require_unit_followup_access(ctx: AuthContext) -> None:
    if not _can_access_unit_followup(ctx):
        raise HTTPException(status_code=403, detail='Acesso negado para Acompanhamento da Unidade.')


def _can_access_unit_management(ctx: AuthContext) -> bool:
    if ctx.is_admin:
        return True
    profile = unicodedata.normalize("NFKD", (ctx.profile or "").strip()).encode("ascii", "ignore").decode("ascii").lower()
    return profile in {"secretaria executiva", "secretaria administrativa", "administrador do sistema"}


def _can_access_donation_catalog(ctx: AuthContext) -> bool:
    return _can_access_unit_management(ctx)


def _require_donation_catalog_access(ctx: AuthContext) -> None:
    if not _can_access_donation_catalog(ctx):
        raise HTTPException(status_code=403, detail='Acesso negado para Catálogo de doação.')


def _require_donation_receipt_access(ctx: AuthContext) -> None:
    if not _can_access_unit_management(ctx):
        raise HTTPException(status_code=403, detail='Acesso negado para Recebimento de Doações.')


def _serialize_unit_management(unit: models.Unit) -> dict:
    return {
        "id": unit.id,
        "name": unit.name,
        "city": unit.city,
        "state": unit.state,
        "status": "ativo",
        "logo_path": "/logo-acm-nos-somos.jpg",
    }


def _unit_scope_or_none(ctx: AuthContext) -> int | None:
    if ctx.social_unit_id is not None:
        return int(ctx.social_unit_id)
    if ctx.is_admin:
        return None
    if ctx.social_unit_id is None:
        raise HTTPException(status_code=403, detail='Unidade Social obrigatoria para acessar estes dados.')


def _enforce_effective_unit_scope(ctx: AuthContext, target_unit_id: int | None) -> None:
    unit_id = _unit_scope_or_none(ctx)
    if unit_id is None:
        return
    if target_unit_id is None or int(target_unit_id) != int(unit_id):
        raise HTTPException(status_code=403, detail='Acesso nao autorizado para esta Unidade Social.')


def _fmt_date_br(value: date | None) -> str:
    if value is None:
        return "-"
    return value.strftime("%d/%m/%Y")


def _safe_text(value: object | None) -> str:
    text = "" if value is None else str(value)
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _serialize_atendimento(
    atendimento: models.Atendimento,
    collaborator: models.Collaborator | None,
) -> dict:
    return {
        "id": atendimento.id,
        "unidade_social_id": atendimento.unidade_social_id,
        "colaborador_id": atendimento.colaborador_id,
        "atendente_nome": collaborator.name if collaborator is not None else atendimento.atendente_nome,
        "atendente_funcao": collaborator.role if collaborator is not None else atendimento.atendente_funcao,
        "data_atendimento": atendimento.data_atendimento,
        "nome": atendimento.nome,
        "demanda": atendimento.demanda,
        "criado_em": atendimento.criado_em,
        "atualizado_em": atendimento.atualizado_em,
    }


def _serialize_atendimentos(db: Session, atendimentos: list[models.Atendimento]) -> list[dict]:
    collaborator_ids = {item.colaborador_id for item in atendimentos if item.colaborador_id is not None}
    collaborators = {}
    if collaborator_ids:
        rows = db.scalars(select(models.Collaborator).where(models.Collaborator.id.in_(collaborator_ids))).all()
        collaborators = {row.id: row for row in rows}
    return [_serialize_atendimento(item, collaborators.get(item.colaborador_id)) for item in atendimentos]


def _normalize_donation_description(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail='Informe a descrição.')
    if len(cleaned) > 150:
        raise HTTPException(status_code=400, detail='Descrição deve ter no máximo 150 caracteres.')
    return cleaned


def _ensure_unique_donation_description(
    db: Session,
    description: str,
    ignore_id: int | None = None,
) -> None:
    query = select(models.DonationCatalog).where(func.lower(models.DonationCatalog.description) == description.lower())
    if ignore_id is not None:
        query = query.where(models.DonationCatalog.id != ignore_id)
    if db.scalar(query) is not None:
        raise HTTPException(status_code=409, detail='Já existe um item de doação com esta descrição.')


def _serialize_donation_receipt(item: models.DonationReceipt) -> dict:
    return {
        "id": item.id,
        "donation_catalog_id": item.donation_catalog_id,
        "donation_catalog_description": item.donation_catalog.description if item.donation_catalog else None,
        "donation_date": item.donation_date,
        "item_ns": item.item_ns,
        "quilograma_kg": float(item.quilograma_kg) if item.quilograma_kg is not None else None,
        "description": item.description,
        "donor_name": item.donor_name,
        "donor_type": item.donor_type,
        "cpf": item.cpf,
        "cnpj": item.cnpj,
        "is_active": item.is_active,
        "status": "Ativo" if item.is_active else "Inativo",
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "created_by": item.created_by,
        "updated_by": item.updated_by,
    }


def _ensure_donation_catalog_exists(db: Session, catalog_id: int) -> models.DonationCatalog:
    item = db.get(models.DonationCatalog, catalog_id)
    if item is None:
        raise HTTPException(status_code=400, detail="Tipo de doação inválido.")
    return item


def _apply_donation_receipt_payload(
    item: models.DonationReceipt,
    payload: schemas.DonationReceiptCreate | schemas.DonationReceiptUpdate,
    user_id: int | None,
) -> None:
    donor_type = payload.donor_type
    item.donation_catalog_id = payload.donation_catalog_id
    item.donation_date = payload.donation_date
    item.item_ns = payload.item_ns
    item.quilograma_kg = payload.quilograma_kg
    item.description = payload.description.strip()
    item.donor_name = payload.donor_name.strip()
    item.donor_type = donor_type
    item.cpf = payload.cpf.strip() if donor_type == "Pessoa Física" and payload.cpf else None
    item.cnpj = payload.cnpj.strip() if donor_type == "Pessoa Jurídica" and payload.cnpj else None
    item.updated_by = user_id


MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
ACTIVITY_CATEGORIES = ["Socioeducativas", "Oficinas de Esporte", "Vivência Sociocultural", "Oficinas Artísticas"]


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def _resolve_followup_unit(db: Session, ctx: AuthContext, unit_id: int | None) -> tuple[int, list[models.Unit]]:
    _require_unit_followup_access(ctx)
    if ctx.is_admin:
        units = list(db.scalars(select(models.Unit).order_by(models.Unit.name.asc())).all())
        if not units:
            raise HTTPException(status_code=404, detail="Nenhuma unidade social encontrada.")
        selected_id = unit_id or ctx.social_unit_id or units[0].id
        if not any(unit.id == selected_id for unit in units):
            raise HTTPException(status_code=404, detail="Unidade social não encontrada.")
        return int(selected_id), units
    if ctx.social_unit_id is None:
        raise HTTPException(status_code=403, detail="Unidade social obrigatória para acompanhamento.")
    if unit_id is not None and int(unit_id) != int(ctx.social_unit_id):
        raise HTTPException(status_code=403, detail="Acesso não autorizado para esta Unidade Social.")
    unit = db.get(models.Unit, ctx.social_unit_id)
    if unit is None:
        raise HTTPException(status_code=404, detail="Unidade social não encontrada.")
    return int(ctx.social_unit_id), [unit]


def _age_count(db: Session, unit_id: int, min_age: int, max_age: int) -> int:
    return db.scalar(
        select(func.count())
        .select_from(models.User)
        .where(
            and_(
                models.User.unit_id == unit_id,
                models.User.status == UserStatus.ACTIVE,
                models.User.age >= min_age,
                models.User.age <= max_age,
            )
        )
    ) or 0


def _movement_count(
    db: Session,
    unit_id: int,
    min_age: int,
    max_age: int,
    movement_type: UserMovementType,
    start_date: date,
    end_date: date,
) -> int:
    return db.scalar(
        select(func.count())
        .select_from(models.UserMovement)
        .join(models.User, models.User.id == models.UserMovement.user_id)
        .where(
            and_(
                models.User.unit_id == unit_id,
                models.User.age >= min_age,
                models.User.age <= max_age,
                models.UserMovement.movement_type == movement_type,
                models.UserMovement.movement_date >= start_date,
                models.UserMovement.movement_date <= end_date,
            )
        )
    ) or 0


def _attendance_count(db: Session, unit_id: int, start_date: date, end_date: date) -> int:
    return db.scalar(
        select(func.count())
        .select_from(models.Atendimento)
        .where(
            and_(
                models.Atendimento.unidade_social_id == unit_id,
                models.Atendimento.data_atendimento >= start_date,
                models.Atendimento.data_atendimento <= end_date,
            )
        )
    ) or 0


def _donation_base_query(unit_id: int, start_date: date, end_date: date):
    return (
        select(models.DonationReceipt)
        .join(models.Collaborator, models.Collaborator.id == models.DonationReceipt.created_by, isouter=True)
        .where(
            and_(
                models.DonationReceipt.is_active.is_(True),
                models.DonationReceipt.donation_date >= start_date,
                models.DonationReceipt.donation_date <= end_date,
                models.Collaborator.social_unit_id == unit_id,
            )
        )
    )


def _donation_summary(db: Session, unit_id: int, start_date: date, end_date: date) -> dict:
    rows = db.execute(
        _donation_base_query(unit_id, start_date, end_date)
        .with_only_columns(
            func.count(models.DonationReceipt.id),
            func.coalesce(func.sum(models.DonationReceipt.item_ns), 0),
            func.coalesce(func.sum(models.DonationReceipt.quilograma_kg), 0),
        )
    ).one()
    by_type = db.execute(
        select(
            models.DonationCatalog.description,
            func.count(models.DonationReceipt.id),
        )
        .select_from(models.DonationReceipt)
        .join(models.DonationCatalog, models.DonationCatalog.id == models.DonationReceipt.donation_catalog_id)
        .join(models.Collaborator, models.Collaborator.id == models.DonationReceipt.created_by, isouter=True)
        .where(
            and_(
                models.DonationReceipt.is_active.is_(True),
                models.DonationReceipt.donation_date >= start_date,
                models.DonationReceipt.donation_date <= end_date,
                models.Collaborator.social_unit_id == unit_id,
            )
        )
        .group_by(models.DonationCatalog.description)
        .order_by(models.DonationCatalog.description.asc())
    ).all()
    return {
        "total_donations": int(rows[0] or 0),
        "total_items": int(rows[1] or 0),
        "total_kg": float(rows[2] or 0),
        "by_type": [{"type": row[0], "quantity": int(row[1] or 0)} for row in by_type],
    }


def _activity_summary(db: Session, unit_id: int, start_date: date, end_date: date) -> dict:
    rows = db.execute(
        select(models.Activity.category, func.count(func.distinct(func.concat(models.GroupAttendance.group_id, "-", models.GroupAttendance.attendance_date))))
        .select_from(models.GroupAttendance)
        .join(models.Group, models.Group.id == models.GroupAttendance.group_id)
        .join(models.ActivityGroup, models.ActivityGroup.group_id == models.Group.id)
        .join(models.Activity, models.Activity.id == models.ActivityGroup.activity_id)
        .where(
            and_(
                models.Group.unit_id == unit_id,
                models.GroupAttendance.attendance_date >= start_date,
                models.GroupAttendance.attendance_date <= end_date,
            )
        )
        .group_by(models.Activity.category)
    ).all()
    counts = {category: 0 for category in ACTIVITY_CATEGORIES}
    for category, total in rows:
        counts[category or "Outras"] = int(total or 0)
    items = [{"type": key, "quantity": value} for key, value in counts.items()]
    return {"items": items, "total": sum(item["quantity"] for item in items)}


def _monthly_series(db: Session, unit_id: int, year: int) -> list[dict]:
    series = []
    for month in range(1, 13):
        start_date, end_date = _month_bounds(year, month)
        series.append(
            {
                "month": month,
                "label": MONTH_LABELS[month - 1],
                "children_entries": _movement_count(db, unit_id, 6, 11, UserMovementType.ENTRADA, start_date, end_date),
                "children_exits": _movement_count(db, unit_id, 6, 11, UserMovementType.SAIDA, start_date, end_date),
                "teen_entries": _movement_count(db, unit_id, 12, 15, UserMovementType.ENTRADA, start_date, end_date),
                "teen_exits": _movement_count(db, unit_id, 12, 15, UserMovementType.SAIDA, start_date, end_date),
                "attendances": _attendance_count(db, unit_id, start_date, end_date),
            }
        )
    return series


@router.get('/acompanhamento/dashboard')
def get_unit_followup_dashboard(
    unidade_id: int | None = None,
    mes: int | None = None,
    ano: int | None = None,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    today = date.today()
    month = mes or today.month
    year = ano or today.year
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Mês inválido.")
    if year < 2000 or year > today.year + 1:
        raise HTTPException(status_code=400, detail="Ano inválido.")
    unit_id, units = _resolve_followup_unit(db, ctx, unidade_id)
    selected_unit = next((unit for unit in units if unit.id == unit_id), None)
    start_date, end_date = _month_bounds(year, month)
    year_start, year_end = date(year, 1, 1), date(year, 12, 31)
    previous_month = 12 if month == 1 else month - 1
    previous_year = year - 1 if month == 1 else year
    previous_start, previous_end = _month_bounds(previous_year, previous_month)

    children_active = _age_count(db, unit_id, 6, 11)
    teens_active = _age_count(db, unit_id, 12, 15)
    attendance_month = _attendance_count(db, unit_id, start_date, end_date)
    attendance_year = _attendance_count(db, unit_id, year_start, year_end)
    donations = _donation_summary(db, unit_id, start_date, end_date)
    activities = _activity_summary(db, unit_id, start_date, end_date)
    monthly = _monthly_series(db, unit_id, year)

    child_entries = _movement_count(db, unit_id, 6, 11, UserMovementType.ENTRADA, start_date, end_date)
    child_exits = _movement_count(db, unit_id, 6, 11, UserMovementType.SAIDA, start_date, end_date)
    teen_entries = _movement_count(db, unit_id, 12, 15, UserMovementType.ENTRADA, start_date, end_date)
    teen_exits = _movement_count(db, unit_id, 12, 15, UserMovementType.SAIDA, start_date, end_date)
    current_exits = child_exits + teen_exits
    previous_exits = _movement_count(db, unit_id, 6, 15, UserMovementType.SAIDA, previous_start, previous_end)
    days_elapsed = min(today.day, calendar.monthrange(year, month)[1]) if year == today.year and month == today.month else calendar.monthrange(year, month)[1]
    average_daily = round(attendance_month / max(days_elapsed, 1), 1)

    alerts = []
    if previous_exits > 0 and current_exits > previous_exits:
        alerts.append({"type": "warning", "title": "Atenção nas saídas", "message": "As saídas aumentaram em comparação com o mês anterior."})
    if activities["total"] <= 0:
        alerts.append({"type": "warning", "title": "Atividades sem registro", "message": "Nenhuma atividade foi registrada no mês selecionado."})
    else:
        alerts.append({"type": "success", "title": "Atividades registradas", "message": "Existem atividades registradas para o mês selecionado."})
    alerts.append({"type": "info", "title": "Reuniões familiares", "message": "Ainda não há tabela de reuniões familiares cadastrada no sistema."})
    if donations["total_kg"] >= 100 or donations["total_items"] >= 100:
        alerts.append({"type": "info", "title": "Doações relevantes", "message": "Foram registradas doações expressivas no mês selecionado."})

    return {
        "unit": {"id": unit_id, "name": selected_unit.name if selected_unit else ""},
        "available_units": [{"id": unit.id, "name": unit.name} for unit in units],
        "filters": {"month": month, "year": year},
        "last_updated": datetime.now().isoformat(),
        "cards": {
            "children_active": children_active,
            "teens_active": teens_active,
            "attendance_month": attendance_month,
            "families_in_meetings": 0,
            "donations_received": donations["total_donations"],
        },
        "age_movements": {
            "children": {"entries": child_entries, "exits": child_exits},
            "teens": {"entries": teen_entries, "exits": teen_exits},
        },
        "monthly_movement": {
            "items": monthly,
            "annual_totals": {
                "children_entries": sum(item["children_entries"] for item in monthly),
                "children_exits": sum(item["children_exits"] for item in monthly),
                "teen_entries": sum(item["teen_entries"] for item in monthly),
                "teen_exits": sum(item["teen_exits"] for item in monthly),
            },
        },
        "activities": activities,
        "attendances": {
            "month_total": attendance_month,
            "daily_average": average_daily,
            "year_total": attendance_year,
            "monthly": [{"month": item["month"], "label": item["label"], "total": item["attendances"]} for item in monthly],
        },
        "family_meetings": {
            "total_meetings": 0,
            "families_total": 0,
            "average_per_meeting": 0,
            "items": [],
        },
        "donations": donations,
        "alerts": alerts,
    }



@router.get('/health')
def healthcheck() -> dict:
    return {'status': 'ok'}


@router.get('/recebimento-doacoes', response_model=schemas.DonationReceiptListResponse)
def list_donation_receipts(
    donation_catalog_id: int | None = None,
    donation_date: date | None = None,
    donor_name: str = "",
    page: int = 1,
    page_size: int = 100,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    _require_donation_receipt_access(ctx)
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    query = select(models.DonationReceipt)
    if donation_catalog_id:
        query = query.where(models.DonationReceipt.donation_catalog_id == donation_catalog_id)
    if donation_date:
        query = query.where(models.DonationReceipt.donation_date == donation_date)
    term = donor_name.strip()
    if term:
        query = query.where(func.lower(models.DonationReceipt.donor_name).contains(term.lower()))
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = db.scalars(
        query.order_by(models.DonationReceipt.donation_date.desc(), models.DonationReceipt.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {"items": [_serialize_donation_receipt(row) for row in rows], "total": total, "page": page, "page_size": page_size}


@router.get('/recebimento-doacoes/{receipt_id}', response_model=schemas.DonationReceiptRead)
def get_donation_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    _require_donation_receipt_access(ctx)
    item = db.get(models.DonationReceipt, receipt_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Recebimento de doação não encontrado.")
    return _serialize_donation_receipt(item)


@router.post('/recebimento-doacoes', response_model=schemas.DonationReceiptRead)
def create_donation_receipt(
    payload: schemas.DonationReceiptCreate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    _require_donation_receipt_access(ctx)
    _ensure_donation_catalog_exists(db, payload.donation_catalog_id)
    item = models.DonationReceipt(created_by=ctx.user_id, updated_by=ctx.user_id)
    _apply_donation_receipt_payload(item, payload, ctx.user_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize_donation_receipt(item)


@router.put('/recebimento-doacoes/{receipt_id}', response_model=schemas.DonationReceiptRead)
def update_donation_receipt(
    receipt_id: int,
    payload: schemas.DonationReceiptUpdate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    _require_donation_receipt_access(ctx)
    _ensure_donation_catalog_exists(db, payload.donation_catalog_id)
    item = db.get(models.DonationReceipt, receipt_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Recebimento de doação não encontrado.")
    _apply_donation_receipt_payload(item, payload, ctx.user_id)
    db.commit()
    db.refresh(item)
    return _serialize_donation_receipt(item)


@router.delete('/recebimento-doacoes/{receipt_id}', status_code=204)
def deactivate_donation_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    _require_donation_receipt_access(ctx)
    item = db.get(models.DonationReceipt, receipt_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Recebimento de doação não encontrado.")
    item.is_active = False
    item.updated_by = ctx.user_id
    db.commit()


@router.get('/catalogo-doacoes', response_model=schemas.DonationCatalogListResponse)
def list_donation_catalog(
    description: str = "",
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    _require_donation_catalog_access(ctx)
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    query = select(models.DonationCatalog)
    term = description.strip()
    if term:
        query = query.where(func.lower(models.DonationCatalog.description).contains(term.lower()))
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = db.scalars(
        query.order_by(models.DonationCatalog.description.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {"items": rows, "total": total, "page": page, "page_size": page_size}


@router.get('/catalogo-doacoes/{catalog_id}', response_model=schemas.DonationCatalogRead)
def get_donation_catalog(
    catalog_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    _require_donation_catalog_access(ctx)
    item = db.get(models.DonationCatalog, catalog_id)
    if item is None:
        raise HTTPException(status_code=404, detail='Item de doação não encontrado.')
    return item


@router.post('/catalogo-doacoes', response_model=schemas.DonationCatalogRead)
def create_donation_catalog(
    payload: schemas.DonationCatalogCreate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    _require_donation_catalog_access(ctx)
    description = _normalize_donation_description(payload.description)
    _ensure_unique_donation_description(db, description)
    item = models.DonationCatalog(description=description, created_by=ctx.user_id, updated_by=ctx.user_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put('/catalogo-doacoes/{catalog_id}', response_model=schemas.DonationCatalogRead)
def update_donation_catalog(
    catalog_id: int,
    payload: schemas.DonationCatalogUpdate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    _require_donation_catalog_access(ctx)
    item = db.get(models.DonationCatalog, catalog_id)
    if item is None:
        raise HTTPException(status_code=404, detail='Item de doação não encontrado.')
    description = _normalize_donation_description(payload.description)
    _ensure_unique_donation_description(db, description, ignore_id=catalog_id)
    item.description = description
    item.updated_by = ctx.user_id
    db.commit()
    db.refresh(item)
    return item


@router.delete('/catalogo-doacoes/{catalog_id}', status_code=204)
def delete_donation_catalog(
    catalog_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    _require_donation_catalog_access(ctx)
    item = db.get(models.DonationCatalog, catalog_id)
    if item is None:
        raise HTTPException(status_code=404, detail='Item de doação não encontrado.')
    db.delete(item)
    db.commit()


@router.get('/autenticacao/unidades-sociais', response_model=list[schemas.SocialUnitOption])
def auth_social_units(db: Session = Depends(get_db)):
    rows = db.scalars(select(models.Unit).order_by(models.Unit.name.asc())).all()
    return [{'id': row.id, 'name': row.name} for row in rows]


@router.get('/gestao-unidades', response_model=list[schemas.UnitManagementRead])
def list_unit_management(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    if not _can_access_unit_management(ctx):
        raise HTTPException(status_code=403, detail='Acesso negado para Gestão de Unidades.')
    rows = db.scalars(select(models.Unit).order_by(models.Unit.name.asc())).all()
    return [_serialize_unit_management(row) for row in rows]


@router.get('/gestao-unidades/{unit_id}', response_model=schemas.UnitRead)
def get_unit_management(
    unit_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    if not _can_access_unit_management(ctx):
        raise HTTPException(status_code=403, detail='Acesso negado para Gestão de Unidades.')
    return CrudService(db).get_unit(unit_id)


@router.post('/atendimentos', response_model=schemas.AtendimentoRead)
def create_atendimento(
    payload: schemas.AtendimentoCreate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    if not _can_manage_atendimentos(ctx):
        raise HTTPException(status_code=403, detail='Acesso negado para registrar atendimento.')
    if ctx.social_unit_id is None:
        raise HTTPException(status_code=400, detail='Unidade social obrigatoria para atendimento.')
    colaborador_id = None if ctx.is_admin else ctx.user_id
    item = CrudService(db).create_atendimento(
        payload,
        int(ctx.social_unit_id),
        colaborador_id,
        "Administrador",
        "Administrador",
    )
    collaborator = db.get(models.Collaborator, item.colaborador_id) if item.colaborador_id is not None else None
    return _serialize_atendimento(item, collaborator)


@router.get('/atendimentos', response_model=list[schemas.AtendimentoRead])
def list_atendimentos(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    if not _can_manage_atendimentos(ctx):
        raise HTTPException(status_code=403, detail='Acesso negado para visualizar atendimentos.')
    unidade_social_id = None if ctx.is_admin else ctx.social_unit_id
    return _serialize_atendimentos(db, CrudService(db).list_atendimentos(unidade_social_id))


@router.get('/atendimentos/{atendimento_id}', response_model=schemas.AtendimentoRead)
def get_atendimento(
    atendimento_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    if not _can_manage_atendimentos(ctx):
        raise HTTPException(status_code=403, detail='Acesso negado para visualizar atendimento.')
    item = CrudService(db).get_atendimento(atendimento_id)
    enforce_unit_scope(ctx, item.unidade_social_id)
    collaborator = db.get(models.Collaborator, item.colaborador_id) if item.colaborador_id is not None else None
    return _serialize_atendimento(item, collaborator)


@router.put('/atendimentos/{atendimento_id}', response_model=schemas.AtendimentoRead)
def update_atendimento(
    atendimento_id: int,
    payload: schemas.AtendimentoUpdate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    item = CrudService(db).get_atendimento(atendimento_id)
    enforce_unit_scope(ctx, item.unidade_social_id)
    if not _can_manage_atendimentos(ctx):
        raise HTTPException(status_code=403, detail='Acesso negado para editar atendimento.')
    updated = CrudService(db).update_atendimento(atendimento_id, payload)
    collaborator = db.get(models.Collaborator, updated.colaborador_id) if updated.colaborador_id is not None else None
    return _serialize_atendimento(updated, collaborator)


@router.delete('/atendimentos/{atendimento_id}', status_code=204)
def delete_atendimento(
    atendimento_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    item = CrudService(db).get_atendimento(atendimento_id)
    enforce_unit_scope(ctx, item.unidade_social_id)
    if not _can_manage_atendimentos(ctx):
        raise HTTPException(status_code=403, detail='Acesso negado para excluir atendimento.')
    CrudService(db).delete_atendimento(atendimento_id)


@router.post('/autenticacao/entrar', response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    collaborator = db.scalar(select(models.Collaborator).where(models.Collaborator.email == email))
    if collaborator is None or not verify_password(payload.password, collaborator.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Credenciais invalidas.')
    if not collaborator.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Usuário inativo.')

    selected_unit_id = payload.social_unit_id
    if not collaborator.is_admin:
        if selected_unit_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unidade Social obrigatoria.')
        if int(selected_unit_id) != int(collaborator.social_unit_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Usuário sem vínculo com a Unidade Social selecionada.')
    elif selected_unit_id is None:
        selected_unit_id = collaborator.social_unit_id

    permissions = set()
    if collaborator.role:
        permission_query = (
            select(models.Permission.code)
            .join(models.ProfilePermission, models.ProfilePermission.permission_id == models.Permission.id)
            .join(models.Profile, models.Profile.id == models.ProfilePermission.profile_id)
            .where(models.Profile.name == collaborator.role)
        )
        permissions = set(db.scalars(permission_query).all())

    social_unit_name = None
    if selected_unit_id is not None:
        unit = db.get(models.Unit, int(selected_unit_id))
        social_unit_name = unit.name if unit else None

    token = create_access_token(
        {
            'user_id': collaborator.id,
            'profile': collaborator.role,
            'is_admin': bool(collaborator.is_admin),
            'social_unit_id': selected_unit_id,
            'social_unit_name': social_unit_name,
            'permissions': sorted(list(permissions)),
        }
    )
    return schemas.LoginResponse(
        access_token=token,
        user_id=collaborator.id,
        user_name=collaborator.name,
        profile=collaborator.role,
        is_admin=bool(collaborator.is_admin),
        social_unit_id=selected_unit_id,
        social_unit_name=social_unit_name,
        permissions=sorted(list(permissions)),
    )


@router.post('/colaboradores', response_model=schemas.CollaboratorRead)
def create_collaborator(
    payload: schemas.CollaboratorCreate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission('collaborators.write')),
):
    enforce_unit_scope(ctx, payload.social_unit_id)
    return CrudService(db).create_collaborator(payload)


@router.get('/perfis', response_model=list[schemas.ProfileOption])
def list_profiles(
    db: Session = Depends(get_db),
    _: AuthContext = Depends(require_permission('collaborators.read')),
):
    rows = db.scalars(select(models.Profile).order_by(models.Profile.name.asc())).all()
    return [{'id': row.id, 'name': row.name, 'description': row.description} for row in rows]


@router.get('/colaboradores', response_model=list[schemas.CollaboratorRead])
def list_collaborators(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission('collaborators.read')),
):
    rows = CrudService(db).list_collaborators()
    if ctx.is_admin:
        return rows
    return [row for row in rows if row.social_unit_id == ctx.social_unit_id]


@router.get('/colaboradores/{collaborator_id}', response_model=schemas.CollaboratorRead)
def get_collaborator(
    collaborator_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission('collaborators.read')),
):
    row = CrudService(db).get_collaborator(collaborator_id)
    enforce_unit_scope(ctx, row.social_unit_id)
    return row


@router.put('/colaboradores/{collaborator_id}', response_model=schemas.CollaboratorRead)
def update_collaborator(
    collaborator_id: int,
    payload: schemas.CollaboratorUpdate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission('collaborators.write')),
):
    row = CrudService(db).get_collaborator(collaborator_id)
    enforce_unit_scope(ctx, row.social_unit_id)
    enforce_unit_scope(ctx, payload.social_unit_id)
    return CrudService(db).update_collaborator(collaborator_id, payload)


@router.delete('/colaboradores/{collaborator_id}', status_code=204)
def delete_collaborator(
    collaborator_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission('collaborators.delete')),
):
    row = CrudService(db).get_collaborator(collaborator_id)
    enforce_unit_scope(ctx, row.social_unit_id)
    CrudService(db).delete_collaborator(collaborator_id)


@router.post('/unidades-sociais', response_model=schemas.UnitRead)
def create_unit(
    payload: schemas.UnitCreate,
    db: Session = Depends(get_db),
    _: AuthContext = Depends(require_permission('units.write')),
):
    return CrudService(db).create_unit(payload)


@router.get('/unidades-sociais', response_model=list[schemas.UnitRead])
def list_units(db: Session = Depends(get_db), ctx: AuthContext = Depends(require_permission('units.read'))):
    rows = CrudService(db).list_units()
    if ctx.is_admin:
        return rows
    return [row for row in rows if row.id == ctx.social_unit_id]


@router.get('/unidades-sociais/{unit_id}', response_model=schemas.UnitRead)
def get_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission('units.read')),
):
    enforce_unit_scope(ctx, unit_id)
    return CrudService(db).get_unit(unit_id)


@router.put('/unidades-sociais/{unit_id}', response_model=schemas.UnitRead)
def update_unit(
    unit_id: int,
    payload: schemas.UnitUpdate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission('units.write')),
):
    enforce_unit_scope(ctx, unit_id)
    return CrudService(db).update_unit(unit_id, payload)


@router.delete('/unidades-sociais/{unit_id}', status_code=204)
def delete_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission('units.delete')),
):
    enforce_unit_scope(ctx, unit_id)
    db.execute(delete(models.UserSocialUnit).where(models.UserSocialUnit.social_unit_id == unit_id))
    db.commit()
    CrudService(db).delete_unit(unit_id)


@router.post('/usuarios', response_model=schemas.UserRead)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_current_auth_context)):
    enforce_unit_scope(ctx, payload.unit_id)
    return CrudService(db).create_user(payload)


@router.get('/usuarios', response_model=list[schemas.UserRead])
def list_users(
    status: str = "ativo",
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    normalized_status = status.strip().lower()
    if normalized_status not in {"ativo", "inativo"}:
        raise HTTPException(status_code=400, detail="Status invalido. Use ativo ou inativo.")
    rows = CrudService(db).list_users(status_filter=normalized_status)
    if ctx.is_admin and ctx.social_unit_id is None:
        return rows
    return [row for row in rows if row.unit_id == ctx.social_unit_id]


@router.get('/usuarios/{user_id}', response_model=schemas.UserRead)
def get_user(user_id: int, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_current_auth_context)):
    row = CrudService(db).get_user(user_id)
    enforce_unit_scope(ctx, row.unit_id)
    return row


@router.put('/usuarios/{user_id}', response_model=schemas.UserRead)
def update_user(user_id: int, payload: schemas.UserUpdate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_current_auth_context)):
    row = CrudService(db).get_user(user_id)
    enforce_unit_scope(ctx, row.unit_id)
    enforce_unit_scope(ctx, payload.unit_id)
    return CrudService(db).update_user(user_id, payload)


@router.delete('/usuarios/{user_id}', status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_current_auth_context)):
    row = CrudService(db).get_user(user_id)
    enforce_unit_scope(ctx, row.unit_id)
    CrudService(db).delete_user(user_id)


@router.patch('/usuarios/{user_id}/ativar', response_model=schemas.UserRead)
def activate_user(user_id: int, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_current_auth_context)):
    row = CrudService(db).get_user(user_id)
    enforce_unit_scope(ctx, row.unit_id)
    return CrudService(db).activate_user(user_id)


@router.get('/usuarios/{user_id}/ficha-matricula')
def user_enrollment_form(
    user_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    user = CrudService(db).get_user(user_id)
    enforce_unit_scope(ctx, user.unit_id)

    template_path = Path(__file__).resolve().parents[4] / 'Ficha Matricula SCFV.docx'
    if not template_path.exists():
        raise HTTPException(status_code=500, detail='Modelo da ficha n?o encontrado.')

    enrollments = list(db.scalars(select(models.Enrollment).where(models.Enrollment.user_id == user.id)).all())
    activities = []
    for enrollment in enrollments:
        activity = db.get(models.Activity, enrollment.activity_id)
        if activity is not None:
            activities.append(activity)

    user_groups = [item.group for item in (user.user_groups or []) if item.group is not None]

    def txt(value: object | None, default: str = '-') -> str:
        if value is None:
            return default
        s = str(value).strip()
        return s if s else default

    def money(value: object | None) -> str:
        if value is None:
            return '-'
        try:
            return f"R$ {float(value):.2f}".replace('.', ',')
        except Exception:
            return txt(value)

    def join_items(values: list[str], default: str = '-') -> str:
        cleaned = [v.strip() for v in values if v and v.strip()]
        return '; '.join(cleaned) if cleaned else default

    comp = user.composicao_familiar or []
    situacao = user.situacao_habitacional
    saude = user.condicao_saude
    familiar = user.situacao_familiar
    parecer = user.parecer

    related_blocks: list[str] = []
    for idx, item in enumerate(comp, start=1):
        related_blocks.extend([
            f"Composição {idx} Nome: {txt(item.nome)}",
            f"Composição {idx} Parentesco: {txt(item.parentesco)}",
            f"Composição {idx} Sexo: {txt(item.sexo)}",
            f"Composição {idx} Idade: {txt(item.idade)}",
            f"Composição {idx} Naturalidade: {txt(item.naturalidade)}",
            f"Composição {idx} Estado Civil: {txt(item.estado_civil)}",
            f"Composição {idx} Escolaridade: {txt(item.escolaridade)}",
        ])

    if situacao is not None:
        related_blocks.extend([
            f"Habitação Tipo: {txt(situacao.tipo_habitacao)}",
            f"Habitação Tipo Outro: {txt(situacao.tipo_habitacao_outro)}",
            f"Habitação Ocupação: {txt(situacao.ocupacao)}",
            f"Habitação Valor Imóvel: {money(situacao.valor_imovel_em_pagamento)}",
            f"Habitação Valor Aluguel: {money(situacao.valor_aluguel)}",
            f"Habitação Ocupação Outro: {txt(situacao.ocupacao_outro)}",
            f"Habitação Nº Cômodos: {txt(situacao.numero_comodos)}",
            f"Habitação Observações: {txt(situacao.observacoes)}",
        ])

    if saude is not None:
        related_blocks.extend([
            f"Saúde Assistência Médica: {txt(saude.assistencia_medica)}",
            f"Saúde Problema: {txt(saude.problema_saude)}",
            f"Saúde Alergia: {txt(saude.alergia)}",
            f"Saúde Medicamento: {txt(saude.medicamento)}",
            f"Saúde Doenças Anteriores: {txt(saude.doencas_anteriores)}",
            f"Saúde Fratura: {txt(saude.fratura)}",
            f"Saúde Cirurgia: {txt(saude.cirurgia)}",
            f"Saúde Deficiência: {txt(saude.deficiencia)}",
            f"Saúde Observações: {txt(saude.observacoes)}",
        ])

    if familiar is not None:
        related_blocks.extend([
            f"Situação Familiar: {txt(familiar.informacoes_situacao_familiar)}",
            f"Expectativas no Projeto: {txt(familiar.expectativas_participacao_projeto)}",
        ])

    if parecer is not None:
        related_blocks.append(f"Parecer: {txt(parecer.parecer)}")

    with zipfile.ZipFile(template_path, 'r') as zin:
        document_xml = zin.read('word/document.xml').decode('utf-8', errors='ignore')

        def fill_underscores_in_segment(segment: str, values: list[str]) -> str:
            idx = {"i": 0}

            def _replace(match: re.Match[str]) -> str:
                i = idx["i"]
                idx["i"] += 1
                if i >= len(values):
                    return match.group(0)
                return escape(txt(values[i]))

            return re.sub(r"_{3,}", _replace, segment)

        def apply_segment_mapping(xml: str, pattern: str, values: list[str]) -> str:
            def _segment_repl(match: re.Match[str]) -> str:
                return fill_underscores_in_segment(match.group(0), values)
            return re.sub(pattern, _segment_repl, xml, flags=re.IGNORECASE | re.DOTALL)

        bdate = _fmt_date_br(user.birth_date).split("/")
        bday = bdate[0] if len(bdate) == 3 else "-"
        bmonth = bdate[1] if len(bdate) == 3 else "-"
        byear = bdate[2] if len(bdate) == 3 else "-"

        updated_document_xml = document_xml

        # Identificação (labels da tela: Nome, Idade, Data de nascimento, Naturalidade, RG, UF, NIS, Turno)
        updated_document_xml = apply_segment_mapping(
            updated_document_xml,
            r"Nome:\s*_{3,}.*?NIS\s*n[ºo\?]?\s*_{3,}",
            [txt(user.name), txt(user.age), bday, bmonth, byear, txt(user.birth_place), txt(user.rg), txt(user.rg_uf), txt(user.nis_number), txt(user.shift)],
        )

        # Filiação
        updated_document_xml = apply_segment_mapping(
            updated_document_xml,
            r"Filia[çc\?][aã\?]o:\s*Pai\s*_{3,}.*?M[ãa\?]e\s*_{3,}",
            [txt(user.father_name), txt(user.mother_name)],
        )

        # Responsável (labels da tela)
        updated_document_xml = apply_segment_mapping(
            updated_document_xml,
            r"Identifica.*?Respons.*?Nome:\s*_{3,}.*?CPF:\s*_{3,}",
            [
                txt(user.responsible_name), txt(user.responsible_age), txt(user.responsible_gender),
                txt(user.responsible_birth_place), txt(user.responsible_marital_status), txt(user.responsible_education),
                txt(user.responsible_rg), txt(user.responsible_issuing_agency_uf), txt(user.responsible_cpf),
            ],
        )

        updated_document_xml = apply_segment_mapping(
            updated_document_xml,
            r"Local de Trabalho:\s*_{3,}.*?Hor[áa\?]rio:\s*_{3,}",
            [
                txt(user.responsible_workplace), money(user.responsible_income),
                txt(user.responsible_state), txt(user.responsible_city),
                txt(user.responsible_phone), txt(user.responsible_schedule),
            ],
        )

        updated_document_xml = apply_segment_mapping(
            updated_document_xml,
            r"Obs\.\s*:\s*_{3,}",
            [txt(user.responsible_notes)],
        )

        # Endereço Residencial
        updated_document_xml = apply_segment_mapping(
            updated_document_xml,
            r"Endere[çc\?]o Residencial.*?contato com a Fam[íi\?]lia:\s*_{3,}",
            [
                txt(user.residential_street), txt(user.residential_number), txt(user.residential_complement),
                txt(user.residential_district), txt(user.residential_city), txt(user.residential_zip_code),
                txt(user.residential_phone), txt(user.residential_contact_notes),
            ],
        )

        # Escolaridade
        updated_document_xml = apply_segment_mapping(
            updated_document_xml,
            r"S[ée\?]rie:\s*_{3,}.*?Nome da escola:\s*_{3,}.*?Obs\.\s*:\s*_{3,}",
            [
                txt(user.school_grade), txt(user.school_education_level), txt(user.school_is_currently_enrolled),
                txt(user.school_name), txt(user.school_type), txt(user.school_is_scholarship_holder),
                txt(user.school_scholarship_percentage), txt(user.school_schedule), txt(user.school_notes),
            ],
        )

        # Composição Familiar (até 6 linhas no bloco)
        comp_values: list[str] = []
        for item in comp[:6]:
            comp_values.extend([txt(item.nome), txt(item.naturalidade), txt(item.parentesco), txt(item.idade), txt(item.escolaridade)])
        updated_document_xml = apply_segment_mapping(
            updated_document_xml,
            r"Composi.*?Familiar.*?Obs\.\s*:\s*_{3,}",
            comp_values,
        )

        # Situação Habitacional
        if situacao is not None:
            updated_document_xml = apply_segment_mapping(
                updated_document_xml,
                r"Situa.*?Habitacional.*?Renda Familiar:\s*R\$\s*_{3,}",
                [
                    txt(situacao.tipo_habitacao), txt(situacao.tipo_habitacao_outro), txt(situacao.ocupacao),
                    money(situacao.valor_imovel_em_pagamento), money(situacao.valor_aluguel), txt(situacao.ocupacao_outro),
                    txt(situacao.numero_comodos), txt(situacao.observacoes),
                ],
            )

        # Saúde, Situação Familiar e Parecer (labels idênticas às telas)
        if saude is not None:
            updated_document_xml = apply_segment_mapping(
                updated_document_xml,
                r"Condi.*?Sa[úu\?]de.*?Observa.*?:\s*_{3,}",
                [
                    txt(saude.assistencia_medica), txt(saude.problema_saude), txt(saude.alergia), txt(saude.medicamento),
                    txt(saude.doencas_anteriores), txt(saude.fratura), txt(saude.cirurgia), txt(saude.deficiencia), txt(saude.observacoes),
                ],
            )
        if familiar is not None:
            updated_document_xml = apply_segment_mapping(
                updated_document_xml,
                r"Informa.*?Situa.*?Familiar.*?expectativas\?\s*_{3,}",
                [txt(familiar.informacoes_situacao_familiar), txt(familiar.expectativas_participacao_projeto)],
            )
        if parecer is not None:
            updated_document_xml = apply_segment_mapping(
                updated_document_xml,
                r"Parecer.*?_{3,}",
                [txt(parecer.parecer)],
            )

        # Atividades (vínculo)
        updated_document_xml = apply_segment_mapping(
            updated_document_xml,
            r"Dias e Hor[áa\?]rios de Atividades:\s*_{3,}",
            [join_items([f"{a.name} ({txt(a.schedule)})" for a in activities])],
        )

        # N?o preencher underscores sem mapeamento expl?cito para evitar valores em campos incorretos.
        out = BytesIO()
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == 'word/document.xml':
                    zout.writestr(item, updated_document_xml.encode('utf-8'))
                else:
                    zout.writestr(item, zin.read(item.filename))

    filename = f"ficha_matricula_usuario_{user.id}.docx"
    return Response(
        content=out.getvalue(),
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        headers={'Content-Disposition': f'inline; filename={filename}'},
    )


@router.post('/atividades', response_model=schemas.ActivityRead)
def create_activity(payload: schemas.ActivityCreate, db: Session = Depends(get_db), ctx: AuthContext = Depends(require_permission('activities.write'))):
    if payload.unit_id is None:
        if ctx.social_unit_id is None:
            raise HTTPException(status_code=400, detail='Unidade social obrigatoria para atividade.')
        payload.unit_id = ctx.social_unit_id
    enforce_unit_scope(ctx, payload.unit_id)
    return CrudService(db).create_activity(payload)


@router.get('/atividades', response_model=list[schemas.ActivityRead])
def list_activities(db: Session = Depends(get_db), ctx: AuthContext = Depends(require_permission('activities.read'))):
    rows = CrudService(db).list_activities()
    if ctx.is_admin and ctx.social_unit_id is None:
        return rows
    return [row for row in rows if row.unit_id == ctx.social_unit_id]


@router.get('/atividades/{activity_id}', response_model=schemas.ActivityRead)
def get_activity(activity_id: int, db: Session = Depends(get_db), ctx: AuthContext = Depends(require_permission('activities.read'))):
    row = CrudService(db).get_activity(activity_id)
    enforce_unit_scope(ctx, row.unit_id)
    return row


@router.put('/atividades/{activity_id}', response_model=schemas.ActivityRead)
def update_activity(
    activity_id: int,
    payload: schemas.ActivityUpdate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission('activities.write')),
):
    row = CrudService(db).get_activity(activity_id)
    enforce_unit_scope(ctx, row.unit_id)
    return CrudService(db).update_activity(activity_id, payload)


@router.delete('/atividades/{activity_id}', status_code=204)
def delete_activity(activity_id: int, db: Session = Depends(get_db), ctx: AuthContext = Depends(require_permission('activities.delete'))):
    row = db.get(models.Activity, activity_id)
    if row is None:
        raise HTTPException(status_code=404, detail='Atividade nao encontrada.')
    enforce_unit_scope(ctx, row.unit_id)
    CrudService(db).delete_activity(activity_id)

@router.post('/grupos', response_model=schemas.GroupRead)
def create_group(payload: schemas.GroupCreate, db: Session = Depends(get_db), ctx: AuthContext = Depends(require_permission('groups.write'))):
    if payload.unit_id is None:
        unit_id = _unit_scope_or_none(ctx)
        if unit_id is None:
            raise HTTPException(status_code=400, detail='Unidade social obrigatoria para grupo.')
        payload.unit_id = unit_id
    _enforce_effective_unit_scope(ctx, payload.unit_id)
    return CrudService(db).create_group(payload)


@router.get('/grupos', response_model=list[schemas.GroupRead])
def list_groups(db: Session = Depends(get_db), ctx: AuthContext = Depends(require_permission('groups.read'))):
    return CrudService(db).list_groups(unit_id=_unit_scope_or_none(ctx))


@router.get('/grupos/{group_id}', response_model=schemas.GroupRead)
def get_group(group_id: int, db: Session = Depends(get_db), ctx: AuthContext = Depends(require_permission('groups.read'))):
    row = CrudService(db).get_group(group_id)
    _enforce_effective_unit_scope(ctx, row.unit_id)
    return row


@router.put('/grupos/{group_id}', response_model=schemas.GroupRead)
def update_group(
    group_id: int,
    payload: schemas.GroupUpdate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require_permission('groups.write')),
):
    row = CrudService(db).get_group(group_id)
    _enforce_effective_unit_scope(ctx, row.unit_id)
    return CrudService(db).update_group(group_id, payload)


@router.delete('/grupos/{group_id}', status_code=204)
def delete_group(group_id: int, db: Session = Depends(get_db), ctx: AuthContext = Depends(require_permission('groups.delete'))):
    row = CrudService(db).get_group(group_id)
    _enforce_effective_unit_scope(ctx, row.unit_id)
    CrudService(db).delete_group(group_id)


@router.post('/inscricoes', response_model=schemas.EnrollmentRead)
def create_enrollment(payload: schemas.EnrollmentCreate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_current_auth_context)):
    user = db.get(models.User, payload.user_id)
    activity = db.get(models.Activity, payload.activity_id)
    if user is None or activity is None:
        raise HTTPException(status_code=404, detail='Usuário ou atividade não encontrado.')
    enforce_unit_scope(ctx, user.unit_id)
    enforce_unit_scope(ctx, activity.unit_id)
    return CrudService(db).create_enrollment(payload)


@router.get('/inscricoes', response_model=list[schemas.EnrollmentRead])
def list_enrollments(db: Session = Depends(get_db), ctx: AuthContext = Depends(get_current_auth_context)):
    rows = CrudService(db).list_enrollments()
    if ctx.is_admin:
        return rows
    user_ids = set(db.scalars(select(models.User.id).where(models.User.unit_id == ctx.social_unit_id)).all())
    return [row for row in rows if row.user_id in user_ids]


@router.delete('/inscricoes/{enrollment_id}', status_code=204)
def delete_enrollment(enrollment_id: int, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_current_auth_context)):
    row = db.get(models.Enrollment, enrollment_id)
    if row is None:
        raise HTTPException(status_code=404, detail='Inscricao nao encontrada.')
    user = db.get(models.User, row.user_id)
    if user is not None:
        enforce_unit_scope(ctx, user.unit_id)
    CrudService(db).delete_enrollment(enrollment_id)


@router.post('/frequencias', response_model=schemas.AttendanceRead)
def create_attendance(payload: schemas.AttendanceCreate, db: Session = Depends(get_db)):
    return AttendanceService(db).register(payload)


@router.post('/frequencias/lote', response_model=list[schemas.AttendanceRead])
def create_attendance_bulk(payload: list[schemas.AttendanceCreate], db: Session = Depends(get_db)):
    return AttendanceService(db).bulk_register(payload)


def _normalize_shift(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in {"manha", "manhã"}:
        return "Manhã"
    if normalized == "tarde":
        return "Tarde"
    raise HTTPException(status_code=400, detail="Turno invalido. Use manha ou tarde.")


def _week_days_from_reference(week_reference: date) -> list[date]:
    monday = week_reference - timedelta(days=week_reference.weekday())
    return [monday + timedelta(days=offset) for offset in range(5)]


def _weekday_key(day: date) -> str:
    mapping = {0: "segunda", 1: "terca", 2: "quarta", 3: "quinta", 4: "sexta"}
    return mapping[day.weekday()]


@router.get('/frequencias/grupos', response_model=list[schemas.FrequenciaGrupoRead])
def list_frequency_groups(
    turno: str,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    shift = _normalize_shift(turno)
    query = select(models.Group).where(models.Group.shift == shift).order_by(models.Group.name.asc())
    if ctx.social_unit_id is not None:
        query = query.where(models.Group.unit_id == ctx.social_unit_id)
    groups = list(db.scalars(query).all())
    return [{"id": g.id, "nome": g.name, "turno": g.shift, "faixa_etaria": f"{g.initial_age} a {g.final_age} anos"} for g in groups]


@router.get('/frequencias/usuarios', response_model=list[schemas.FrequenciaUsuarioRead])
def list_frequency_users(
    grupo_id: int,
    turno: str,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    shift = _normalize_shift(turno)
    group = db.get(models.Group, grupo_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Grupo não encontrado.")
    _enforce_effective_unit_scope(ctx, group.unit_id)
    if group.shift != shift:
        raise HTTPException(status_code=400, detail="Grupo não pertence ao turno informado.")

    query = (
        select(models.User)
        .join(models.UserGroup, models.UserGroup.user_id == models.User.id)
        .where(
            and_(
                models.UserGroup.group_id == grupo_id,
                models.User.shift == shift,
                models.User.status == schemas.UserStatus.ACTIVE,
            )
        )
        .order_by(models.User.name.asc())
    )
    users = list(db.scalars(query).all())
    if ctx.social_unit_id is not None:
        users = [u for u in users if u.unit_id == ctx.social_unit_id]
    return [
        {
            "usuario_id": u.id,
            "nome": u.name,
            "idade": u.age,
            "grupo_id": group.id,
            "grupo_nome": group.name,
            "turno": group.shift,
        }
        for u in users
    ]


@router.get('/frequencias/semanal', response_model=schemas.FrequenciaSemanaRead)
def get_weekly_frequency(
    semana: date,
    grupo_id: int,
    turno: str,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    shift = _normalize_shift(turno)
    users = list_frequency_users(grupo_id=grupo_id, turno=shift, db=db, ctx=ctx)
    days = _week_days_from_reference(semana)
    day_set = set(days)
    user_ids = [item["usuario_id"] for item in users]

    records = []
    if user_ids:
        records = list(
            db.scalars(
                select(models.GroupAttendance).where(
                    and_(
                        models.GroupAttendance.group_id == grupo_id,
                        models.GroupAttendance.shift == shift,
                        models.GroupAttendance.user_id.in_(user_ids),
                        models.GroupAttendance.attendance_date.in_(day_set),
                    )
                )
            ).all()
        )

    by_user_day = {(r.user_id, r.attendance_date): bool(r.present) for r in records}
    frequencias = []
    for user in users:
        dias = {}
        for d in days:
            dias[_weekday_key(d)] = by_user_day.get((user["usuario_id"], d), False)
        frequencias.append({"usuario_id": user["usuario_id"], "dias": dias})

    return {
        "semana_referencia": days[0],
        "grupo_id": grupo_id,
        "turno": shift,
        "frequencias": frequencias,
    }


@router.post('/frequencias/semanal', response_model=schemas.FrequenciaSemanaRead)
def save_weekly_frequency(
    payload: schemas.FrequenciaSemanaSavePayload,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    shift = _normalize_shift(payload.turno)
    users = list_frequency_users(grupo_id=payload.grupo_id, turno=shift, db=db, ctx=ctx)
    allowed_user_ids = {item["usuario_id"] for item in users}
    payload_user_ids = {item.usuario_id for item in payload.frequencias}
    if payload_user_ids - allowed_user_ids:
        raise HTTPException(status_code=400, detail="Ha usuarios fora do grupo/turno informado.")

    days = _week_days_from_reference(payload.semana_referencia)
    day_keys = ["segunda", "terca", "quarta", "quinta", "sexta"]
    key_to_date = {day_keys[i]: days[i] for i in range(5)}

    for row in payload.frequencias:
        for key in row.dias.keys():
            if key not in key_to_date:
                raise HTTPException(status_code=400, detail="Dias invalidos. Use segunda, terca, quarta, quinta e sexta.")

    existing = list(
        db.scalars(
            select(models.GroupAttendance).where(
                and_(
                    models.GroupAttendance.group_id == payload.grupo_id,
                    models.GroupAttendance.shift == shift,
                    models.GroupAttendance.user_id.in_(list(payload_user_ids) or [0]),
                    models.GroupAttendance.attendance_date.in_(set(days)),
                )
            )
        ).all()
    )
    existing_map = {(r.user_id, r.attendance_date): r for r in existing}

    for row in payload.frequencias:
        for key, present in row.dias.items():
            frequency_date = key_to_date[key]
            current = existing_map.get((row.usuario_id, frequency_date))
            if current is None:
                db.add(
                    models.GroupAttendance(
                        user_id=row.usuario_id,
                        group_id=payload.grupo_id,
                        shift=shift,
                        attendance_date=frequency_date,
                        present=bool(present),
                    )
                )
            else:
                current.present = bool(present)

    db.commit()
    return get_weekly_frequency(
        semana=payload.semana_referencia,
        grupo_id=payload.grupo_id,
        turno=shift,
        db=db,
        ctx=ctx,
    )


@router.post('/justificativas', response_model=schemas.JustificationRead)
def create_justification(payload: schemas.JustificationCreate, db: Session = Depends(get_db)):
    return AttendanceService(db).justify_absence(payload)


@router.patch('/justificativas/{justification_id}', response_model=schemas.JustificationRead)
def decide_justification(justification_id: int, payload: schemas.JustificationDecision, db: Session = Depends(get_db)):
    return AttendanceService(db).decide_justification(justification_id, payload)


@router.post('/relatorios', response_model=schemas.ReportRead)
def create_report(payload: schemas.ReportCreate, db: Session = Depends(get_db)):
    return ReportService(db).create_report(payload)


@router.post('/relatorios/{report_id}/enviar', response_model=schemas.ReportRead)
def send_report(report_id: int, db: Session = Depends(get_db)):
    return ReportService(db).send_report(report_id)


@router.post('/relatorios/{report_id}/revisar', response_model=schemas.ReportRead)
def review_report(report_id: int, payload: schemas.ReportDecision, db: Session = Depends(get_db)):
    return ReportService(db).review_report(report_id, payload)


@router.post('/participantes', response_model=schemas.ParticipantRead)
def create_participant(payload: schemas.ParticipantCreate, db: Session = Depends(get_db)):
    return ParticipantService(db).create(payload)


@router.put('/participantes/{participant_id}/etapas', response_model=schemas.ParticipantRead)
def update_participant_stage(participant_id: int, payload: schemas.ParticipantStageUpdate, db: Session = Depends(get_db)):
    return ParticipantService(db).update_stage(participant_id, payload)


@router.post('/participantes/{participant_id}/concluir', response_model=schemas.ParticipantRead)
def conclude_participant(participant_id: int, payload: schemas.ParticipantConclude, db: Session = Depends(get_db)):
    return ParticipantService(db).conclude(participant_id, payload)


@router.get('/participantes', response_model=list[schemas.ParticipantRead])
def list_participants(db: Session = Depends(get_db)):
    return ParticipantService(db).list_participants()


@router.get('/participantes/{participant_id}/historico')
def participant_history(participant_id: int, db: Session = Depends(get_db)):
    return ParticipantService(db).history(participant_id)


@router.get('/classificacao-grupos', response_model=list[schemas.GroupClassificationItem])
def list_group_classification(
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    unit_id = _unit_scope_or_none(ctx)
    return GroupClassificationService(db).list_classification(unit_id=unit_id)


@router.get('/classificacao-grupos/{group_id}', response_model=schemas.GroupClassificationItem)
def get_group_classification(
    group_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    unit_id = _unit_scope_or_none(ctx)
    rows = GroupClassificationService(db).list_classification(group_id=group_id, unit_id=unit_id)
    if not rows:
        raise HTTPException(status_code=404, detail='Grupo não encontrado.')
    return rows[0]


@router.post('/classificacao-grupos/vincular-usuario', status_code=204)
def link_user_to_group(
    payload: schemas.GroupClassificationLinkPayload,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    if not _can_manage_group_classification(ctx):
        raise HTTPException(status_code=403, detail='Acesso negado.')
    unit_id = _unit_scope_or_none(ctx)
    GroupClassificationService(db).link_user(payload, unit_id=unit_id)


@router.delete('/classificacao-grupos/desvincular-usuario', status_code=204)
def unlink_user_from_group(
    payload: schemas.GroupClassificationLinkPayload,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_current_auth_context),
):
    if not _can_manage_group_classification(ctx):
        raise HTTPException(status_code=403, detail='Acesso negado.')
    unit_id = _unit_scope_or_none(ctx)
    GroupClassificationService(db).unlink_user(payload, unit_id=unit_id)
