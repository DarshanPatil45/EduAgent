import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from database.connection import get_db
from core.auth import hash_password, verify_password, create_access_token, get_current_user
from models.schemas import SignupRequest, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest):
    db = get_db()
    existing = await db.users.find_one({"email": request.email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user_id = str(uuid.uuid4())
    user = {
        "_id": user_id,
        "email": request.email,
        "full_name": request.full_name,
        "hashed_password": hash_password(request.password),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user)

    token = create_access_token({"sub": user_id})
    return TokenResponse(
        access_token=token,
        user_id=user_id,
        full_name=request.full_name,
        email=request.email,
    )

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    db = get_db()
    user = await db.users.find_one({"email": request.email})
    if not user or not verify_password(request.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    token = create_access_token({"sub": user["_id"]})
    return TokenResponse(
        access_token=token,
        user_id=user["_id"],
        full_name=user["full_name"],
        email=user["email"],
    )

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["_id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "created_at": current_user.get("created_at"),
    }