import os
import sys

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy import text

def run():
    with engine.connect() as conn:
        try:
            # Check if column exists, if not add it
            # This is specifically for postgres/sqlite interchangeably
            try:
                conn.execute(text("ALTER TABLE company_assets ADD COLUMN folder VARCHAR DEFAULT 'Company Data'"))
                conn.commit()
                print("Added 'folder' column to company_assets")
            except Exception as e:
                print("Column might already exist or error occurred:", e)
        except Exception as e:
            print("Error connecting:", e)

if __name__ == "__main__":
    run()
