from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Course, User, UserRole
from app.schemas import CourseCreate, CourseUpdate, CourseResponse, MessageResponse
from app.auth import get_current_user, require_role, require_same_department

router = APIRouter()


@router.get("/", response_model=List[CourseResponse])
async def list_courses(
    department_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List courses. Students/Teachers/HODs see their department; Admins see all."""
    query = db.query(Course)

    if current_user.role != UserRole.CREATOR_ADMIN:
        query = query.filter(Course.department_id == current_user.department_id)
    elif department_id:
        query = query.filter(Course.department_id == department_id)

    courses = query.all()
    return [
        CourseResponse(
            id=c.id,
            name=c.name,
            code=c.code,
            description=c.description,
            credits=c.credits,
            semester=c.semester,
            department_id=c.department_id,
            teacher_id=c.teacher_id,
            department_name=c.department.name if c.department else None,
            teacher_name=c.teacher.full_name if c.teacher else None,
            created_at=c.created_at,
        )
        for c in courses
    ]


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role != UserRole.CREATOR_ADMIN:
        require_same_department(current_user, course.department_id)

    return CourseResponse(
        id=course.id,
        name=course.name,
        code=course.code,
        description=course.description,
        credits=course.credits,
        semester=course.semester,
        department_id=course.department_id,
        teacher_id=course.teacher_id,
        department_name=course.department.name if course.department else None,
        teacher_name=course.teacher.full_name if course.teacher else None,
        created_at=course.created_at,
    )


@router.post("/", response_model=CourseResponse, status_code=201)
async def create_course(
    course_data: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.HOD, UserRole.CREATOR_ADMIN)),
):
    """Create a new course (Teacher/HOD/Admin)."""
    if current_user.role not in (UserRole.CREATOR_ADMIN,):
        require_same_department(current_user, course_data.department_id)

    if db.query(Course).filter(Course.code == course_data.code).first():
        raise HTTPException(status_code=400, detail="Course code already exists")

    course = Course(
        name=course_data.name,
        code=course_data.code,
        description=course_data.description,
        credits=course_data.credits,
        semester=course_data.semester,
        department_id=course_data.department_id,
        teacher_id=course_data.teacher_id or (current_user.id if current_user.role == UserRole.TEACHER else None),
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return CourseResponse(
        id=course.id,
        name=course.name,
        code=course.code,
        description=course.description,
        credits=course.credits,
        semester=course.semester,
        department_id=course.department_id,
        teacher_id=course.teacher_id,
        department_name=course.department.name if course.department else None,
        teacher_name=course.teacher.full_name if course.teacher else None,
        created_at=course.created_at,
    )


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: int,
    course_data: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.HOD, UserRole.CREATOR_ADMIN)),
):
    """Update a course. Teachers can only update their own courses."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role == UserRole.TEACHER and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own courses")
    if current_user.role == UserRole.HOD:
        require_same_department(current_user, course.department_id)

    update_data = course_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(course, key, value)

    db.commit()
    db.refresh(course)
    return CourseResponse(
        id=course.id,
        name=course.name,
        code=course.code,
        description=course.description,
        credits=course.credits,
        semester=course.semester,
        department_id=course.department_id,
        teacher_id=course.teacher_id,
        department_name=course.department.name if course.department else None,
        teacher_name=course.teacher.full_name if course.teacher else None,
        created_at=course.created_at,
    )


@router.delete("/{course_id}", response_model=MessageResponse)
async def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.HOD, UserRole.CREATOR_ADMIN)),
):
    """Delete a course. Teachers can only delete their own courses."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role == UserRole.TEACHER and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own courses")
    if current_user.role == UserRole.HOD:
        require_same_department(current_user, course.department_id)

    db.delete(course)
    db.commit()
    return MessageResponse(message=f"Course '{course.name}' deleted successfully")
