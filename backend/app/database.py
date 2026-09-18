import logging
from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def get_engine_args(db_url: str):
    url_obj = make_url(db_url)
    is_sqlite = url_obj.drivername.startswith("sqlite")
    connect_args = {}
    engine_kwargs = {"echo": False}
    if is_sqlite:
        connect_args["check_same_thread"] = False
    else:
        engine_kwargs.update({
            "pool_pre_ping": True,
            "pool_recycle": 3600,
            "pool_size": 10,
            "max_overflow": 20,
        })
    return connect_args, engine_kwargs

active_url = settings.DATABASE_URL
connect_args, engine_kwargs = get_engine_args(active_url)

try:
    engine = create_engine(active_url, connect_args=connect_args, **engine_kwargs)
except Exception as e:
    logger.warning("Failed to create engine for %s: %s. Falling back to SQLite campus.db", active_url, e)
    active_url = "sqlite:///./campus.db"
    connect_args, engine_kwargs = get_engine_args(active_url)
    engine = create_engine(active_url, connect_args=connect_args, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_database_exists(db_url: str):
    """
    If using MySQL, ensure the target database schema exists before creating tables.
    Connects to the server root and runs CREATE DATABASE IF NOT EXISTS.
    """
    url = make_url(db_url)
    if url.drivername.startswith("mysql"):
        try:
            import pymysql

            connection = pymysql.connect(
                host=url.host or "localhost",
                user=url.username or "root",
                password=url.password or "",
                port=url.port or 3306,
                charset="utf8mb4",
            )
            try:
                db_name = url.database
                if db_name:
                    with connection.cursor() as cursor:
                        cursor.execute(
                            f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
                        )
                    connection.commit()
            finally:
                connection.close()
        except ImportError:
            logger.warning("pymysql is not installed. Skipping automatic MySQL database creation.")
        except Exception as e:
            logger.warning(
                "Could not automatically create MySQL database '%s': %s. "
                "Ensure MySQL is running and credentials in .env are correct.",
                url.database,
                e,
            )


def init_db():
    """Create all tables. Called on application startup."""
    global engine, SessionLocal
    url = make_url(settings.DATABASE_URL)
    if url.drivername.startswith("mysql"):
        ensure_database_exists(settings.DATABASE_URL)
        try:
            from app import models  # noqa: F401
            Base.metadata.create_all(bind=engine)
            return
        except Exception as e:
            logger.warning(
                "Failed to connect to MySQL database (%s): %s. Falling back to SQLite campus.db",
                settings.DATABASE_URL,
                e,
            )
            fallback_url = "sqlite:///./campus.db"
            c_args, e_kwargs = get_engine_args(fallback_url)
            engine = create_engine(fallback_url, connect_args=c_args, **e_kwargs)
            SessionLocal.configure(bind=engine)

    from app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    normalize_user_roles()


def normalize_user_roles():
    """Ensure existing rows in users table have valid lowercase enum values."""
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("UPDATE users SET role = 'creator_admin' WHERE UPPER(role) = 'CREATOR_ADMIN' OR role = 'admin'"))
            conn.execute(text("UPDATE users SET role = 'hod' WHERE UPPER(role) = 'HOD'"))
            conn.execute(text("UPDATE users SET role = 'teacher' WHERE UPPER(role) = 'TEACHER'"))
            conn.execute(text("UPDATE users SET role = 'student' WHERE UPPER(role) = 'STUDENT'"))
            conn.execute(text("UPDATE users SET is_active = 1 WHERE username = 'admin' OR role = 'creator_admin'"))
    except Exception as e:
        logger.debug("Role normalization notice: %s", e)


