from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.infrastructure.db import models
from app.infrastructure.db.session import get_db
from app.interfaces.api.auth import AuthContext, get_current_auth_context
from app.main import app


def test_locals_crud_respects_social_unit_scope_and_soft_delete() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    models.Unit.__table__.create(engine)
    models.Collaborator.__table__.create(engine)
    models.Local.__table__.create(engine)
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
                models.Local(id=1, name="Sala de outra unidade", unit_id=2, is_active=True),
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
            permissions=set(),
        )

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_auth_context] = override_auth_context
    client = TestClient(app)

    try:
        forbidden_create = client.post("/api/v1/locais", json={"name": "Sala 2", "unit_id": 2})
        assert forbidden_create.status_code == 403

        create_response = client.post("/api/v1/locais", json={"name": "  Sala   1  "})
        assert create_response.status_code == 200
        local_id = create_response.json()["id"]
        assert create_response.json()["name"] == "Sala 1"
        assert create_response.json()["unit_id"] == 1

        list_response = client.get("/api/v1/locais")
        assert list_response.status_code == 200
        assert [item["name"] for item in list_response.json()["items"]] == ["Sala 1"]

        forbidden_get = client.get("/api/v1/locais/1")
        assert forbidden_get.status_code == 403

        delete_response = client.delete(f"/api/v1/locais/{local_id}")
        assert delete_response.status_code == 204

        after_delete = client.get("/api/v1/locais")
        assert after_delete.status_code == 200
        assert after_delete.json()["items"] == []

        with test_session() as db:
            local = db.get(models.Local, local_id)
            assert local is not None
            assert local.is_active is False
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
