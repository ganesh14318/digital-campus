from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserCreate, UserUpdate, UserResponse, MessageResponse
from app.auth import get_current_user, require_role, get_password_hash

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
async def list_users(
    role: str = None,
    department_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CREATOR_ADMIN, UserRole.HOD, UserRole.TEACHER)),
):
    """List users. Admins see all; HODs and Teachers see only their department."""
    query = db.query(User)

    if current_user.role in (UserRole.HOD, UserRole.TEACHER):
        query = query.filter(User.department_id == current_user.department_id)

    if current_user.role == UserRole.TEACHER:
        if role:
            query = query.filter(User.role == role)
        else:
            query = query.filter(User.role == UserRole.STUDENT)
    elif role:
        query = query.filter(User.role == role)

    if department_id:
        if current_user.role in (UserRole.HOD, UserRole.TEACHER) and department_id != current_user.department_id:
            raise HTTPException(status_code=403, detail="Access denied to other departments")
        query = query.filter(User.department_id == department_id)

    users = query.all()
    return [
        UserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            department_id=u.department_id,
            is_active=u.is_active,
            created_at=u.created_at,
            department_name=u.department.name if u.department else None,
        )
        for u in users
    ]


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CREATOR_ADMIN)),
):
    """Create a new user (Admin only)."""
    # Check uniqueness
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        department_id=user_data.department_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department_id=user.department_id,
        is_active=user.is_active,
        created_at=user.created_at,
        department_name=user.department.name if user.department else None,
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CREATOR_ADMIN)),
):
    """Update user details (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department_id=user.department_id,
        is_active=user.is_active,
        created_at=user.created_at,
        department_name=user.department.name if user.department else None,
    )


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CREATOR_ADMIN)),
):
    """Delete a user (Admin only). Prevents self-deletion."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return MessageResponse(message=f"User '{user.username}' deleted successfully")
