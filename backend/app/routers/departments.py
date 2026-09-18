from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Department, User, UserRole, Course, Announcement
from app.schemas import DepartmentCreate, DepartmentUpdate, DepartmentResponse, MessageResponse
from app.auth import get_current_user, require_role

router = APIRouter()


@router.get("/", response_model=List[DepartmentResponse])
async def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all departments. Available to all authenticated users."""
    departments = db.query(Department).all()
    return [
        DepartmentResponse(
            id=d.id,
            name=d.name,
            code=d.code,
            description=d.description,
            hod_id=d.hod_id,
            hod_name=d.hod.full_name if d.hod else None,
            created_at=d.created_at,
        )
        for d in departments
    ]


@router.get("/{dept_id}", response_model=DepartmentResponse)
async def get_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single department by ID."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        code=dept.code,
        description=dept.description,
        hod_id=dept.hod_id,
        hod_name=dept.hod.full_name if dept.hod else None,
        created_at=dept.created_at,
    )


@router.post("/", response_model=DepartmentResponse, status_code=201)
async def create_department(
    dept_data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CREATOR_ADMIN)),
):
    """Create a new department (Admin only)."""
    if db.query(Department).filter(Department.code == dept_data.code).first():
        raise HTTPException(status_code=400, detail="Department code already exists")
    if db.query(Department).filter(Department.name == dept_data.name).first():
        raise HTTPException(status_code=400, detail="Department name already exists")

    dept = Department(
        name=dept_data.name,
        code=dept_data.code,
        description=dept_data.description,
        hod_id=dept_data.hod_id,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        code=dept.code,
        description=dept.description,
        hod_id=dept.hod_id,
        hod_name=dept.hod.full_name if dept.hod else None,
        created_at=dept.created_at,
    )


@router.put("/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: int,
    dept_data: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CREATOR_ADMIN)),
):
    """Update department details (Admin only)."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    update_data = dept_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dept, key, value)

    db.commit()
    db.refresh(dept)
    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        code=dept.code,
        description=dept.description,
        hod_id=dept.hod_id,
        hod_name=dept.hod.full_name if dept.hod else None,
        created_at=dept.created_at,
    )


@router.delete("/{dept_id}", response_model=MessageResponse)
async def delete_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.CREATOR_ADMIN)),
):
    """Delete a department (Admin only). Prevents deletion if it has dependent records."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Check for dependent records
    user_count = db.query(User).filter(User.department_id == dept_id).count()
    course_count = db.query(Course).filter(Course.department_id == dept_id).count()
    announcement_count = db.query(Announcement).filter(Announcement.department_id == dept_id).count()

    if user_count > 0 or course_count > 0 or announcement_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete department. It has {user_count} users, {course_count} courses, and {announcement_count} announcements.",
        )

    db.delete(dept)
    db.commit()
    return MessageResponse(message=f"Department '{dept.name}' deleted successfully")
