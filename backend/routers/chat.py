from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import uuid
import datetime
from pydantic import BaseModel

from database import get_db
from models import ChatMessage, User, ChatGroup
from middleware.auth import auth_required

class SendMessageRequest(BaseModel):
    receiverId: str
    content: Optional[str] = ""
    attachmentName: Optional[str] = None
    attachmentData: Optional[str] = None
    replyToId: Optional[str] = None

class EditMessageRequest(BaseModel):
    id: str
    content: str

class DeleteMessageRequest(BaseModel):
    id: str

class CreateGroupRequest(BaseModel):
    name: str
    employeeIds: List[str]

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
        groups = db.query(ChatGroup).all()
    else:
        contacts = db.query(User).filter(User.id != current_user.get('id')).all()
        user_id = current_user.get('id')
        all_groups = db.query(ChatGroup).all()
        groups = [g for g in all_groups if user_id in (g.employeeIds or [])]
    
    res = [
        {
            "id": u.id,
            "name": u.name,
            "username": u.username,
            "role": u.role,
            "isGroup": False
        }
        for u in contacts
    ]
    res.extend([
        {
            "id": g.id,
            "name": g.name,
            "username": "Custom Group", # type: ignore
            "role": "group", # type: ignore
            "isGroup": True
        }
        for g in groups
    ])
    return res

@router.post("/groups")
def create_group(req: CreateGroupRequest, db: Session = Depends(get_db), current_user: dict = Depends(auth_required)):
    if current_user.get('role') != 'admin':
        return {"error": "Only admins can create groups"}
    
    group_id = str(uuid.uuid4())
    new_group = ChatGroup(
        id=group_id,
        name=req.name,
        department=None,
        employeeIds=req.employeeIds,
        createdAt=datetime.datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z')
    )
    db.add(new_group)
    db.commit()
    return {"status": "ok", "id": group_id}

@router.delete("/groups/{group_id}")
def delete_group(group_id: str, db: Session = Depends(get_db), current_user: dict = Depends(auth_required)):
    if current_user.get('role') != 'admin':
        return {"error": "Only admins can delete groups"}
    
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        return {"error": "Group not found"}
        
    db.query(ChatMessage).filter(ChatMessage.channel == group_id).delete()
    db.delete(group)
    db.commit()
    return {"status": "ok"}

