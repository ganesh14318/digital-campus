"""
Data migration script: SQLite (campus.db) -> MySQL.

Transfers all records (Departments, Users, Courses, Schedules, Announcements, FAQs)
from an existing SQLite database file into the MySQL database configured in .env.

Usage:
    python -m app.db.migrate_sqlite_to_mysql [optional_path_to_sqlite_db]
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.database import init_db, SessionLocal
from app.models import Department, User, Course, Schedule, Announcement, FAQ


def migrate(sqlite_path: str = "campus.db"):
    if not os.path.exists(sqlite_path):
        print(f"❌ SQLite database file not found at: {sqlite_path}")
        print("   Nothing to migrate.")
        return

    settings = get_settings()
    print(f"📦 Source SQLite DB: {sqlite_path}")
    print(f"🎯 Target Database URL: {settings.DATABASE_URL}")

    # Connect to SQLite source
    sqlite_engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})
    SqliteSession = sessionmaker(bind=sqlite_engine)
    src_db = SqliteSession()

    # Ensure MySQL tables are initialized
    print("🚀 Initializing target MySQL tables...")
    init_db()
    dest_db = SessionLocal()

    try:
        # Check target database count
        target_user_count = dest_db.query(User).count()
        if target_user_count > 0:
            print(f"⚠️  Target MySQL database already contains {target_user_count} users.")
            choice = input("Do you want to proceed and overwrite/merge? (y/N): ").strip().lower()
            if choice != "y":
                print("Migration aborted.")
                return

        print("🔄 Reading records from SQLite...")

        # 1. Departments
        src_depts = src_db.query(Department).all()
        dept_hod_map = {}
        for d in src_depts:
            dept_hod_map[d.id] = d.hod_id
            new_dept = Department(
                id=d.id,
                name=d.name,
                code=d.code,
                description=d.description,
                hod_id=None,  # Set to None first to avoid circular FK constraint
                created_at=d.created_at,
                updated_at=d.updated_at,
            )
            dest_db.merge(new_dept)
        dest_db.flush()
        print(f"  ✅ Migrated {len(src_depts)} departments")

        # 2. Users
        src_users = src_db.query(User).all()
        for u in src_users:
            new_user = User(
                id=u.id,
                username=u.username,
                email=u.email,
                full_name=u.full_name,
                hashed_password=u.hashed_password,
                role=u.role,
                department_id=u.department_id,
                is_active=u.is_active,
                created_at=u.created_at,
                updated_at=u.updated_at,
            )
            dest_db.merge(new_user)
        dest_db.flush()
        print(f"  ✅ Migrated {len(src_users)} users")

        # Restore Department HOD relations
        for dept_id, hod_id in dept_hod_map.items():
            if hod_id:
                dest_d = dest_db.query(Department).filter(Department.id == dept_id).first()
                if dest_d:
                    dest_d.hod_id = hod_id
        dest_db.flush()

        # 3. Courses
        src_courses = src_db.query(Course).all()
        for c in src_courses:
            new_c = Course(
                id=c.id,
                name=c.name,
                code=c.code,
                description=c.description,
                credits=c.credits,
                semester=c.semester,
                department_id=c.department_id,
                teacher_id=c.teacher_id,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            dest_db.merge(new_c)
        dest_db.flush()
        print(f"  ✅ Migrated {len(src_courses)} courses")

        # 4. Schedules
        src_schedules = src_db.query(Schedule).all()
        for s in src_schedules:
            new_s = Schedule(
                id=s.id,
                course_id=s.course_id,
                department_id=s.department_id,
                day_of_week=s.day_of_week,
                start_time=s.start_time,
                end_time=s.end_time,
                room=s.room,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
            dest_db.merge(new_s)
        dest_db.flush()
        print(f"  ✅ Migrated {len(src_schedules)} schedules")

        # 5. Announcements
        src_announcements = src_db.query(Announcement).all()
        for a in src_announcements:
            new_a = Announcement(
                id=a.id,
                title=a.title,
                content=a.content,
                priority=a.priority,
                department_id=a.department_id,
                author_id=a.author_id,
                created_at=a.created_at,
                updated_at=a.updated_at,
            )
            dest_db.merge(new_a)
        dest_db.flush()
        print(f"  ✅ Migrated {len(src_announcements)} announcements")

        # 6. FAQs
        src_faqs = src_db.query(FAQ).all()
        for f in src_faqs:
            new_f = FAQ(
                id=f.id,
                question=f.question,
                answer=f.answer,
                category=f.category,
                department_id=f.department_id,
                created_at=f.created_at,
                updated_at=f.updated_at,
            )
            dest_db.merge(new_f)
        dest_db.flush()
        print(f"  ✅ Migrated {len(src_faqs)} FAQs")

        dest_db.commit()
        print("\n🎉 All records migrated successfully to MySQL!")

    except Exception as e:
        dest_db.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        src_db.close()
        dest_db.close()


if __name__ == "__main__":
    db_file = sys.argv[1] if len(sys.argv) > 1 else "campus.db"
    migrate(db_file)
