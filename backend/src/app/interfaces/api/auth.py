from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import hmac

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.infrastructure.db import models
from app.infrastructure.db.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    user_id: int
    profile: str | None
    is_admin: bool
    social_unit_id: int | None
    permissions: set[str]


def hash_password(password: str) -> str:
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), b'acm-salt', 120000)
    return digest.hex()


def verify_password(password: str, password_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), password_hash)


def create_access_token(payload: dict) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expires_minutes)
    token_payload = {**payload, 'exp': expires_at}
    return jwt.encode(token_payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Token invalido.')


def _permissions_from_db(db: Session, profile_name: str | None) -> set[str]:
    if not profile_name:
        return set()
    query = (
        select(models.Permission.code)
        .join(models.ProfilePermission, models.ProfilePermission.permission_id == models.Permission.id)
        .join(models.Profile, models.Profile.id == models.ProfilePermission.profile_id)
        .where(models.Profile.name == profile_name)
    )
    return set(db.scalars(query).all())


def get_current_auth_context(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AuthContext:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Nao autenticado.')
    payload = decode_access_token(credentials.credentials)
    user_id = int(payload.get('user_id'))
    collaborator = db.get(models.Collaborator, user_id)
    if collaborator is None or not collaborator.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Usuario invalido ou inativo.')

    token_permissions = payload.get('permissions') or []
    if not isinstance(token_permissions, list):
        token_permissions = []
    db_permissions = _permissions_from_db(db, collaborator.role)
    permissions = set(db_permissions).union({str(p) for p in token_permissions if p})
    scoped_social_unit_id = payload.get('social_unit_id') if collaborator.is_admin else collaborator.social_unit_id
    return AuthContext(
        user_id=collaborator.id,
        profile=collaborator.role,
        is_admin=bool(collaborator.is_admin),
        social_unit_id=scoped_social_unit_id,
        permissions=permissions,
    )


def require_permission(permission_code: str):
    def checker(ctx: AuthContext = Depends(get_current_auth_context)) -> AuthContext:
        if ctx.is_admin:
            return ctx
        if permission_code not in ctx.permissions:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Acesso negado.')
        return ctx

    return checker


def require_admin(ctx: AuthContext = Depends(get_current_auth_context)) -> AuthContext:
    if not ctx.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Acesso permitido apenas para administrador.')
    return ctx


def enforce_unit_scope(ctx: AuthContext, target_unit_id: int | None) -> None:
    if ctx.is_admin:
        return
    if target_unit_id is None or ctx.social_unit_id is None or int(target_unit_id) != int(ctx.social_unit_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Acesso nao autorizado para esta Unidade Social.')
