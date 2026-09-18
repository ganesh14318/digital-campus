"""
Deterministic seed script for demo data.
Creates departments, users (all 4 roles), courses, schedules, announcements, and FAQs.

Demo Credentials:
  - Admin:   admin / admin123
  - HOD CS:  hod_cs / hod123
  - HOD ECE: hod_ece / hod123
  - Teacher: teacher_cs1 / teacher123
  - Teacher: teacher_ece1 / teacher123
  - Student: student_cs1 / student123
  - Student: student_ece1 / student123
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.database import engine, SessionLocal, Base, init_db
from app.models import User, Department, Course, Schedule, Announcement, FAQ, UserRole
from app.auth import get_password_hash


def seed():
    # Ensure database schema exists and create all tables
    init_db()
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("⚠️  Database already has data. Skipping seed.")
            print("   To reset, drop and recreate the database or truncate tables, then re-run.")
            return

        print("🌱 Seeding database...")

        # ─── Departments ─────────────────────────────────────────
        dept_cs = Department(
            name="Computer Science",
            code="CS",
            description="Department of Computer Science and Engineering",
        )
        dept_ece = Department(
            name="Electronics & Communication",
            code="ECE",
            description="Department of Electronics and Communication Engineering",
        )
        dept_mech = Department(
            name="Mechanical Engineering",
            code="MECH",
            description="Department of Mechanical Engineering",
        )
        db.add_all([dept_cs, dept_ece, dept_mech])
        db.flush()
        print(f"  ✅ Created {3} departments")

        # ─── Users ───────────────────────────────────────────────
        admin = User(
            username="admin",
            email="admin@campus.edu",
            full_name="System Administrator",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.CREATOR_ADMIN,
            department_id=None,
        )

        hod_cs = User(
            username="hod_cs",
            email="hod.cs@campus.edu",
            full_name="Dr. Rajesh Kumar",
            hashed_password=get_password_hash("hod123"),
            role=UserRole.HOD,
            department_id=dept_cs.id,
        )

        hod_ece = User(
            username="hod_ece",
            email="hod.ece@campus.edu",
            full_name="Dr. Priya Sharma",
            hashed_password=get_password_hash("hod123"),
            role=UserRole.HOD,
            department_id=dept_ece.id,
        )

        teacher_cs1 = User(
            username="teacher_cs1",
            email="teacher.cs1@campus.edu",
            full_name="Prof. Anil Verma",
            hashed_password=get_password_hash("teacher123"),
            role=UserRole.TEACHER,
            department_id=dept_cs.id,
        )

        teacher_cs2 = User(
            username="teacher_cs2",
            email="teacher.cs2@campus.edu",
            full_name="Prof. Meena Iyer",
            hashed_password=get_password_hash("teacher123"),
            role=UserRole.TEACHER,
            department_id=dept_cs.id,
        )

        teacher_ece1 = User(
            username="teacher_ece1",
            email="teacher.ece1@campus.edu",
            full_name="Prof. Vikram Singh",
            hashed_password=get_password_hash("teacher123"),
            role=UserRole.TEACHER,
            department_id=dept_ece.id,
        )

        student_cs1 = User(
            username="student_cs1",
            email="student.cs1@campus.edu",
            full_name="Arjun Patel",
            hashed_password=get_password_hash("student123"),
            role=UserRole.STUDENT,
            department_id=dept_cs.id,
        )

        student_cs2 = User(
            username="student_cs2",
            email="student.cs2@campus.edu",
            full_name="Sneha Reddy",
            hashed_password=get_password_hash("student123"),
            role=UserRole.STUDENT,
            department_id=dept_cs.id,
        )

        student_ece1 = User(
            username="student_ece1",
            email="student.ece1@campus.edu",
            full_name="Ravi Gupta",
            hashed_password=get_password_hash("student123"),
            role=UserRole.STUDENT,
            department_id=dept_ece.id,
        )

        all_users = [admin, hod_cs, hod_ece, teacher_cs1, teacher_cs2, teacher_ece1, student_cs1, student_cs2, student_ece1]
        db.add_all(all_users)
        db.flush()

        # Set HODs
        dept_cs.hod_id = hod_cs.id
        dept_ece.hod_id = hod_ece.id
        db.flush()
        print(f"  ✅ Created {len(all_users)} users")

        # ─── Courses ─────────────────────────────────────────────
        courses = [
            Course(name="Data Structures & Algorithms", code="CS201", description="Fundamental data structures and algorithmic techniques", credits=4, semester=3, department_id=dept_cs.id, teacher_id=teacher_cs1.id),
            Course(name="Operating Systems", code="CS301", description="Process management, memory, file systems, and scheduling", credits=4, semester=5, department_id=dept_cs.id, teacher_id=teacher_cs1.id),
            Course(name="Database Management Systems", code="CS302", description="Relational databases, SQL, normalization, and transactions", credits=3, semester=5, department_id=dept_cs.id, teacher_id=teacher_cs2.id),
            Course(name="Machine Learning", code="CS401", description="Supervised and unsupervised learning, neural networks", credits=4, semester=7, department_id=dept_cs.id, teacher_id=teacher_cs2.id),
            Course(name="Web Development", code="CS303", description="Frontend and backend web technologies", credits=3, semester=5, department_id=dept_cs.id, teacher_id=teacher_cs1.id),
            Course(name="Digital Signal Processing", code="ECE301", description="Signals, systems, and DSP algorithms", credits=4, semester=5, department_id=dept_ece.id, teacher_id=teacher_ece1.id),
            Course(name="VLSI Design", code="ECE401", description="Very Large Scale Integration circuit design", credits=4, semester=7, department_id=dept_ece.id, teacher_id=teacher_ece1.id),
            Course(name="Embedded Systems", code="ECE302", description="Microcontrollers and embedded programming", credits=3, semester=5, department_id=dept_ece.id, teacher_id=teacher_ece1.id),
        ]
        db.add_all(courses)
        db.flush()
        print(f"  ✅ Created {len(courses)} courses")

        # ─── Schedules ───────────────────────────────────────────
        schedules = [
            Schedule(course_id=courses[0].id, department_id=dept_cs.id, day_of_week="Monday", start_time="09:00", end_time="10:30", room="CS-101"),
            Schedule(course_id=courses[0].id, department_id=dept_cs.id, day_of_week="Wednesday", start_time="09:00", end_time="10:30", room="CS-101"),
            Schedule(course_id=courses[1].id, department_id=dept_cs.id, day_of_week="Tuesday", start_time="11:00", end_time="12:30", room="CS-102"),
            Schedule(course_id=courses[1].id, department_id=dept_cs.id, day_of_week="Thursday", start_time="11:00", end_time="12:30", room="CS-102"),
            Schedule(course_id=courses[2].id, department_id=dept_cs.id, day_of_week="Monday", start_time="14:00", end_time="15:30", room="CS-201"),
            Schedule(course_id=courses[2].id, department_id=dept_cs.id, day_of_week="Friday", start_time="14:00", end_time="15:30", room="CS-201"),
            Schedule(course_id=courses[3].id, department_id=dept_cs.id, day_of_week="Wednesday", start_time="14:00", end_time="15:30", room="CS-Lab1"),
            Schedule(course_id=courses[4].id, department_id=dept_cs.id, day_of_week="Thursday", start_time="09:00", end_time="10:30", room="CS-Lab2"),
            Schedule(course_id=courses[5].id, department_id=dept_ece.id, day_of_week="Monday", start_time="10:00", end_time="11:30", room="ECE-101"),
            Schedule(course_id=courses[5].id, department_id=dept_ece.id, day_of_week="Wednesday", start_time="10:00", end_time="11:30", room="ECE-101"),
            Schedule(course_id=courses[6].id, department_id=dept_ece.id, day_of_week="Tuesday", start_time="14:00", end_time="15:30", room="ECE-Lab1"),
            Schedule(course_id=courses[7].id, department_id=dept_ece.id, day_of_week="Friday", start_time="09:00", end_time="10:30", room="ECE-201"),
        ]
        db.add_all(schedules)
        db.flush()
        print(f"  ✅ Created {len(schedules)} schedule entries")

        # ─── Announcements ───────────────────────────────────────
        announcements = [
            Announcement(title="Welcome to the New Semester!", content="Welcome back to campus! The new academic session begins today. Please check your schedules and report to your respective departments.", priority="high", department_id=None, author_id=admin.id),
            Announcement(title="Campus Wi-Fi Maintenance", content="The campus Wi-Fi will undergo maintenance on Saturday from 2 AM to 6 AM. Plan your work accordingly.", priority="normal", department_id=None, author_id=admin.id),
            Announcement(title="CS Department Hackathon", content="Join us for the annual CS Department Hackathon! Register by this Friday. Prizes worth ₹50,000 to be won!", priority="high", department_id=dept_cs.id, author_id=hod_cs.id),
            Announcement(title="DSA Assignment Due", content="Reminder: The Data Structures assignment on Binary Trees is due next Monday. Submit through the online portal.", priority="normal", department_id=dept_cs.id, author_id=teacher_cs1.id),
            Announcement(title="ML Project Teams", content="Machine Learning project teams have been announced. Check the notice board for your team allocation.", priority="normal", department_id=dept_cs.id, author_id=teacher_cs2.id),
            Announcement(title="ECE Lab Equipment Upgrade", content="New oscilloscopes and signal generators have been installed in ECE Lab 1. Training sessions will be held next week.", priority="normal", department_id=dept_ece.id, author_id=hod_ece.id),
            Announcement(title="Embedded Systems Workshop", content="A hands-on workshop on ARM Cortex microcontrollers will be conducted this Saturday in ECE Lab 2.", priority="high", department_id=dept_ece.id, author_id=teacher_ece1.id),
        ]
        db.add_all(announcements)
        db.flush()
        print(f"  ✅ Created {len(announcements)} announcements")

        # ─── FAQs ────────────────────────────────────────────────
        faqs = [
            FAQ(question="What are the library hours?", answer="The campus library is open Monday to Saturday, 8 AM to 9 PM. On Sundays, it operates from 10 AM to 5 PM.", category="General", department_id=None),
            FAQ(question="How do I apply for a leave of absence?", answer="Submit the leave application form to your department HOD through the online portal. For medical leaves, attach a medical certificate.", category="Administrative", department_id=None),
            FAQ(question="Where can I get my ID card renewed?", answer="Visit the Administrative Office, Room A-101, with a passport-size photo and your old ID card. Processing takes 2-3 working days.", category="Administrative", department_id=None),
            FAQ(question="What programming languages are taught in the CS department?", answer="The CS department covers C, C++, Python, Java, JavaScript, and SQL across various semesters. Advanced courses may include R, Go, and Rust.", category="Academic", department_id=dept_cs.id),
            FAQ(question="How do I access the CS lab after hours?", answer="Contact the CS Lab Coordinator (Prof. Anil Verma) for after-hours access. You'll need to fill a request form and get HOD approval.", category="Facilities", department_id=dept_cs.id),
            FAQ(question="What software is available in the CS labs?", answer="CS labs have VS Code, IntelliJ IDEA, Python 3.x, GCC, MySQL, PostgreSQL, Node.js, and Docker pre-installed. Additional software can be requested.", category="Facilities", department_id=dept_cs.id),
            FAQ(question="What equipment is available in the ECE labs?", answer="ECE labs are equipped with digital oscilloscopes, function generators, logic analyzers, ARM development boards, and FPGA kits.", category="Facilities", department_id=dept_ece.id),
            FAQ(question="How do I book ECE lab equipment for projects?", answer="Submit an equipment booking request through the department portal at least 3 days in advance. Priority is given to final-year projects.", category="Facilities", department_id=dept_ece.id),
        ]
        db.add_all(faqs)

        db.commit()
        print("\n✅ Database seeded successfully!")
        print("\n📋 Demo Credentials:")
        print("  ┌──────────────────┬──────────────┬──────────────┐")
        print("  │ Role             │ Username     │ Password     │")
        print("  ├──────────────────┼──────────────┼──────────────┤")
        print("  │ Creator Admin    │ admin        │ admin123     │")
        print("  │ HOD (CS)         │ hod_cs       │ hod123       │")
        print("  │ HOD (ECE)        │ hod_ece      │ hod123       │")
        print("  │ Teacher (CS)     │ teacher_cs1  │ teacher123   │")
        print("  │ Teacher (CS)     │ teacher_cs2  │ teacher123   │")
        print("  │ Teacher (ECE)    │ teacher_ece1 │ teacher123   │")
        print("  │ Student (CS)     │ student_cs1  │ student123   │")
        print("  │ Student (CS)     │ student_cs2  │ student123   │")
        print("  │ Student (ECE)    │ student_ece1 │ student123   │")
        print("  └──────────────────┴──────────────┴──────────────┘")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
