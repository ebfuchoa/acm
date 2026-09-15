from datetime import date, time

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.infrastructure.db import models
from app.infrastructure.db.session import get_db
from app.interfaces.api.auth import AuthContext, get_current_auth_context
from app.main import app


def test_update_occurrence_to_resolved_keeps_responsible_staff_without_duplicate() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    for table in [
        models.Unit.__table__,
        models.Collaborator.__table__,
        models.OccurrenceCategory.__table__,
        models.Local.__table__,
        models.Occurrence.__table__,
        models.OccurrencePerson.__table__,
        models.OccurrenceExternalService.__table__,
        models.OccurrenceStaff.__table__,
        models.OccurrenceHistory.__table__,
    ]:
        table.create(engine)

    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    with test_session() as db:
        db.add(
            models.Unit(
                id=1,
                name="Unidade A",
                address="Rua A",
                district="Centro",
                city="Cidade",
                zip_code="00000-000",
                state="SP",
                phone="(11) 90000-0000",
                email="a@example.com",
                is_matrix=False,
            )
        )
        db.add(
            models.Collaborator(
                id=1,
                name="Profissional Teste",
                cpf="000.000.000-00",
                role="Tecnico",
                social_unit_id=1,
                email="profissional@example.com",
                password_hash="hash",
                is_active=True,
                is_admin=False,
            )
        )
        db.add(models.OccurrenceCategory(id=1, name="Comportamental", is_active=True))
        db.add(models.Local(id=1, name="Recepção", unit_id=1, is_active=True))
        occurrence = models.Occurrence(
            id=1,
            number="OC-2026-000001",
            unit_id=1,
            occurrence_date=date(2026, 9, 11),
            occurrence_time=time(8, 30),
            occurrence_shift="Manhã",
            location="Recepção",
            category_id=1,
            severity="Baixa",
            description="Ocorrência em aberto.",
            status="Aberta",
            created_by=1,
            updated_by=1,
        )
        occurrence.staff.append(models.OccurrenceStaff(collaborator_id=1))
        db.add(occurrence)
        db.commit()

    def override_get_db():
        db: Session = test_session()
        try:
            yield db
        finally:
            db.close()

    def override_auth_context() -> AuthContext:
        return AuthContext(
            user_id=1,
            profile="Tecnico",
            is_admin=False,
            social_unit_id=1,
            permissions=set(),
        )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_auth_context] = override_auth_context
    client = TestClient(app)

    try:
        response = client.put(
            "/api/v1/ocorrencias/1",
            json={
                "occurrence_date": "2026-09-11",
                "occurrence_time": "09:15",
                "occurrence_shift": "Manhã",
                "location": "Recepção",
                "category_id": 1,
                "severity": "Baixa",
                "description": "Ocorrência em aberto.",
                "actions_taken": "Contato realizado com a família.",
                "status": "Resolvida",
                "resolution": "Situação resolvida e registrada.",
                "additional_notes": None,
                "cancellation_reason": None,
                "people": [],
                "external_services": [],
                "staff_ids": [1],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Resolvida"
        assert data["resolution"] == "Situação resolvida e registrada."
        assert data["occurrence_time"] == "09:15:00"
        assert len(data["staff"]) == 1

        with test_session() as db:
            staff_rows = db.query(models.OccurrenceStaff).filter_by(occurrence_id=1).all()
            assert len(staff_rows) == 1
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
