import os
from datetime import datetime, timedelta
from typing import Optional, Union, Dict, Any
import hashlib
import bcrypt

import jwt
from fastapi import APIRouter, HTTPException, Depends, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

SECRET_KEY       = os.getenv("JWT_SECRET_KEY",   "agentclamp-super-secret-jwt-key-2026")
ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "agentclamp-admin-2026")
ALGORITHM        = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days session

# Passcodes configured via environment (comma-separated for multiple keys)
raw_passcodes = os.getenv("ACCESS_PASSCODES", os.getenv("ACCESS_PASSCODE", "agentclamp-2026"))
ALLOWED_PASSCODES = [p.strip() for p in raw_passcodes.split(",") if p.strip()]

security_bearer = HTTPBearer(auto_error=False)


# ── Password helpers ────────────────────────────────────────────

def _prepare_password(password: str) -> bytes:
    # SHA-256 pre-hash → fixed 64-hex chars (always < 72 bytes, safe for bcrypt)
    return hashlib.sha256(password.encode("utf-8")).hexdigest().encode("utf-8")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prepare_password(password), bcrypt.gensalt(rounds=12)).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(_prepare_password(plain_password), hashed_password.encode("utf-8"))
    except Exception:
        return False


# ── JWT helpers ─────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ── Admin guard ─────────────────────────────────────────────────

def require_admin(x_admin_key: Optional[str] = Header(None)):
    if not x_admin_key or x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing admin key"
        )


# ── Schemas ─────────────────────────────────────────────────────

class PasscodeRequest(BaseModel):
    passcode: str

class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    organization: Optional[str] = None
    purpose: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ── Current user dependency ─────────────────────────────────────

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> Optional[Union[User, Dict[str, Any]]]:
    if not credentials:
        return None
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            return None
            
        # If this is a passcode-authenticated user (zero database dependency)
        if user_id.startswith("passcode_") or payload.get("is_passcode_auth"):
            return {
                "id": user_id,
                "full_name": payload.get("full_name", "Authorized Operator"),
                "email": payload.get("email", "operator@agentclamp.io"),
                "role": payload.get("role", "operator"),
                "created_at": datetime.utcnow().isoformat(),
            }
    except jwt.PyJWTError:
        return None

    try:
        user = db.query(User).filter(User.id == user_id).first()
        return user
    except Exception:
        return None


# ── Public endpoints ────────────────────────────────────────────

@router.post("/passcode", response_model=AuthResponse)
def verify_passcode(req: PasscodeRequest):
    """
    Zero-database authentication via shared access passcode.
    No PostgreSQL or SQLite persistence required for live deployment.
    """
    input_code = req.passcode.strip()
    
    # Reload passcodes dynamically in case env changed
    active_passcodes = [
        p.strip() for p in os.getenv("ACCESS_PASSCODES", os.getenv("ACCESS_PASSCODE", "agentclamp-2026")).split(",") if p.strip()
    ]
    if input_code not in active_passcodes and input_code not in ALLOWED_PASSCODES:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access passcode. Please request an access key from the administrator."
        )

    code_hash = hashlib.sha256(input_code.encode()).hexdigest()[:8]
    token = create_access_token({
        "sub": f"passcode_{code_hash}",
        "full_name": "Authorized Operator",
        "email": "operator@agentclamp.io",
        "role": "admin",
        "is_passcode_auth": True
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": f"passcode_{code_hash}",
            "full_name": "Authorized Operator",
            "email": "operator@agentclamp.io",
            "role": "admin",
        },
    }


@router.post("/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    """Register a new user — account starts as pending, requires admin approval to log in."""
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    user = User(
        email=req.full_name,
        full_name=req.full_name,
        hashed_password=hash_password(req.password),
        is_approved=False,
        role="user",
    )
    user.email = req.email.lower()

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "status": "pending",
        "message": "Your access request has been submitted and is pending administrator review.",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
        },
    }


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user — only approved accounts can obtain a JWT."""
    user = db.query(User).filter(User.email == req.email.lower()).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact the administrator."
        )

    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PENDING_APPROVAL: Your account is awaiting admin approval. You will be notified once access is granted."
        )

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
        },
    }


@router.get("/me")
def get_me(user: Optional[Union[User, Dict[str, Any]]] = Depends(get_current_user)):
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    if isinstance(user, dict):
        return user
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if hasattr(user, 'created_at') and user.created_at else "",
    }


# ── Admin endpoints ─────────────────────────────────────────────

@router.get("/admin/users")
def admin_list_users(
    _: None = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all registered users (pending + approved + deactivated)."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_approved": u.is_approved,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]


@router.post("/admin/users/{user_id}/approve")
def admin_approve_user(
    user_id: str,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Approve a pending user — they can now log in."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_approved = True
    user.is_active   = True
    db.commit()
    return {"status": "approved", "user_id": user_id, "email": user.email}


@router.post("/admin/users/{user_id}/reject")
def admin_reject_user(
    user_id: str,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Reject a user — deactivates the account (keeps record for audit)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_approved = False
    user.is_active   = False
    db.commit()
    return {"status": "rejected", "user_id": user_id, "email": user.email}


@router.delete("/admin/users/{user_id}")
def admin_delete_user(
    user_id: str,
    _: None = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Permanently delete a user record."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"status": "deleted", "user_id": user_id}