@router.get("/history/{other_user_id}")
def get_chat_history(other_user_id: str, db: Session = Depends(get_db), current_user: dict = Depends(auth_required)):
    # Check if other_user_id is a group
    group = db.query(ChatGroup).filter(ChatGroup.id == other_user_id).first()
    if group:
        messages = db.query(ChatMessage).filter(
            ChatMessage.channel == other_user_id
        ).order_by(ChatMessage.timestamp.asc()).all()
    else:
        messages = db.query(ChatMessage).filter(
            ((ChatMessage.senderId == current_user.get('id')) & (ChatMessage.receiverId == other_user_id) & (ChatMessage.channel == None)) |
            ((ChatMessage.senderId == other_user_id) & (ChatMessage.receiverId == current_user.get('id')) & (ChatMessage.channel == None))
        ).order_by(ChatMessage.timestamp.asc()).all()
    
    return [
        {
            "id": m.id,
            "senderId": m.senderId,
            "receiverId": m.receiverId,
            "channel": m.channel,
            "content": m.content,
            "timestamp": m.timestamp,
            "attachmentName": m.attachmentName,
            "attachmentData": m.attachmentData,
            "replyToId": m.replyToId
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
    reply_to_id = req.replyToId
    
    if not receiver_id or (not content and not attachment_data):
        return {"error": "Invalid message parameters"}
        
    msg_id = str(uuid.uuid4())
    timestamp = datetime.datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z')
    
    group = db.query(ChatGroup).filter(ChatGroup.id == receiver_id).first()
    if group:
        channel = receiver_id
        receiver_id = None
    else:
        channel = None

    db_msg = ChatMessage(
        id=msg_id,
        senderId=user_id,
        receiverId=receiver_id,
        channel=channel,
        content=content,
        timestamp=timestamp,
        attachmentName=attachment_name,
        attachmentData=attachment_data,
        replyToId=reply_to_id
    )
    db.add(db_msg)
    db.commit()

    # We do native notifications only for direct messages to avoid spam
    if not channel:
        try:
            from utils.notification_helper import create_notification
            sender_name = current_user.get('name') or current_user.get('username') or "Someone"
            notif_title = f"New message from {sender_name}"
            notif_body = content if content else f"Sent an attachment: {attachment_name or 'file'}"
            create_notification(db, str(receiver_id), notif_title, notif_body, "mentioned_in_comment")
        except Exception as err:
            print(f"[CHAT NOTIF ERROR] Failed to send chat notification: {err}")

    return {
        "id": msg_id,
        "senderId": user_id,
        "receiverId": receiver_id,
        "channel": channel,
        "content": content,
        "timestamp": timestamp,
        "attachmentName": attachment_name,
        "attachmentData": attachment_data,
        "replyToId": reply_to_id
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

@router.delete("/clear/{target_id}")
def clear_chat(target_id: str, db: Session = Depends(get_db), current_user: dict = Depends(auth_required)):
    user_id = current_user.get('id')
    
    group = db.query(ChatGroup).filter(ChatGroup.id == target_id).first()
    if group:
        db.query(ChatMessage).filter(ChatMessage.channel == target_id).delete()
    else:
        db.query(ChatMessage).filter(
            ((ChatMessage.senderId == user_id) & (ChatMessage.receiverId == target_id) & (ChatMessage.channel == None)) |
            ((ChatMessage.senderId == target_id) & (ChatMessage.receiverId == user_id) & (ChatMessage.channel == None))
        ).delete()
    
    db.commit()
    return {"status": "ok"}


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
                reply_to_id = data.get("replyToId")
                
                if receiver_id and (content or attachment_data):
                    msg_id = str(uuid.uuid4())
                    timestamp = datetime.datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z')
                    
                    group = db.query(ChatGroup).filter(ChatGroup.id == receiver_id).first()
                    if group:
                        channel = receiver_id
                        receiver_id = None
                    else:
                        channel = None

                    # Save to database
                    db_msg = ChatMessage(
                        id=msg_id,
                        senderId=user_id,
                        receiverId=receiver_id,
                        channel=channel,
                        content=content,
                        timestamp=timestamp,
                        attachmentName=attachment_name,
                        attachmentData=attachment_data,
                        replyToId=reply_to_id
                    )
                    db.add(db_msg)
                    db.commit()
                    
                    msg_dict = {
                        "action": "send",
                        "id": msg_id,
                        "senderId": user_id,
                        "receiverId": receiver_id,
                        "channel": channel,
                        "content": content,
                        "timestamp": timestamp,
                        "attachmentName": attachment_name,
                        "attachmentData": attachment_data,
                        "replyToId": reply_to_id
                    }
                    
                    if channel:
                        emp_ids = group.employeeIds or []
                        users_in_group = db.query(User).filter(
                            (User.role == 'admin') | (User.id.in_(emp_ids)) # type: ignore
                        ).all()
                        for u in users_in_group:
                            await manager.send_personal_message(msg_dict, u.id) # type: ignore
                    else:
                        # Direct Message
                        await manager.send_personal_message(msg_dict, user_id)
                        if receiver_id and receiver_id != user_id:
                            await manager.send_personal_message(msg_dict, str(receiver_id))
                            
                            try:
                                from utils.notification_helper import create_notification
                                user_record = db.query(User).filter(User.id == user_id).first()
                                sender_name = user_record.name if user_record and user_record.name else "Someone"
                                notif_title = f"New message from {sender_name}"
                                notif_body = content if content else f"Sent an attachment: {attachment_name or 'file'}"
                                create_notification(db, str(receiver_id), notif_title, notif_body, "chat_message")
                            except Exception as err:
                                print(f"[CHAT NOTIF ERROR] Failed to send chat notification in ws: {err}")

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
                        
                        if db_msg.channel:
                            group = db.query(ChatGroup).filter(ChatGroup.id == db_msg.channel).first()
                            if group:
                                emp_ids = group.employeeIds or []
                                users_in_group = db.query(User).filter(
                                    (User.role == 'admin') | (User.id.in_(emp_ids)) # type: ignore
                                ).all()
                                for u in users_in_group:
                                    await manager.send_personal_message(edit_dict, u.id) # type: ignore
                        else:
                            await manager.send_personal_message(edit_dict, user_id)
                            if db_msg.receiverId and db_msg.receiverId != user_id:
                                await manager.send_personal_message(edit_dict, str(db_msg.receiverId))
            
            elif action == "delete":
                msg_id = data.get("id")
                if msg_id:
                    db_msg = db.query(ChatMessage).filter(ChatMessage.id == msg_id, ChatMessage.senderId == user_id).first()
                    if db_msg:
                        channel = db_msg.channel
                        receiver_id = db_msg.receiverId
                        db.delete(db_msg)
                        db.commit()
                        
                        del_dict = {
                            "action": "delete",
                            "id": msg_id
                        }
                        
                        if channel:
                            group = db.query(ChatGroup).filter(ChatGroup.id == channel).first()
                            if group:
                                emp_ids = group.employeeIds or []
                                users_in_group = db.query(User).filter(
                                    (User.role == 'admin') | (User.id.in_(emp_ids)) # type: ignore
                                ).all()
                                for u in users_in_group:
                                    await manager.send_personal_message(del_dict, u.id) # type: ignore
                        else:
                            await manager.send_personal_message(del_dict, user_id)
                            if receiver_id and receiver_id != user_id:
                                await manager.send_personal_message(del_dict, str(receiver_id))
                
    except WebSocketDisconnect:
        manager.disconnect(user_id)
