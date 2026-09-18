import httpx
from sqlalchemy.orm import Session

from app.models import User, UserRole, Course, Schedule, Announcement, FAQ
from app.schemas import ChatResponse
from app.config import get_settings

settings = get_settings()


def _get_department_context(db: Session, department_id: int) -> dict:
    """Retrieve campus data relevant to the user's department from the database."""
    context = {"courses": [], "schedules": [], "announcements": [], "faqs": []}

    # Courses
    courses = db.query(Course).filter(Course.department_id == department_id).all()
    context["courses"] = [
        {
            "name": c.name,
            "code": c.code,
            "description": c.description or "",
            "credits": c.credits,
            "semester": c.semester,
            "teacher": c.teacher.full_name if c.teacher else "Not assigned",
        }
        for c in courses
    ]

    # Schedules
    schedules = db.query(Schedule).filter(Schedule.department_id == department_id).all()
    context["schedules"] = [
        {
            "course": s.course.name if s.course else "Unknown",
            "day": s.day_of_week,
            "time": f"{s.start_time} - {s.end_time}",
            "room": s.room or "TBD",
        }
        for s in schedules
    ]

    # Announcements (department + system-wide)
    announcements = db.query(Announcement).filter(
        (Announcement.department_id == department_id) |
        (Announcement.department_id.is_(None))
    ).order_by(Announcement.created_at.desc()).limit(10).all()
    context["announcements"] = [
        {
            "title": a.title,
            "content": a.content,
            "priority": a.priority,
            "date": a.created_at.strftime("%Y-%m-%d") if a.created_at else "",
        }
        for a in announcements
    ]

    # FAQs (department + general)
    faqs = db.query(FAQ).filter(
        (FAQ.department_id == department_id) |
        (FAQ.department_id.is_(None))
    ).all()
    context["faqs"] = [
        {"question": f.question, "answer": f.answer, "category": f.category or "General"}
        for f in faqs
    ]

    return context


def _build_system_prompt(context: dict, department_name: str) -> str:
    """Build a constrained system prompt with campus data context."""
    courses_text = "\n".join(
        f"  - {c['code']}: {c['name']} ({c['credits']} credits, Semester {c['semester']}, Teacher: {c['teacher']})"
        for c in context["courses"]
    ) or "  No courses found."

    schedules_text = "\n".join(
        f"  - {s['course']}: {s['day']} {s['time']} in {s['room']}"
        for s in context["schedules"]
    ) or "  No schedules found."

    announcements_text = "\n".join(
        f"  - [{a['priority'].upper()}] {a['title']} ({a['date']}): {a['content'][:200]}"
        for a in context["announcements"]
    ) or "  No recent announcements."

    faqs_text = "\n".join(
        f"  - Q: {f['question']}\n    A: {f['answer']}"
        for f in context["faqs"]
    ) or "  No FAQs available."

    return f"""You are GIST Assistant, the official AI academic advisor for Geethanjali Institute of Science and Technology ({department_name.upper()} Department).

ROLE & INSTRUCTIONS:
- Answer student inquiries clearly, concisely, and professionally based strictly on the GIST Campus Data below.
- Use clean Markdown formatting:
  • Use **bold** for course codes, teacher names, room numbers, and dates.
  • Use bullet points for lists and tables where appropriate.
  • Keep responses well-spaced, direct, and easy to read.
- If specific data is not listed in the campus data below, politely state: "I don't have that specific record in my database. Please check with the GIST {department_name} Department Office."
- Never hallucinate or invent course names, faculty members, timings, or policies.

GIST CAMPUS DATA FOR {department_name.upper()} DEPARTMENT:

COURSES:
{courses_text}

SCHEDULES & TIMETABLE:
{schedules_text}

RECENT ANNOUNCEMENTS:
{announcements_text}

FREQUENTLY ASKED QUESTIONS:
{faqs_text}
"""


async def get_ai_response(message: str, user: User, db: Session) -> ChatResponse:
    """Get AI response using campus context and Ollama."""
    department_name = user.department.name if user.department else "General"
    department_id = user.department_id

    # Get department context from database
    if department_id:
        context = _get_department_context(db, department_id)
    else:
        context = {"courses": [], "schedules": [], "announcements": [], "faqs": []}

    system_prompt = _build_system_prompt(context, department_name)

    # Build sources list
    sources = []
    if context["courses"]:
        sources.append("Courses database")
    if context["schedules"]:
        sources.append("Schedule database")
    if context["announcements"]:
        sources.append("Announcements")
    if context["faqs"]:
        sources.append("FAQ database")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message},
                    ],
                    "stream": False,
                },
            )

            if response.status_code != 200:
                return ChatResponse(
                    reply="I'm sorry, the AI model is currently unavailable. Please try again later or contact your department office.",
                    sources=sources,
                )

            data = response.json()
            reply = data.get("message", {}).get("content", "I couldn't generate a response. Please try again.")

            return ChatResponse(reply=reply, sources=sources)

    except httpx.ConnectError:
        return ChatResponse(
            reply="The AI assistant is currently offline. Please ensure Ollama is running locally (run `ollama serve` in your terminal). In the meantime, you can browse courses, schedules, and announcements directly through the dashboard.",
            sources=[],
        )
    except Exception as e:
        return ChatResponse(
            reply=f"An error occurred while processing your request. Please try again later.",
            sources=[],
        )
