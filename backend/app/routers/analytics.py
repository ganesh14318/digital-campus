from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, UserRole, Department, Course, Announcement
from app.schemas import SystemAnalytics, DepartmentAnalytics
from app.auth import require_role

router = APIRouter()


@router.get("/", response_model=SystemAnalytics)
async def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.HOD, UserRole.CREATOR_ADMIN)),
):
    """Get system analytics. HODs see only their department; Admins see all."""
    departments = db.query(Department).all()
    dept_analytics = []

    for dept in departments:
        if current_user.role == UserRole.HOD and dept.id != current_user.department_id:
            continue

        student_count = db.query(User).filter(
            User.department_id == dept.id,
            User.role == UserRole.STUDENT,
        ).count()
        teacher_count = db.query(User).filter(
            User.department_id == dept.id,
            User.role == UserRole.TEACHER,
        ).count()
        course_count = db.query(Course).filter(Course.department_id == dept.id).count()
        announcement_count = db.query(Announcement).filter(
            Announcement.department_id == dept.id
        ).count()

        dept_analytics.append(DepartmentAnalytics(
            department_id=dept.id,
            department_name=dept.name,
            student_count=student_count,
            teacher_count=teacher_count,
            course_count=course_count,
            announcement_count=announcement_count,
        ))

    return SystemAnalytics(
        total_users=db.query(User).count(),
        total_departments=db.query(Department).count(),
        total_courses=db.query(Course).count(),
        total_announcements=db.query(Announcement).count(),
        departments=dept_analytics,
    )
