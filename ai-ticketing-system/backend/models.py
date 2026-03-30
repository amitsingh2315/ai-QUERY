"""
SQLAlchemy ORM models for the AI Ticketing System.
Defines: Ticket, Employee, Feedback, TicketNote, TicketTimeline, TicketReply, Notification
"""

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Float, Boolean,
    Enum as SQLEnum, ForeignKey
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from database import Base


# ─── Enums ────────────────────────────────────────────────────────────

class TicketCategory(str, enum.Enum):
    BILLING = "Billing"
    BUG = "Bug"
    ACCESS = "Access"
    HR = "HR"
    SERVER = "Server"
    DB = "DB"
    FEATURE = "Feature"
    OTHER = "Other"


class TicketSeverity(str, enum.Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class TicketStatus(str, enum.Enum):
    NEW = "New"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    PENDING_INFO = "Pending Info"
    RESOLVED = "Resolved"
    CLOSED = "Closed"


class ResolutionPath(str, enum.Enum):
    AUTO_RESOLVE = "Auto-resolve"
    ASSIGN_TO_DEPARTMENT = "Assign to department"


class Sentiment(str, enum.Enum):
    FRUSTRATED = "Frustrated"
    NEUTRAL = "Neutral"
    POLITE = "Polite"


class AvailabilityStatus(str, enum.Enum):
    AVAILABLE = "Available"
    BUSY = "Busy"
    ON_LEAVE = "On Leave"


# ─── Models ───────────────────────────────────────────────────────────

class Employee(Base):
    """Employee directory model with workload and skills tracking."""
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    department = Column(String(50), nullable=False)
    role = Column(String(100), nullable=False)
    skill_tags = Column(Text, default="")  # Comma-separated tags
    avg_resolution_time = Column(Float, default=0.0)  # In hours
    current_ticket_load = Column(Integer, default=0)
    availability = Column(String(20), default=AvailabilityStatus.AVAILABLE.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    assigned_tickets = relationship("Ticket", back_populates="assignee")


class Ticket(Base):
    """Core ticket model with AI analysis results."""
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    user_email = Column(String(150), nullable=False)
    attachment_url = Column(String(500), nullable=True)

    # AI Analysis Results
    category = Column(String(20), nullable=True)
    ai_summary = Column(Text, nullable=True)
    severity = Column(String(20), default=TicketSeverity.MEDIUM.value)
    recommended_resolution_path = Column(String(30), nullable=True)
    sentiment = Column(String(20), nullable=True)
    suggested_department = Column(String(50), nullable=True)
    suggested_employee = Column(String(100), nullable=True)
    confidence_score = Column(Float, nullable=True)
    estimated_resolution_time = Column(String(50), nullable=True)

    # Ticket State
    status = Column(String(20), default=TicketStatus.NEW.value)
    department = Column(String(50), nullable=True)
    assignee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    auto_resolved = Column(Boolean, default=False)
    auto_response = Column(Text, nullable=True)
    escalated = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    assigned_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    assignee = relationship("Employee", back_populates="assigned_tickets")
    feedback = relationship("Feedback", back_populates="ticket", uselist=False)
    notes = relationship("TicketNote", back_populates="ticket", order_by="TicketNote.created_at")
    timeline = relationship("TicketTimeline", back_populates="ticket", order_by="TicketTimeline.created_at")
    replies = relationship("TicketReply", back_populates="ticket", order_by="TicketReply.created_at")


class TicketReply(Base):
    """Replies on tickets — from employees to users and vice versa."""
    __tablename__ = "ticket_replies"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    author_email = Column(String(150), nullable=False)
    author_name = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    is_employee_reply = Column(Boolean, default=True)
    feedback_helpful = Column(Boolean, nullable=True)  # User feedback: True=helpful, False=not, None=pending
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    ticket = relationship("Ticket", back_populates="replies")


class Feedback(Base):
    """User feedback on auto-resolved tickets."""
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    is_helpful = Column(Boolean, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    ticket = relationship("Ticket", back_populates="feedback")


class TicketNote(Base):
    """Internal notes added by assignees."""
    __tablename__ = "ticket_notes"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    author = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    ticket = relationship("Ticket", back_populates="notes")


class TicketTimeline(Base):
    """Tracks all events in a ticket's lifecycle."""
    __tablename__ = "ticket_timeline"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    old_value = Column(String(100), nullable=True)
    new_value = Column(String(100), nullable=True)
    actor = Column(String(100), default="System")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    ticket = relationship("Ticket", back_populates="timeline")


class Notification(Base):
    """Simulated email notifications."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False)
    recipient_email = Column(String(150), nullable=False)
    subject = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
