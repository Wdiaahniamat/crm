from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import uuid
import datetime
from pydantic import BaseModel

from database import get_db
from models import ChatMessage, User
from middleware.auth import auth_required

class SendMessageRequest(BaseModel):
    receiverId: str
    content: Optional[str] = ""
    attachmentName: Optional[str] = None
    attachmentData: Optional[str] = None

class EditMessageRequest(BaseModel):
    id: str
    content: str

class DeleteMessageRequest(BaseModel):
    id: str

router = APIRouter()

# Store active websocket connections: user_id -> WebSocket
active_connections: Dict[str, WebSocket] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)

manager = ConnectionManager()

@router.get("/contacts")
def get_contacts(db: Session = Depends(get_db), current_user: dict = Depends(auth_required)):
    if current_user.get('role') == 'admin':
        contacts = db.query(User).filter(User.role == 'employee').all()
    else:
        contacts = db.query(User).filter(User.id != current_user.get('id')).all()
    
    return [
        {
            "id": u.id,
            "name": u.name,
            "username": u.username,
            "role": u.role
        }
        for u in contacts
    ]

@router.get("/history/{other_user_id}")
def get_chat_history(other_user_id: str, db: Session = Depends(get_db), current_user: dict = Depends(auth_required)):
    # Get all messages where current_user is sender and other_user is receiver OR vice-versa
    messages = db.query(ChatMessage).filter(
        ((ChatMessage.senderId == current_user.get('id')) & (ChatMessage.receiverId == other_user_id)) |
        ((ChatMessage.senderId == other_user_id) & (ChatMessage.receiverId == current_user.get('id')))
    ).order_by(ChatMessage.timestamp.asc()).all()
    
    return [
        {
            "id": m.id,
            "senderId": m.senderId,
            "receiverId": m.receiverId,
            "content": m.content,
            "timestamp": m.timestamp,
            "attachmentName": m.attachmentName,
            "attachmentData": m.attachmentData
        }
        for m in messages
    ]

@router.post("/send")
def send_message(req: SendMessageRequest, db: Session = Depends(get_db), current_user: dict = Depends(auth_required)):
    user_id = current_user.get('id')
    receiver_id = req.receiverId
    content = req.content or ""
    attachment_name = req.attachmentName
    attachment_data = req.attachmentData
    
    if not receiver_id or (not content and not attachment_data):
        return {"error": "Invalid message parameters"}
        
    msg_id = str(uuid.uuid4())
    timestamp = datetime.datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z')
    
    db_msg = ChatMessage(
        id=msg_id,
        senderId=user_id,
        receiverId=receiver_id,
        content=content,
        timestamp=timestamp,
        attachmentName=attachment_name,
        attachmentData=attachment_data
    )
    db.add(db_msg)
    db.commit()

    # Trigger system notification and native web push alert to receiver
    try:
        from utils.notification_helper import create_notification
        sender_name = current_user.get('name') or current_user.get('username') or "Someone"
        notif_title = f"New message from {sender_name}"
        notif_body = content if content else f"Sent an attachment: {attachment_name or 'file'}"
        create_notification(db, receiver_id, notif_title, notif_body, "mentioned_in_comment")
    except Exception as err:
        print(f"[CHAT NOTIF ERROR] Failed to send chat notification: {err}")

    return {

        "id": msg_id,
        "senderId": user_id,
        "receiverId": receiver_id,
        "content": content,
        "timestamp": timestamp,
        "attachmentName": attachment_name,
        "attachmentData": attachment_data
    }

@router.post("/edit")
def edit_message(req: EditMessageRequest, db: Session = Depends(get_db), current_user: dict = Depends(auth_required)):
    user_id = current_user.get('id')
    db_msg = db.query(ChatMessage).filter(ChatMessage.id == req.id, ChatMessage.senderId == user_id).first()
    if not db_msg:
        return {"error": "Message not found or unauthorized"}
        
    db_msg.content = req.content  # type: ignore
    db.commit()
    return {"status": "ok", "id": req.id, "content": req.content}

@router.post("/delete")
def delete_message(req: DeleteMessageRequest, db: Session = Depends(get_db), current_user: dict = Depends(auth_required)):
    user_id = current_user.get('id')
    db_msg = db.query(ChatMessage).filter(ChatMessage.id == req.id, ChatMessage.senderId == user_id).first()
    if not db_msg:
        return {"error": "Message not found or unauthorized"}
        
    db.delete(db_msg)
    db.commit()
    return {"status": "ok", "id": req.id}

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, db: Session = Depends(get_db)):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action", "send")
            
            if action == "send":
                receiver_id = data.get("receiverId")
                content = data.get("content", "")
                attachment_name = data.get("attachmentName")
                attachment_data = data.get("attachmentData")
                
                if receiver_id and (content or attachment_data):
                    msg_id = str(uuid.uuid4())
                    timestamp = datetime.datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z')
                    
                    # Save to database
                    db_msg = ChatMessage(
                        id=msg_id,
                        senderId=user_id,
                        receiverId=receiver_id,
                        content=content,
                        timestamp=timestamp,
                        attachmentName=attachment_name,
                        attachmentData=attachment_data
                    )
                    db.add(db_msg)
                    db.commit()
                    
                    # Trigger system notification & push alert
                    try:
                        from utils.notification_helper import create_notification
                        sender_user = db.query(User).filter(User.id == user_id).first()
                        sender_name = (sender_user.name if sender_user else None) or "Someone"
                        notif_title = f"New message from {sender_name}"
                        notif_body = content if content else f"Sent an attachment: {attachment_name or 'file'}"
                        create_notification(db, receiver_id, notif_title, notif_body, "mentioned_in_comment")
                    except Exception as err:
                        print(f"[CHAT WS NOTIF ERROR] {err}")
                    
                    msg_dict = {
                        "action": "send",
                        "id": msg_id,
                        "senderId": user_id,
                        "receiverId": receiver_id,
                        "content": content,
                        "timestamp": timestamp,
                        "attachmentName": attachment_name,
                        "attachmentData": attachment_data
                    }
                    
                    # Send to sender (echo)
                    await manager.send_personal_message(msg_dict, user_id)
                    # Send to receiver if online
                    await manager.send_personal_message(msg_dict, receiver_id)
            
            elif action == "edit":
                msg_id = data.get("id")
                new_content = data.get("content", "")
                if msg_id:
                    db_msg = db.query(ChatMessage).filter(ChatMessage.id == msg_id, ChatMessage.senderId == user_id).first()
                    if db_msg:
                        db_msg.content = new_content
                        db.commit()
                        
                        edit_dict = {
                            "action": "edit",
                            "id": msg_id,
                            "content": new_content
                        }
                        await manager.send_personal_message(edit_dict, user_id)
                        if db_msg.receiverId:
                            await manager.send_personal_message(edit_dict, str(db_msg.receiverId))
            
            elif action == "delete":
                msg_id = data.get("id")
                if msg_id:
                    db_msg = db.query(ChatMessage).filter(ChatMessage.id == msg_id, ChatMessage.senderId == user_id).first()
                    if db_msg:
                        receiver_id = db_msg.receiverId
                        db.delete(db_msg)
                        db.commit()
                        
                        del_dict = {
                            "action": "delete",
                            "id": msg_id
                        }
                        await manager.send_personal_message(del_dict, user_id)
                        if receiver_id:
                            await manager.send_personal_message(del_dict, str(receiver_id))
                
    except WebSocketDisconnect:
        manager.disconnect(user_id)
