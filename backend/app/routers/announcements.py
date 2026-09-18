from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Announcement, User, UserRole
from app.schemas import AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse, MessageResponse
from app.auth import get_current_user, require_role, require_same_department

router = APIRouter()


@router.get("/", response_model=List[AnnouncementResponse])
async def list_announcements(
    department_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List announcements. Students/Teachers/HODs see their department + system-wide. Admins see all."""
    query = db.query(Announcement)

    if current_user.role != UserRole.CREATOR_ADMIN:
        query = query.filter(
            (Announcement.department_id == current_user.department_id) |
            (Announcement.department_id.is_(None))
        )
    elif department_id:
        query = query.filter(Announcement.department_id == department_id)

    announcements = query.order_by(Announcement.created_at.desc()).all()
    return [
        AnnouncementResponse(
            id=a.id,
            title=a.title,
            content=a.content,
            priority=a.priority,
            department_id=a.department_id,
            author_id=a.author_id,
            author_name=a.author.full_name if a.author else None,
            department_name=a.department.name if a.department else "System-wide",
            created_at=a.created_at,
        )
        for a in announcements
    ]


@router.post("/", response_model=AnnouncementResponse, status_code=201)
async def create_announcement(
    announcement_data: AnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.HOD, UserRole.CREATOR_ADMIN)),
):
    """Create a new announcement. Teachers can only post to their department."""
    if current_user.role == UserRole.TEACHER:
        if announcement_data.department_id is None:
            raise HTTPException(status_code=403, detail="Teachers cannot create system-wide announcements")
        require_same_department(current_user, announcement_data.department_id)
    elif current_user.role == UserRole.HOD:
        if announcement_data.department_id is not None:
            require_same_department(current_user, announcement_data.department_id)

    announcement = Announcement(
        title=announcement_data.title,
        content=announcement_data.content,
        priority=announcement_data.priority,
        department_id=announcement_data.department_id or (
            current_user.department_id if current_user.role == UserRole.TEACHER else announcement_data.department_id
        ),
        author_id=current_user.id,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return AnnouncementResponse(
        id=announcement.id,
        title=announcement.title,
        content=announcement.content,
        priority=announcement.priority,
        department_id=announcement.department_id,
        author_id=announcement.author_id,
        author_name=announcement.author.full_name if announcement.author else None,
        department_name=announcement.department.name if announcement.department else "System-wide",
        created_at=announcement.created_at,
    )


@router.put("/{announcement_id}", response_model=AnnouncementResponse)
async def update_announcement(
    announcement_id: int,
    announcement_data: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.HOD, UserRole.CREATOR_ADMIN)),
):
    """Update an announcement. Teachers can only edit their own."""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    if current_user.role == UserRole.TEACHER and announcement.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own announcements")
    if current_user.role == UserRole.HOD and announcement.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="You can only edit announcements in your department")

    update_data = announcement_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(announcement, key, value)

    db.commit()
    db.refresh(announcement)
    return AnnouncementResponse(
        id=announcement.id,
        title=announcement.title,
        content=announcement.content,
        priority=announcement.priority,
        department_id=announcement.department_id,
        author_id=announcement.author_id,
        author_name=announcement.author.full_name if announcement.author else None,
        department_name=announcement.department.name if announcement.department else "System-wide",
        created_at=announcement.created_at,
    )


@router.delete("/{announcement_id}", response_model=MessageResponse)
async def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.TEACHER, UserRole.HOD, UserRole.CREATOR_ADMIN)),
):
    """Delete an announcement."""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    if current_user.role == UserRole.TEACHER and announcement.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own announcements")
    if current_user.role == UserRole.HOD and announcement.department_id != current_user.department_id:
        raise HTTPException(status_code=403, detail="You can only delete announcements in your department")

    db.delete(announcement)
    db.commit()
    return MessageResponse(message="Announcement deleted successfully")
