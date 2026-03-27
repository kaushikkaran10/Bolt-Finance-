"""
NovaX — Auth Router
Handles user registration, login, Web3 auth, Firebase auth, token refresh, logout.
JWT access (15m) + refresh (7d) tokens with Redis blacklist.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials as firebase_credentials
import jwt
from eth_account.messages import encode_defunct
from web3 import Web3
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from config import get_settings
from models import get_db
from models.user import User
from models.redis import get_redis
from schemas.auth import (
    LoginRequest,
    RegisterRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserResponse,
    Web3AuthRequest,
)

router = APIRouter()
settings = get_settings()


# ========== Firebase Admin SDK init (singleton) ==========

def _init_firebase():
    """Initialize Firebase Admin SDK once."""
    if firebase_admin._apps:
        return  # Already initialized
    if not settings.firebase_project_id:
        return  # Firebase not configured — skip
    cred = firebase_credentials.Certificate({
        "type": "service_account",
        "project_id": settings.firebase_project_id,
        "client_email": settings.firebase_client_email,
        "private_key": settings.firebase_private_key.replace("\\n", "\n"),
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    firebase_admin.initialize_app(cred)

_init_firebase()



# ========== Helpers ==========

def hash_password(password: str) -> str:
    """Hash password with bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str) -> str:
    """Create short-lived JWT access token (15 min)."""
    payload = {
        "sub": user_id,
        "type": "access",
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str) -> str:
    """Create long-lived JWT refresh token (7 days)."""
    payload = {
        "sub": user_id,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


# ========== Dependencies ==========

from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency: decode JWT, check blacklist, return user."""
    token = credentials.credentials
    payload = decode_token(token)

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    # Check blacklist
    redis = get_redis()
    jti = payload.get("jti")
    if jti and await redis.get(f"auth:blacklist:{jti}"):
        raise HTTPException(status_code=401, detail="Token has been revoked")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


# ========== Routes ==========

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user with email + password."""
    # Check existing email
    result = await db.execute(select(User).where(User.email == request.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Check existing username
    result = await db.execute(select(User).where(User.username == request.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already taken")

    user = User(
        email=request.email,
        username=request.username,
        password_hash=hash_password(request.password),
    )
    db.add(user)
    await db.flush()

    # Generate tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    # Store refresh token in Redis
    redis = get_redis()
    await redis.setex(
        f"auth:refresh:{user.id}",
        timedelta(days=settings.refresh_token_expire_days),
        refresh_token,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email + password, return JWT tokens."""
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    # Store refresh token in Redis (TTL: 7d)
    redis = get_redis()
    await redis.setex(
        f"auth:refresh:{user.id}",
        timedelta(days=settings.refresh_token_expire_days),
        refresh_token,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/web3", response_model=TokenResponse)
async def web3_auth(request: Web3AuthRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate via MetaMask wallet signature (ecrecover)."""
    try:
        # Verify signature using ecrecover
        w3 = Web3()
        message = encode_defunct(text=request.message)
        recovered_address = w3.eth.account.recover_message(
            message, signature=request.signature
        )

        if recovered_address.lower() != request.address.lower():
            raise HTTPException(status_code=401, detail="Signature verification failed")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Web3 auth failed: {str(e)}")

    # UPSERT user by wallet address
    result = await db.execute(
        select(User).where(User.wallet_address == request.address.lower())
    )
    user = result.scalar_one_or_none()

    if not user:
        # Create new user from wallet
        user = User(
            wallet_address=request.address.lower(),
            username=f"0x{request.address[2:8]}...{request.address[-4:]}",
        )
        db.add(user)
        await db.flush()

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    redis = get_redis()
    await redis.setex(
        f"auth:refresh:{user.id}",
        timedelta(days=settings.refresh_token_expire_days),
        refresh_token,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)
):
    """Rotate JWT tokens using a valid refresh token."""
    payload = decode_token(request.refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")

    # Verify refresh token matches what's in Redis
    redis = get_redis()
    stored_token = await redis.get(f"auth:refresh:{user_id}")
    if stored_token != request.refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token revoked or expired")

    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Rotate tokens
    new_access = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)

    await redis.setex(
        f"auth:refresh:{user.id}",
        timedelta(days=settings.refresh_token_expire_days),
        new_refresh,
    )

    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout: blacklist the current access token JTI."""
    token = credentials.credentials
    payload = decode_token(token)

    jti = payload.get("jti")
    user_id = payload.get("sub")

    redis = get_redis()

    # Blacklist access token (TTL: 1d)
    if jti:
        await redis.setex(f"auth:blacklist:{jti}", timedelta(days=1), "1")

    # Delete refresh token
    await redis.delete(f"auth:refresh:{user_id}")


# ========== Firebase Auth Routes ==========

class FirebaseAuthRequest(BaseModel):
    uid: str
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None


class FirebaseTokenRequest(BaseModel):
    id_token: str


@router.post("/firebase", response_model=TokenResponse)
async def firebase_login(request: FirebaseAuthRequest, db: AsyncSession = Depends(get_db)):
    """Upsert Firebase-authenticated user in PostgreSQL and return NovaX JWTs."""
    username = None
    if request.email:
        username = request.email.split("@")[0].replace(".", "_").lower()

    result = await db.execute(select(User).where(User.firebase_uid == request.uid))
    user = result.scalar_one_or_none()

    if not user:
        if request.email:
            result = await db.execute(select(User).where(User.email == request.email))
            user = result.scalar_one_or_none()

        if user:
            user.firebase_uid = request.uid
            if not user.avatar_url and request.picture:
                user.avatar_url = request.picture
        else:
            base_username = username or f"user_{request.uid[:8]}"
            final_username = base_username
            counter = 1
            while True:
                res = await db.execute(select(User).where(User.username == final_username))
                if not res.scalar_one_or_none():
                    break
                final_username = f"{base_username}_{counter}"
                counter += 1

            user = User(
                email=request.email,
                username=final_username,
                firebase_uid=request.uid,
                avatar_url=request.picture,
            )
            db.add(user)
            await db.flush()

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    redis = get_redis()
    await redis.setex(
        f"auth:refresh:{user.id}",
        timedelta(days=settings.refresh_token_expire_days),
        refresh_token,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/firebase/verify", response_model=TokenResponse)
async def firebase_verify_and_login(
    request: FirebaseTokenRequest, db: AsyncSession = Depends(get_db)
):
    """Client sends raw Firebase ID token; backend verifies and returns NovaX JWTs."""
    if not firebase_admin._apps:
        raise HTTPException(status_code=503, detail="Firebase not configured on server.")
    try:
        decoded = firebase_auth.verify_id_token(request.id_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Firebase token invalid: {str(e)}")

    firebase_request = FirebaseAuthRequest(
        uid=decoded["uid"],
        email=decoded.get("email"),
        name=decoded.get("name"),
        picture=decoded.get("picture"),
    )
    return await firebase_login(firebase_request, db)
