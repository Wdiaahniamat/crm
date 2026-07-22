import os
import sys
import uuid
import bcrypt
from datetime import datetime, timezone
from sqlalchemy import create_engine
from database import Base, SQLALCHEMY_DATABASE_URL
from models import User

def main():
    # 1. Get password from command line argument
    if len(sys.argv) < 2:
        print("Error: Please provide a new admin password.")
        print("Usage: python recreate_clean_db.py <YOUR_NEW_PASSWORD>")
        sys.exit(1)
    
    new_password = sys.argv[1]
    if len(new_password) < 6:
        print("Error: Password must be at least 6 characters long.")
        sys.exit(1)

    # 2. Check if we are using SQLite locally
    db_path = os.path.join(os.path.dirname(__file__), "data", "crm.db")
    if os.path.exists(db_path):
        print(f"Removing old local database file: {db_path}")
        try:
            os.remove(db_path)
        except Exception as e:
            print(f"Error removing database file: {e}")
            sys.exit(1)

    # 3. Initialize engine and recreate all tables
    print("Re-creating clean database tables...")
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
    )
    Base.metadata.create_all(bind=engine)

    # 4. Hash the new password using bcrypt
    print("Hashing the admin password...")
    password_bytes = new_password.encode('utf-8')
    hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')

    # 5. Insert clean admin user
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        admin_user = User(
            id=str(uuid.uuid4()),
            name="Administrator",
            username="admin",
            email="admin@xebright.tech",
            passwordHash=hashed_password,
            role="admin",
            department="IT",
            phone="",
            status="active",
            createdAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            documents=[]
        )
        db.add(admin_user)
        db.commit()
        print("Successfully created a clean database with the new secure admin user!")
    except Exception as e:
        db.rollback()
        print(f"Error saving admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
