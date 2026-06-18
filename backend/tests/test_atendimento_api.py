from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.infrastructure.db import models
from app.infrastructure.db.session import get_db
from app.interfaces.api.auth import AuthContext, get_current_auth_context
from app.main import app


def test_atendimentos_crud_respects_social_unit_scope() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    models.Unit.__table__.create(engine)
    models.Collaborator.__table__.create(engine)
    models.Atendimento.__table__.create(engine)
    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    with test_session() as db:
        db.add_all(
            [
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
                    is_matrix=True,
                ),
                models.Unit(
                    id=2,
                    name="Unidade B",
                    address="Rua B",
                    district="Centro",
                    city="Cidade",
                    zip_code="00000-001",
                    state="SP",
                    phone="(11) 90000-0001",
                    email="b@example.com",
                    is_matrix=False,
                ),
                models.Atendimento(
                    unidade_social_id=2,
                    atendente_nome="Outro profissional",
                    atendente_funcao="Tecnico",
                    data_atendimento=date(2026, 6, 1),
                    nome="Outro usuario",
                    demanda="Registro de outra unidade.",
                ),
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
                ),
            ]
        )
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
            permissions={"atendimentos.read", "atendimentos.write", "atendimentos.delete"},
        )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_auth_context] = override_auth_context
    client = TestClient(app)

    try:
        create_response = client.post(
            "/api/v1/atendimentos",
            json={
                "data_atendimento": "2026-06-02",
                "nome": "Maria da Silva",
                "demanda": "Solicitacao de acompanhamento social.",
            },
        )
        assert create_response.status_code == 200
        atendimento_id = create_response.json()["id"]
        assert create_response.json()["atendente_nome"] == "Profissional Teste"
        assert create_response.json()["atendente_funcao"] == "Tecnico"

        list_response = client.get("/api/v1/atendimentos")
        assert list_response.status_code == 200
        assert [item["nome"] for item in list_response.json()] == ["Maria da Silva"]
        assert list_response.json()[0]["atendente_nome"] == "Profissional Teste"

        with test_session() as db:
            collaborator = db.get(models.Collaborator, 1)
            collaborator.name = "Profissional Atualizado"
            collaborator.role = "Coordenadora"
            db.commit()

        get_response = client.get(f"/api/v1/atendimentos/{atendimento_id}")
        assert get_response.status_code == 200
        assert get_response.json()["atendente_nome"] == "Profissional Atualizado"
        assert get_response.json()["atendente_funcao"] == "Coordenadora"

        update_response = client.put(
            f"/api/v1/atendimentos/{atendimento_id}",
            json={
                "data_atendimento": "2026-06-03",
                "nome": "Maria da Silva",
                "demanda": "Demanda atualizada.",
            },
        )
        assert update_response.status_code == 200
        assert update_response.json()["demanda"] == "Demanda atualizada."

        forbidden_response = client.get("/api/v1/atendimentos/1")
        assert forbidden_response.status_code == 403

        delete_response = client.delete(f"/api/v1/atendimentos/{atendimento_id}")
        assert delete_response.status_code == 204
    finally:
        app.dependency_overrides.clear()
        engine.dispose()


def test_administrador_can_create_atendimento() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    models.Unit.__table__.create(engine)
    models.Collaborator.__table__.create(engine)
    models.Atendimento.__table__.create(engine)
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
                is_matrix=True,
            )
        )
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
            profile="Administrador",
            is_admin=True,
            social_unit_id=1,
            permissions=set(),
        )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_auth_context] = override_auth_context
    client = TestClient(app)

    try:
        response = client.post(
            "/api/v1/atendimentos",
            json={
                "data_atendimento": "2026-06-02",
                "nome": "Maria da Silva",
                "demanda": "Solicitacao de acompanhamento social.",
            },
        )
        assert response.status_code == 200
        assert response.json()["colaborador_id"] is None
        assert response.json()["atendente_nome"] == "Administrador"
        assert response.json()["atendente_funcao"] == "Administrador"
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
