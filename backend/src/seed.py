from app.infrastructure.db.models import Unit
from app.infrastructure.db.session import SessionLocal


def run() -> None:
    db = SessionLocal()
    try:
        if db.query(Unit).count() == 0:
            db.add_all(
                [
                    Unit(
                        name="Matriz",
                        address="Rua Central, 100",
                        district="Centro",
                        city="São Paulo",
                        zip_code="01000-000",
                        state="SP",
                        phone="(11) 90000-0000",
                        email="matriz@acm.org.br",
                        is_matrix=True,
                    ),
                    Unit(
                        name="Unidade Social Norte",
                        address="Av. Norte, 200",
                        district="Santana",
                        city="São Paulo",
                        zip_code="02000-000",
                        state="SP",
                        phone="(11) 91111-1111",
                        email="norte@acm.org.br",
                        is_matrix=False,
                    ),
                ]
            )
            db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    run()
