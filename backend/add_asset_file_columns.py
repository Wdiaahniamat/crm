import os
import sys

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine
from sqlalchemy import text

def run():
    with engine.connect() as conn:
        try:
            try:
                conn.execute(text("ALTER TABLE company_assets ADD COLUMN fileName VARCHAR"))
                conn.commit()
                print("Added 'fileName' column")
            except Exception as e:
                print("fileName:", e)
            try:
                conn.execute(text("ALTER TABLE company_assets ADD COLUMN fileData VARCHAR"))
                conn.commit()
                print("Added 'fileData' column")
            except Exception as e:
                print("fileData:", e)
        except Exception as e:
            print("Error connecting:", e)

if __name__ == "__main__":
    run()
