"""
Pydantic schemas for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── AI Analysis Schema ──────────────────────────────────────────────

class AIAnalysisResult(BaseModel):
    """Structured output from AI ticket analysis."""
    category: str = Field(..., description="Ticket category")
    ai_summary: str = Field(..., description="AI-generated summary")
    severity: str = Field(..., description="Ticket severity level")
    recommended_resolution_path: str = Field(..., description="Auto-resolve or Assign to department")
    sentiment: str = Field(..., description="User sentiment")
    suggested_department: str = Field(..., description="Target department")
    suggested_employee: Optional[str] = Field(None, description="Suggested employee name")
    confidence_score: float = Field(..., ge=0, le=1, description="AI confidence 0-1")
    estimated_resolution_time: str = Field(..., description="Estimated time to resolve")


# ─── Ticket Schemas ──────────────────────────────────────────────────

class TicketCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    user_email: str = Field(..., max_length=150)
    attachment_url: Optional[str] = None


class TicketStatusUpdate(BaseModel):
    status: str
    actor: str = "System"


class ReplyResponse(BaseModel):
    id: int
    ticket_id: int
    author_email: str
    author_name: str
    content: str
    is_employee_reply: bool
    feedback_helpful: Optional[bool]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class TicketResponse(BaseModel):
    id: int
    title: str
    description: str
    user_email: str
    attachment_url: Optional[str]
    category: Optional[str]
    ai_summary: Optional[str]
    severity: Optional[str]
    recommended_resolution_path: Optional[str]
    sentiment: Optional[str]
    suggested_department: Optional[str]
    suggested_employee: Optional[str]
    confidence_score: Optional[float]
    estimated_resolution_time: Optional[str]
    status: str
    department: Optional[str]
    assignee_id: Optional[int]
    auto_resolved: bool
    auto_response: Optional[str]
    escalated: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    assigned_at: Optional[datetime]
    resolved_at: Optional[datetime]
    assignee_name: Optional[str] = None
    assignee_availability: Optional[str] = None
    replies: List[ReplyResponse] = []

    class Config:
        from_attributes = True


# ─── Employee Schemas ─────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., max_length=150)
    department: str
    role: str
    skill_tags: str = ""
    avg_resolution_time: float = 0.0
    current_ticket_load: int = 0
    availability: str = "Available"


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    skill_tags: Optional[str] = None
    avg_resolution_time: Optional[float] = None
    current_ticket_load: Optional[int] = None
    availability: Optional[str] = None
    is_active: Optional[bool] = None


class EmployeeResponse(BaseModel):
    id: int
    name: str
    email: str
    department: str
    role: str
    skill_tags: str
    avg_resolution_time: float
    current_ticket_load: int
    availability: str
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Reply Schema ────────────────────────────────────────────────────

class ReplyCreate(BaseModel):
    content: str = Field(..., min_length=1)
    author_email: str
    author_name: str
    is_employee_reply: bool = True


class ReplyFeedback(BaseModel):
    is_helpful: bool


# ─── Feedback Schema ─────────────────────────────────────────────────

class FeedbackCreate(BaseModel):
    ticket_id: int
    is_helpful: bool
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    id: int
    ticket_id: int
    is_helpful: bool
    comment: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Note Schema ─────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    content: str
    author: str
    is_internal: bool = True


class NoteResponse(BaseModel):
    id: int
    ticket_id: int
    author: str
    content: str
    is_internal: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Timeline Schema ─────────────────────────────────────────────────

class TimelineResponse(BaseModel):
    id: int
    ticket_id: int
    event_type: str
    description: str
    old_value: Optional[str]
    new_value: Optional[str]
    actor: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Notification Schema ─────────────────────────────────────────────

class NotificationResponse(BaseModel):
    id: int
    ticket_id: int
    recipient_email: str
    subject: str
    body: str
    notification_type: str
    is_read: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Analytics Schema ────────────────────────────────────────────────

class AnalyticsOverview(BaseModel):
    total_tickets: int
    open_tickets: int
    resolved_tickets: int
    auto_resolved_tickets: int
    escalated_tickets: int
    auto_resolution_success_rate: float
    avg_resolution_time_hours: float


class DepartmentLoad(BaseModel):
    department: str
    ticket_count: int
    avg_resolution_time: float


class CategoryCount(BaseModel):
    category: str
    count: int
