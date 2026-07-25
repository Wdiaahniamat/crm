from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import SessionLocal
from models import Task, Meeting, Event, User
from utils.notification_helper import create_notification
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def parse_meeting_datetime(date_str, time_str):
    """Parses date like '2026-07-25' and time like '10:00 AM' into datetime"""
    if not date_str:
        return None
    time_str = time_str or '17:00'
    
    # Simple parse for 12-hour AM/PM or 24-hour
    dt_str = f"{date_str} {time_str}"
    try:
        # Try 12-hour
        dt = datetime.strptime(dt_str, "%Y-%m-%d %I:%M %p")
    except ValueError:
        try:
            # Try 24-hour
            dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
        except ValueError:
            # Fallback to 17:00
            dt = datetime.strptime(f"{date_str} 17:00", "%Y-%m-%d %H:%M")
            
    # Assume local time, convert to naive for simplicity or just compare as is
    return dt

def parse_date_only(date_str):
    """Parses date and defaults to 17:00"""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(f"{date_str} 17:00", "%Y-%m-%d %H:%M")
        return dt
    except ValueError:
        return None

def check_upcoming_deadlines():
    """Scheduled job to check deadlines and send 3-hour and 10-minute reminders."""
    logger.info("Checking upcoming deadlines for reminders...")
    
    db: Session = SessionLocal()
    try:
        now = datetime.now()
        
        # 1. Check Tasks
        # We only remind if task is NOT completed
        pending_tasks = db.query(Task).filter(
            or_(Task.reminderSent == False, Task.reminder10mSent == False),
            Task.status.notin_(['completed', 'Done']),
            Task.dueDate != None
        ).all()
        
        for task in pending_tasks:
            dt = parse_date_only(task.dueDate)
            if not dt: continue
            
            if not task.reminderSent and now <= dt <= now + timedelta(hours=3):
                create_notification(
                    db, task.assignedTo, # type: ignore
                    "Task Deadline Approaching",
                    f"Reminder: Your task '{task.title}' is due in less than 3 hours.",
                    "task_reminder"
                )
                task.reminderSent = True # type: ignore
                
            if not task.reminder10mSent and now <= dt <= now + timedelta(minutes=10):
                create_notification(
                    db, task.assignedTo, # type: ignore
                    "Task Deadline Imminent",
                    f"URGENT: Your task '{task.title}' is due in 10 minutes!",
                    "task_reminder"
                )
                task.reminder10mSent = True # type: ignore
                
        # 2. Check Meetings
        upcoming_meetings = db.query(Meeting).filter(
            or_(Meeting.reminderSent == False, Meeting.reminder10mSent == False),
            Meeting.date != None
        ).all()
        
        for meeting in upcoming_meetings:
            dt = parse_meeting_datetime(meeting.date, meeting.time)
            if not dt: continue
            
            users_to_notify = []
            if meeting.scope == 'Company-Wide' or meeting.scope == 'All':
                users_to_notify = db.query(User).filter(User.role == 'employee').all()
            else:
                users_to_notify = db.query(User).filter(User.department == meeting.department).all()
                
            if not meeting.reminderSent and now <= dt <= now + timedelta(hours=3):
                for u in users_to_notify:
                    create_notification(
                        db, u.id, # type: ignore
                        "Meeting Reminder",
                        f"Reminder: '{meeting.title}' is scheduled for {meeting.time} today.",
                        "meeting_reminder"
                    )
                meeting.reminderSent = True # type: ignore
                
            if not meeting.reminder10mSent and now <= dt <= now + timedelta(minutes=10):
                for u in users_to_notify:
                    create_notification(
                        db, u.id, # type: ignore
                        "Meeting Starting Soon",
                        f"URGENT: '{meeting.title}' is starting in 10 minutes!",
                        "meeting_reminder"
                    )
                meeting.reminder10mSent = True # type: ignore
                
        # 3. Check Events
        upcoming_events = db.query(Event).filter(
            or_(Event.reminderSent == False, Event.reminder10mSent == False),
            Event.date != None
        ).all()
        
        for event in upcoming_events:
            dt = parse_date_only(event.date)
            if not dt: continue
            
            users_to_notify = db.query(User).filter(User.role == 'employee').all()
            
            if not event.reminderSent and now <= dt <= now + timedelta(hours=3):
                for u in users_to_notify:
                    create_notification(
                        db, u.id, # type: ignore
                        "Event Reminder",
                        f"Reminder: The event '{event.title}' is happening today.",
                        "event_reminder"
                    )
                event.reminderSent = True # type: ignore
                
            if not event.reminder10mSent and now <= dt <= now + timedelta(minutes=10):
                for u in users_to_notify:
                    create_notification(
                        db, u.id, # type: ignore
                        "Event Starting Soon",
                        f"URGENT: '{event.title}' is starting in 10 minutes!",
                        "event_reminder"
                    )
                event.reminder10mSent = True # type: ignore
                
        db.commit()
    except Exception as e:
        logger.error(f"Error in check_upcoming_deadlines: {e}")
        db.rollback()
    finally:
        db.close()

# Initialize scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(check_upcoming_deadlines, 'interval', minutes=5)
