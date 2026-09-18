from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models import UserRole


# ─── Auth Schemas ────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


# ─── User Schemas ────────────────────────────────────────────────

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=100)
    full_name: str = Field(..., min_length=1, max_length=100)
    role: UserRole
    department_id: Optional[int] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=4, max_length=100)


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    department_name: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Department Schemas ──────────────────────────────────────────

class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=10)
    description: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    hod_id: Optional[int] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    hod_id: Optional[int] = None


class DepartmentResponse(DepartmentBase):
    id: int
    hod_id: Optional[int] = None
    hod_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Course Schemas ──────────────────────────────────────────────

class CourseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=20)
    description: Optional[str] = None
    credits: int = 3
    semester: Optional[int] = None


class CourseCreate(CourseBase):
    department_id: int
    teacher_id: Optional[int] = None


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    credits: Optional[int] = None
    semester: Optional[int] = None
    teacher_id: Optional[int] = None


class CourseResponse(CourseBase):
    id: int
    department_id: int
    teacher_id: Optional[int] = None
    department_name: Optional[str] = None
    teacher_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Schedule Schemas ────────────────────────────────────────────

class ScheduleBase(BaseModel):
    day_of_week: str = Field(..., pattern="^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$")
    start_time: str = Field(..., pattern="^\\d{2}:\\d{2}$")
    end_time: str = Field(..., pattern="^\\d{2}:\\d{2}$")
    room: Optional[str] = None


class ScheduleCreate(ScheduleBase):
    course_id: int
    department_id: int


class ScheduleUpdate(BaseModel):
    day_of_week: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    room: Optional[str] = None


class ScheduleResponse(ScheduleBase):
    id: int
    course_id: int
    department_id: int
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    teacher_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Announcement Schemas ────────────────────────────────────────

class AnnouncementBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")


class AnnouncementCreate(AnnouncementBase):
    department_id: Optional[int] = None


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    priority: Optional[str] = None


class AnnouncementResponse(AnnouncementBase):
    id: int
    department_id: Optional[int] = None
    author_id: int
    author_name: Optional[str] = None
    department_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── FAQ Schemas ─────────────────────────────────────────────────

class FAQBase(BaseModel):
    question: str
    answer: str
    category: Optional[str] = None


class FAQCreate(FAQBase):
    department_id: Optional[int] = None


class FAQResponse(FAQBase):
    id: int
    department_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── AI Chat Schemas ─────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    reply: str
    sources: list[str] = []


# ─── Analytics Schemas ───────────────────────────────────────────

class DepartmentAnalytics(BaseModel):
    department_id: int
    department_name: str
    student_count: int
    teacher_count: int
    course_count: int
    announcement_count: int


class SystemAnalytics(BaseModel):
    total_users: int
    total_departments: int
    total_courses: int
    total_announcements: int
    departments: list[DepartmentAnalytics]


# ─── Generic Response ────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None
