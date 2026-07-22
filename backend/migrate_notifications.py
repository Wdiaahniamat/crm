import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(__file__), "data", "crm.db")
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Add notificationSettings to users table if it doesn't exist
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN notificationSettings TEXT;")
        print("Added column 'notificationSettings' to table 'users'.")
    except sqlite3.OperationalError as e:
        print("Column 'notificationSettings' in 'users' already exists or could not be added:", e)
        
    # 2. Add attachmentName to chat_messages table if it doesn't exist
    try:
        cursor.execute("ALTER TABLE chat_messages ADD COLUMN attachmentName TEXT;")
        print("Added column 'attachmentName' to table 'chat_messages'.")
    except sqlite3.OperationalError as e:
        print("Column 'attachmentName' in 'chat_messages' already exists or could not be added:", e)
        
    # 3. Add attachmentData to chat_messages table if it doesn't exist
    try:
        cursor.execute("ALTER TABLE chat_messages ADD COLUMN attachmentData TEXT;")
        print("Added column 'attachmentData' to table 'chat_messages'.")
    except sqlite3.OperationalError as e:
        print("Column 'attachmentData' in 'chat_messages' already exists or could not be added:", e)
        
    # 4. Create notifications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
    );
    """)
    print("Ensured table 'notifications' exists.")
    
    # Create indexes for notifications
    try:
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_notifications_id ON notifications (id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_notifications_userId ON notifications (userId);")
        print("Created indexes on 'notifications' table.")
    except Exception as e:
        print("Could not create indexes on 'notifications' table:", e)
        
    conn.commit()
    conn.close()
    print("Database migration successfully finished!")

if __name__ == "__main__":
    migrate()
