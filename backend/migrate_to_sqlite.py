import json
import os
import glob
from database import engine, SessionLocal, Base
from models import User, Request, Task, Leave, Attendance, Client, Project, Department, Event, Meeting

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def load_json(name):
    path = os.path.join(DATA_DIR, f"{name}.json")
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        content = f.read().strip()
        if not content:
            return []
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return []

def migrate():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Users
    for u in load_json("users"):
        db.add(User(**u))
    
    # Requests
    for r in load_json("requests"):
        db.add(Request(**r))
        
    # Tasks
    for t in load_json("tasks"):
        db.add(Task(**t))
        
    # Leaves
    for l in load_json("leaves"):
        db.add(Leave(**l))
        
    # Attendance
    for a in load_json("attendance"):
        db.add(Attendance(**a))
        
    # Clients
    for c in load_json("clients"):
        db.add(Client(**c))
        
    # Projects
    for p in load_json("projects"):
        db.add(Project(**p))
        
    # Departments (list of strings)
    for d in load_json("departments"):
        db.add(Department(name=d))
        
    # Events
    for e in load_json("events"):
        db.add(Event(**e))
        
    # Meetings
    for m in load_json("meetings"):
        db.add(Meeting(**m))

    print("Committing to database...")
    db.commit()
    db.close()
    
    print("Deleting JSON files...")
    json_files = glob.glob(os.path.join(DATA_DIR, "*.json"))
    for file in json_files:
        os.remove(file)
        
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
