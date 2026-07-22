from sqlalchemy import Column, String, JSON, Boolean
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    username = Column(String, unique=True, index=True)
    email = Column(String)
    passwordHash = Column(String)
    role = Column(String)
    department = Column(String)
    phone = Column(String)
    status = Column(String)
    createdAt = Column(String)
    documents = Column(JSON, default=list)
    employeeRole = Column(String, nullable=True)
    team = Column(String, nullable=True)
    joiningDate = Column(String, nullable=True)
    onboardingDate = Column(String, nullable=True)
    contractType = Column(String, nullable=True)
    notificationSettings = Column(JSON, nullable=True)

class Request(Base):
    __tablename__ = "requests"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    email = Column(String)
    username = Column(String)
    passwordHash = Column(String)
    department = Column(String)
    phone = Column(String)
    status = Column(String)
    createdAt = Column(String)

class Task(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    assignedTo = Column(String)
    assignedBy = Column(String)
    priority = Column(String)
    status = Column(String)
    projectId = Column(String, nullable=True)
    dueDate = Column(String, nullable=True)
    createdAt = Column(String)
    updatedAt = Column(String)
    completedAt = Column(String, nullable=True)
    pmedName = Column(String, nullable=True)
    pmedData = Column(String, nullable=True)
    pmedStatus = Column(String, default="Pending Verification")
    comments = Column(JSON, default=list)

class Leave(Base):
    __tablename__ = "leaves"
    id = Column(String, primary_key=True, index=True)
    employeeId = Column(String)
    employeeName = Column(String)
    startDate = Column(String)
    endDate = Column(String)
    reason = Column(String)
    type = Column(String)
    status = Column(String)
    createdAt = Column(String)
    decidedAt = Column(String, nullable=True)

class Attendance(Base):
    __tablename__ = "attendance"
    id = Column(String, primary_key=True, index=True)
    employeeId = Column(String)
    employeeName = Column(String)
    date = Column(String)
    checkInTime = Column(String)
    status = Column(String)

class Client(Base):
    __tablename__ = "clients"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    company = Column(String)
    email = Column(String)
    phone = Column(String)
    notes = Column(String)
    contractValuation = Column(String)
    renewalDate = Column(String)
    satisfaction = Column(String)
    status = Column(String)
    logs = Column(JSON, default=list)
    vaultFiles = Column(JSON, default=list)
    reportFiles = Column(JSON, default=list)
    createdAt = Column(String)

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    clientId = Column(String, nullable=True)
    description = Column(String)
    status = Column(String)
    employeeIds = Column(JSON, default=list)
    createdAt = Column(String)

class Department(Base):
    __tablename__ = "departments"
    name = Column(String, primary_key=True, index=True)

class Event(Base):
    __tablename__ = "events"
    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    date = Column(String)
    description = Column(String)
    type = Column(String)
    createdAt = Column(String)

class Meeting(Base):
    __tablename__ = "meetings"
    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    date = Column(String)
    time = Column(String)
    type = Column(String)
    department = Column(String)
    scope = Column(String)
    client = Column(String)
    description = Column(String)
    agenda = Column(String)
    createdAt = Column(String)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String, primary_key=True, index=True)
    senderId = Column(String, index=True)
    receiverId = Column(String, nullable=True, index=True)
    channel = Column(String, nullable=True, index=True)
    content = Column(String)
    timestamp = Column(String)
    attachmentName = Column(String, nullable=True)
    attachmentData = Column(String, nullable=True)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, index=True)
    userId = Column(String, index=True)
    title = Column(String)
    content = Column(String)
    type = Column(String)
    read = Column(Boolean, default=False)
    createdAt = Column(String)

class CompanyAsset(Base):
    __tablename__ = "company_assets"
    id = Column(String, primary_key=True, index=True)
    companyName = Column(String)
    assetType = Column(String)
    name = Column(String)
    value = Column(String)
    notes = Column(String, nullable=True)
    status = Column(String)
    updatedAt = Column(String)

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(String, primary_key=True, index=True)
    userId = Column(String, index=True)
    endpoint = Column(String, unique=True, index=True)
    p256dh = Column(String)
    auth = Column(String)
    userAgent = Column(String, nullable=True)
    createdAt = Column(String)




