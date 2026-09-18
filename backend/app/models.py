from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Boolean
)
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    HOD = "hod"
    CREATOR_ADMIN = "creator_admin"


class UserRoleType(TypeDecorator):
    """Custom SQLAlchemy type that gracefully handles both uppercase names and lowercase values."""
    impl = String(50)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, UserRole):
            return value.value
        return str(value).lower()

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, UserRole):
            return value
        val_str = str(value).strip()
        # Direct lookup by lowercase value ('creator_admin')
        try:
            return UserRole(val_str.lower())
        except ValueError:
            pass
        # Lookup by uppercase member name ('CREATOR_ADMIN')
        try:
            return UserRole[val_str.upper()]
        except KeyError:
            pass
        # Case-insensitive fallback
        for r in UserRole:
            if r.value == val_str.lower() or r.name.lower() == val_str.lower():
                return r
        return UserRole.STUDENT


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(UserRoleType, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    department = relationship("Department", back_populates="users", foreign_keys=[department_id])
    courses_taught = relationship("Course", back_populates="teacher", foreign_keys="Course.teacher_id")
    announcements = relationship("Announcement", back_populates="author")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(10), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    hod_id = Column(
        Integer,
        ForeignKey("users.id", use_alter=True, name="fk_departments_hod_id"),
        nullable=True,
    )
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    users = relationship("User", back_populates="department", foreign_keys=[User.department_id])
    hod = relationship("User", foreign_keys=[hod_id])
    courses = relationship("Course", back_populates="department")
    schedules = relationship("Schedule", back_populates="department")
    announcements = relationship("Announcement", back_populates="department")
    faqs = relationship("FAQ", back_populates="department")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    credits = Column(Integer, default=3)
    semester = Column(Integer, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    department = relationship("Department", back_populates="courses")
    teacher = relationship("User", back_populates="courses_taught", foreign_keys=[teacher_id])
    schedules = relationship("Schedule", back_populates="course")


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    day_of_week = Column(String(10), nullable=False)  # Monday, Tuesday, etc.
    start_time = Column(String(5), nullable=False)     # HH:MM format
    end_time = Column(String(5), nullable=False)       # HH:MM format
    room = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    course = relationship("Course", back_populates="schedules")
    department = relationship("Department", back_populates="schedules")


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(String(10), default="normal")  # low, normal, high, urgent
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)  # NULL = system-wide
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    department = relationship("Department", back_populates="announcements")
    author = relationship("User", back_populates="announcements")


class FAQ(Base):
    __tablename__ = "faqs"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    category = Column(String(50), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)  # NULL = general
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    department = relationship("Department", back_populates="faqs")
