from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Schedule, Course, User, UserRole
from app.schemas import ScheduleCreate, ScheduleUpdate, ScheduleResponse, MessageResponse
from app.auth import get_current_user, require_role, require_same_department

router = APIRouter()


@router.get("/", response_model=List[ScheduleResponse])
async def list_schedules(
    department_id: int = None,
    day_of_week: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List schedules. Filtered by department for non-admins."""
    query = db.query(Schedule)

    if current_user.role != UserRole.CREATOR_ADMIN:
        query = query.filter(Schedule.department_id == current_user.department_id)
    elif department_id:
        query = query.filter(Schedule.department_id == department_id)

    if day_of_week:
        query = query.filter(Schedule.day_of_week == day_of_week)

    schedules = query.order_by(Schedule.day_of_week, Schedule.start_time).all()
    return [
        ScheduleResponse(
            id=s.id,
            course_id=s.course_id,
            department_id=s.department_id,
            day_of_week=s.day_of_week,
            start_time=s.start_time,
            end_time=s.end_time,
            room=s.room,
            course_name=s.course.name if s.course else None,
            course_code=s.course.code if s.course else None,
            teacher_name=s.course.teacher.full_name if s.course and s.course.teacher else None,
            created_at=s.created_at,
        )
        for s in schedules
    ]


@router.post("/", response_model=ScheduleResponse, status_code=201)
async def create_schedule(
    schedule_data: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.HOD, UserRole.CREATOR_ADMIN)),
):
    """Create a new schedule entry."""
    if current_user.role != UserRole.CREATOR_ADMIN:
        require_same_department(current_user, schedule_data.department_id)

    # Verify course exists
    course = db.query(Course).filter(Course.id == schedule_data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role == UserRole.TEACHER and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only schedule your own courses")

    schedule = Schedule(
        course_id=schedule_data.course_id,
        department_id=schedule_data.department_id,
        day_of_week=schedule_data.day_of_week,
        start_time=schedule_data.start_time,
        end_time=schedule_data.end_time,
        room=schedule_data.room,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return ScheduleResponse(
        id=schedule.id,
        course_id=schedule.course_id,
        department_id=schedule.department_id,
        day_of_week=schedule.day_of_week,
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        room=schedule.room,
        course_name=schedule.course.name if schedule.course else None,
        course_code=schedule.course.code if schedule.course else None,
        teacher_name=schedule.course.teacher.full_name if schedule.course and schedule.course.teacher else None,
        created_at=schedule.created_at,
    )


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: int,
    schedule_data: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.HOD, UserRole.CREATOR_ADMIN)),
):
    """Update a schedule entry."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if current_user.role == UserRole.TEACHER:
        if not schedule.course or schedule.course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only update schedules for your own courses")
    elif current_user.role == UserRole.HOD:
        require_same_department(current_user, schedule.department_id)

    update_data = schedule_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(schedule, key, value)

    db.commit()
    db.refresh(schedule)
    return ScheduleResponse(
        id=schedule.id,
        course_id=schedule.course_id,
        department_id=schedule.department_id,
        day_of_week=schedule.day_of_week,
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        room=schedule.room,
        course_name=schedule.course.name if schedule.course else None,
        course_code=schedule.course.code if schedule.course else None,
        teacher_name=schedule.course.teacher.full_name if schedule.course and schedule.course.teacher else None,
        created_at=schedule.created_at,
    )


@router.delete("/{schedule_id}", response_model=MessageResponse)
async def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.HOD, UserRole.CREATOR_ADMIN)),
):
    """Delete a schedule entry."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if current_user.role == UserRole.TEACHER:
        if not schedule.course or schedule.course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only delete schedules for your own courses")
    elif current_user.role == UserRole.HOD:
        require_same_department(current_user, schedule.department_id)

    db.delete(schedule)
    db.commit()
    return MessageResponse(message="Schedule deleted successfully")
