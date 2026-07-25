import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models import Notification, User, PushSubscription
from utils.vapid import get_or_create_vapid_keys
try:
    from pywebpush import webpush, WebPushException  # type: ignore
except ImportError:
    webpush = None
    WebPushException = Exception


def send_web_push_to_user(db: Session, user_id: str, title: str, content: str, notif_type: str = "general"):
    """
    Sends native web push notifications to all active browser subscriptions for user_id.
    """
    if webpush is None:
        print("[PUSH WARNING] pywebpush module is not installed or available")
        return 0

    vapid_data = get_or_create_vapid_keys()
    subscriptions = db.query(PushSubscription).filter(PushSubscription.userId == user_id).all()

    
    if not subscriptions:
        print(f"[PUSH] No active push subscriptions for user {user_id}")
        return 0
        
    payload = json.dumps({
        "title": title,
        "body": content,
        "type": notif_type,
        "icon": "/icon-192.png",
        "badge": "/favicon.png",
        "url": "/",
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
    })
    
    sent_count = 0
    expired_endpoints = []
    
    for sub in subscriptions:
        try:
            subscription_info = {
                "endpoint": str(sub.endpoint),
                "keys": {
                    "p256dh": str(sub.p256dh),
                    "auth": str(sub.auth)
                }
            }
            webpush(
                subscription_info=subscription_info,  # type: ignore
                data=payload,
                vapid_private_key=vapid_data["private_key"],
                vapid_claims={"sub": vapid_data["subscriber"]}
            )
            sent_count += 1
            print(f"[PUSH SUCCESS] Sent to {sub.endpoint[:40]}...")
        except WebPushException as ex:
            print(f"[PUSH ERROR] Failed to send to endpoint {sub.endpoint[:40]}: {ex}")
            # If endpoint expired (410 Gone / 404 Not Found), remove subscription
            if ex.response and ex.response.status_code in [404, 410]:
                expired_endpoints.append(sub.endpoint)
        except Exception as ex:
            print(f"[PUSH ERROR] Unexpected error for endpoint {sub.endpoint[:40]}: {ex}")
            
    if expired_endpoints:
        db.query(PushSubscription).filter(PushSubscription.endpoint.in_(expired_endpoints)).delete(synchronize_session=False)
        db.commit()
        
    return sent_count

def create_notification(db: Session, user_id: str, title: str, content: str, event_type: str):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
        
    settings = user.notificationSettings
    if settings:
        if isinstance(settings, str):
            try:
                settings_dict = json.loads(settings)
            except Exception:
                settings_dict = {}
        else:
            settings_dict = settings
    else:
        settings_dict = {}
        
    # Get settings for this event type, default to True (enabled) if not specified
    pref = settings_dict.get(event_type, {"in_app": True, "email": True, "push": True})
    
    in_app_enabled = pref.get("in_app", True)
    email_enabled = pref.get("email", True)
    push_enabled = pref.get("push", True)
    
    if in_app_enabled:
        notif_id = str(uuid.uuid4())
        n = Notification(
            id=notif_id,
            userId=user_id,
            title=title,
            content=content,
            type=event_type,
            read=False,
            createdAt=datetime.now(timezone.utc).isoformat()
        )
        db.add(n)
        db.flush()
        db.commit()
        
    if email_enabled:
        # Mock Email delivery
        print(f"[MOCK EMAIL] To: {user.email} | Title: {title} | Content: {content}")
        
    if push_enabled:
        # Deliver real OS native web push notification to user's registered devices!
        import threading
        def push_thread(uid, t, c, et):
            from database import SessionLocal
            db_session = SessionLocal()
            try:
                send_web_push_to_user(db_session, uid, t, c, notif_type=et)
            finally:
                db_session.close()
                
        t = threading.Thread(target=push_thread, args=(user_id, title, content, event_type))
        t.start()
