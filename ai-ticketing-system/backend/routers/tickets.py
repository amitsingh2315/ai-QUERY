"""
Ticket API Router — Modules 1, 2, 5
Handles ticket CRUD, AI analysis, auto-resolution, lifecycle management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from database import get_db
from models import Ticket, Employee, Feedback, TicketNote, TicketTimeline, Notification, TicketReply
from schemas import (
    TicketCreate, TicketResponse, TicketStatusUpdate,
    FeedbackCreate, FeedbackResponse,
    NoteCreate, NoteResponse,
    TimelineResponse, NotificationResponse,
    ReplyCreate, ReplyResponse, ReplyFeedback,
)
from ai_service import analyze_ticket
from routing_engine import route_ticket
from assignee_engine import suggest_assignee, find_alternative_assignee

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])


# ─── Auto-Resolution Templates ───────────────────────────────────────

AUTO_RESOLVE_TEMPLATES = {
    "password": (
        "Hello,\n\n"
        "We've received your request regarding password assistance. "
        "You can reset your password by visiting: https://portal.company.com/reset-password\n\n"
        "Steps:\n"
        "1. Click the link above\n"
        "2. Enter your registered email address\n"
        "3. Check your inbox for a reset link (also check spam folder)\n"
        "4. Create a new strong password\n\n"
        "If you continue to experience issues, please reply to this ticket.\n\n"
        "Best regards,\nAI Support Assistant"
    ),
    "leave": (
        "Hello,\n\n"
        "Thank you for your inquiry about leave policy.\n\n"
        "Our leave policy details are available at: https://hr.company.com/leave-policy\n\n"
        "Key highlights:\n"
        "• Annual leave: 24 days per year\n"
        "• Sick leave: 12 days per year\n"
        "• Apply via the HR portal at least 3 days in advance\n"
        "• Emergency leave can be applied retroactively within 48 hours\n\n"
        "For specific questions, please contact hr@company.com.\n\n"
        "Best regards,\nAI Support Assistant"
    ),
    "billing": (
        "Hello,\n\n"
        "We've received your billing inquiry. Here's what we can help with:\n\n"
        "• View your invoices: https://billing.company.com/invoices\n"
        "• Payment methods: https://billing.company.com/payment\n"
        "• Billing cycle: Monthly, processed on the 1st\n\n"
        "If you need a specific invoice adjustment or have a disputed charge, "
        "please provide the invoice number and we'll escalate to our finance team.\n\n"
        "Best regards,\nAI Support Assistant"
    ),
    "hr": (
        "Hello,\n\n"
        "Thank you for reaching out to HR Support.\n\n"
        "Here are some useful resources:\n"
        "• Employee handbook: https://hr.company.com/handbook\n"
        "• Benefits portal: https://hr.company.com/benefits\n"
        "• HR policies: https://hr.company.com/policies\n\n"
        "If your query requires personal attention, an HR representative "
        "will follow up within 24 hours.\n\n"
        "Best regards,\nAI Support Assistant"
    ),
    "status": (
        "Hello,\n\n"
        "Thank you for checking in on your request.\n\n"
        "You can track the status of all your tickets at: https://portal.company.com/my-tickets\n\n"
        "Current processing times:\n"
        "• Standard requests: 1-2 business days\n"
        "• Urgent requests: 4-8 hours\n"
        "• Critical issues: 1-2 hours\n\n"
        "If your issue is urgent, please update the ticket priority.\n\n"
        "Best regards,\nAI Support Assistant"
    ),
    "default": (
        "Hello,\n\n"
        "Thank you for contacting support. We've analyzed your request "
        "and believe we can help resolve it quickly.\n\n"
        "Based on our analysis, here's what we recommend:\n"
        "• Check our knowledge base: https://help.company.com\n"
        "• FAQ section: https://help.company.com/faq\n\n"
        "If this doesn't resolve your issue, please let us know and "
        "we'll connect you with a specialist.\n\n"
        "Best regards,\nAI Support Assistant"
    ),
}


def _get_auto_response(category: str, description: str) -> str:
    """Generate an auto-resolution response based on ticket category and content."""
    desc_lower = description.lower()

    for keyword, template in AUTO_RESOLVE_TEMPLATES.items():
        if keyword != "default" and keyword in desc_lower:
            return template

    # Use category-based fallback
    category_map = {
        "Access": AUTO_RESOLVE_TEMPLATES["password"],
        "HR": AUTO_RESOLVE_TEMPLATES["hr"],
        "Billing": AUTO_RESOLVE_TEMPLATES["billing"],
    }

    return category_map.get(category, AUTO_RESOLVE_TEMPLATES["default"])


def _add_timeline(db: Session, ticket_id: int, event_type: str, description: str,
                  old_value: str = None, new_value: str = None, actor: str = "System"):
    """Add a timeline event to a ticket."""
    event = TicketTimeline(
        ticket_id=ticket_id,
        event_type=event_type,
        description=description,
        old_value=old_value,
        new_value=new_value,
        actor=actor,
    )
    db.add(event)


def _send_notification(db: Session, ticket_id: int, email: str, subject: str,
                       body: str, notif_type: str):
    """Create a simulated email notification."""
    notif = Notification(
        ticket_id=ticket_id,
        recipient_email=email,
        subject=subject,
        body=body,
        notification_type=notif_type,
    )
    db.add(notif)


# ─── Endpoints ────────────────────────────────────────────────────────

@router.post("/", response_model=TicketResponse)
async def create_ticket(ticket_data: TicketCreate, db: Session = Depends(get_db)):
    """
    Submit a new ticket. Flow:
    1. Create ticket record (auto-generate title if not provided)
    2. Run AI analysis
    3. Either auto-resolve or route to department + assign employee
    """
    # Auto-generate title from description if not provided
    title = ticket_data.title
    if not title or not title.strip():
        stop_words = {"i", "my", "me", "the", "a", "an", "is", "am", "are", "was", "were",
                       "to", "and", "but", "or", "in", "on", "at", "for", "of", "with",
                       "it", "this", "that", "do", "did", "not", "can", "cannot", "have",
                       "has", "had"}
        words = ticket_data.description.split()
        meaningful = [w for w in words if w.lower().strip(".,!?;:") not in stop_words]
        title_words = meaningful[:8] if len(meaningful) >= 6 else words[:8]
        title = " ".join(title_words).strip(".,!?;:")
        title = title[:200].title() if title else "Support Request"

    # Step 1: Create the ticket
    ticket = Ticket(
        title=title,
        description=ticket_data.description,
        user_email=ticket_data.user_email,
        attachment_url=ticket_data.attachment_url,
        status="New",
    )
    db.add(ticket)
    db.flush()  # Get the ticket ID

    _add_timeline(db, ticket.id, "created", "Ticket created by user", actor=ticket_data.user_email)

    # Step 2: AI Analysis
    ai_result = await analyze_ticket(
        title, ticket_data.description, ticket_data.user_email
    )

    # Store AI analysis on the ticket
    ticket.category = ai_result.category
    ticket.ai_summary = ai_result.ai_summary
    ticket.severity = ai_result.severity
    ticket.recommended_resolution_path = ai_result.recommended_resolution_path
    ticket.sentiment = ai_result.sentiment
    ticket.suggested_department = ai_result.suggested_department
    ticket.suggested_employee = ai_result.suggested_employee
    ticket.confidence_score = ai_result.confidence_score
    ticket.estimated_resolution_time = ai_result.estimated_resolution_time

    _add_timeline(
        db, ticket.id, "ai_analysis",
        f"AI Analysis: {ai_result.category} | {ai_result.severity} | {ai_result.recommended_resolution_path}",
        actor="AI Engine"
    )

    # Step 3: Route based on AI decision
    if ai_result.recommended_resolution_path == "Auto-resolve":
        # Module 2: Auto-Resolution
        auto_response = _get_auto_response(ai_result.category, ticket_data.description)
        ticket.auto_resolved = True
        ticket.auto_response = auto_response
        ticket.status = "Resolved"
        ticket.department = ai_result.suggested_department
        ticket.resolved_at = datetime.now(timezone.utc)

        _add_timeline(db, ticket.id, "auto_resolved", "Ticket auto-resolved by AI", actor="AI Engine")
        _send_notification(
            db, ticket.id, ticket_data.user_email,
            f"[Resolved] {ticket_data.title}",
            auto_response, "resolved"
        )
    else:
        # Module 3: Department Routing
        routing = route_ticket(
            ai_result.category, ai_result.severity,
            ai_result.ai_summary, ticket_data.description
        )
        ticket.department = routing["department"]
        ticket.severity = routing["severity"]

        _add_timeline(
            db, ticket.id, "routed",
            f"Routed to {routing['department']}: {routing['routing_reason']}",
            actor="Routing Engine"
        )

        # Module 4: Assignee Suggestion
        assignment = suggest_assignee(db, routing["department"], ai_result.category, routing["severity"])

        if assignment["employee_id"]:
            ticket.assignee_id = assignment["employee_id"]
            ticket.status = "Assigned"
            ticket.assigned_at = datetime.now(timezone.utc)

            # Increment employee load
            employee = db.query(Employee).get(assignment["employee_id"])
            if employee:
                employee.current_ticket_load += 1

            _add_timeline(
                db, ticket.id, "assigned",
                f"Assigned to {assignment['employee_name']}: {assignment['reason']}",
                actor="Assignment Engine"
            )

            _send_notification(
                db, ticket.id, ticket_data.user_email,
                f"[Assigned] {ticket_data.title}",
                f"Your ticket has been assigned to {assignment['employee_name']} in the {routing['department']} department.",
                "status_change"
            )

    db.commit()
    db.refresh(ticket)

    # Add assignee name and replies for response
    resp = TicketResponse.model_validate(ticket)
    if ticket.assignee:
        resp.assignee_name = ticket.assignee.name
        resp.assignee_availability = ticket.assignee.availability
    resp.replies = [ReplyResponse.model_validate(r) for r in (ticket.replies or [])]
    return resp


@router.get("/", response_model=List[TicketResponse])
def list_tickets(
    status: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List tickets with filtering and search."""
    query = db.query(Ticket)

    if status:
        query = query.filter(Ticket.status == status)
    if department:
        query = query.filter(Ticket.department == department)
    if severity:
        query = query.filter(Ticket.severity == severity)
    if category:
        query = query.filter(Ticket.category == category)
    if user_email:
        query = query.filter(Ticket.user_email == user_email)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Ticket.title.ilike(search_term)) | (Ticket.description.ilike(search_term))
        )

    tickets = query.order_by(desc(Ticket.created_at)).offset(skip).limit(limit).all()

    results = []
    for t in tickets:
        resp = TicketResponse.model_validate(t)
        if t.assignee:
            resp.assignee_name = t.assignee.name
            resp.assignee_availability = t.assignee.availability
        resp.replies = [ReplyResponse.model_validate(r) for r in (t.replies or [])]
        results.append(resp)

    return results


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """Get a single ticket by ID."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    resp = TicketResponse.model_validate(ticket)
    if ticket.assignee:
        resp.assignee_name = ticket.assignee.name
        resp.assignee_availability = ticket.assignee.availability
    resp.replies = [ReplyResponse.model_validate(r) for r in (ticket.replies or [])]
    return resp


@router.patch("/{ticket_id}/status")
def update_ticket_status(ticket_id: int, update: TicketStatusUpdate, db: Session = Depends(get_db)):
    """Update ticket status (lifecycle management)."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_status = ticket.status
    ticket.status = update.status

    if update.status == "Resolved":
        ticket.resolved_at = datetime.now(timezone.utc)
        # Decrement assignee load
        if ticket.assignee_id:
            emp = db.query(Employee).get(ticket.assignee_id)
            if emp and emp.current_ticket_load > 0:
                emp.current_ticket_load -= 1

    _add_timeline(
        db, ticket_id, "status_change",
        f"Status changed from {old_status} to {update.status}",
        old_value=old_status, new_value=update.status, actor=update.actor
    )

    _send_notification(
        db, ticket_id, ticket.user_email,
        f"[Status Update] {ticket.title}",
        f"Your ticket status has been updated from {old_status} to {update.status}.",
        "status_change"
    )

    db.commit()
    return {"message": "Status updated", "old_status": old_status, "new_status": update.status}


@router.post("/{ticket_id}/notes", response_model=NoteResponse)
def add_note(ticket_id: int, note_data: NoteCreate, db: Session = Depends(get_db)):
    """Add an internal note to a ticket."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    note = TicketNote(
        ticket_id=ticket_id,
        author=note_data.author,
        content=note_data.content,
        is_internal=note_data.is_internal,
    )
    db.add(note)

    _add_timeline(db, ticket_id, "note", f"Note added by {note_data.author}", actor=note_data.author)

    # If requesting info from user
    if not note_data.is_internal:
        ticket.status = "Pending Info"
        _send_notification(
            db, ticket_id, ticket.user_email,
            f"[Info Requested] {ticket.title}",
            note_data.content,
            "info_request"
        )

    db.commit()
    db.refresh(note)
    return note


@router.get("/{ticket_id}/notes", response_model=List[NoteResponse])
def get_notes(ticket_id: int, db: Session = Depends(get_db)):
    """Get all notes for a ticket."""
    return db.query(TicketNote).filter(TicketNote.ticket_id == ticket_id).order_by(TicketNote.created_at).all()


@router.get("/{ticket_id}/timeline", response_model=List[TimelineResponse])
def get_timeline(ticket_id: int, db: Session = Depends(get_db)):
    """Get the full timeline of a ticket."""
    return (
        db.query(TicketTimeline)
        .filter(TicketTimeline.ticket_id == ticket_id)
        .order_by(TicketTimeline.created_at)
        .all()
    )


@router.post("/{ticket_id}/feedback", response_model=FeedbackResponse)
def submit_feedback(ticket_id: int, feedback_data: FeedbackCreate, db: Session = Depends(get_db)):
    """Submit feedback on an auto-resolved ticket."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    existing = db.query(Feedback).filter(Feedback.ticket_id == ticket_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Feedback already submitted for this ticket")

    feedback = Feedback(
        ticket_id=ticket_id,
        is_helpful=feedback_data.is_helpful,
        comment=feedback_data.comment,
    )
    db.add(feedback)

    _add_timeline(
        db, ticket_id, "feedback",
        f"Feedback: {'Helpful' if feedback_data.is_helpful else 'Not helpful'}",
        actor=ticket.user_email
    )

    # If not helpful, reopen and assign
    if not feedback_data.is_helpful:
        ticket.auto_resolved = False
        ticket.status = "New"
        ticket.resolved_at = None

        # Route and assign
        routing = route_ticket(
            ticket.category, ticket.severity, ticket.ai_summary or "", ticket.description
        )
        ticket.department = routing["department"]
        assignment = suggest_assignee(db, routing["department"], ticket.category, routing["severity"])

        if assignment["employee_id"]:
            ticket.assignee_id = assignment["employee_id"]
            ticket.status = "Assigned"
            ticket.assigned_at = datetime.now(timezone.utc)

            emp = db.query(Employee).get(assignment["employee_id"])
            if emp:
                emp.current_ticket_load += 1

        _add_timeline(db, ticket_id, "reopened", "Ticket reopened due to unhelpful auto-resolution", actor="System")

    db.commit()
    db.refresh(feedback)
    return feedback


@router.post("/{ticket_id}/escalate")
def escalate_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """Manually escalate a ticket — reassign to another employee."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    old_assignee_id = ticket.assignee_id
    department = ticket.department or "IT"

    # Find alternative
    alt = find_alternative_assignee(db, department, old_assignee_id or 0)

    if alt["employee_id"]:
        # Decrement old assignee load
        if old_assignee_id:
            old_emp = db.query(Employee).get(old_assignee_id)
            if old_emp and old_emp.current_ticket_load > 0:
                old_emp.current_ticket_load -= 1

        # Assign new
        ticket.assignee_id = alt["employee_id"]
        ticket.escalated = True
        ticket.assigned_at = datetime.now(timezone.utc)

        new_emp = db.query(Employee).get(alt["employee_id"])
        if new_emp:
            new_emp.current_ticket_load += 1

        _add_timeline(
            db, ticket_id, "escalation",
            f"Escalated: {alt['reason']}",
            actor="Escalation Engine"
        )

        db.commit()
        return {"message": "Ticket escalated", "new_assignee": alt["employee_name"]}

    raise HTTPException(status_code=400, detail=alt["reason"])


@router.get("/{ticket_id}/notifications", response_model=List[NotificationResponse])
def get_notifications(ticket_id: int, db: Session = Depends(get_db)):
    """Get all notifications for a ticket."""
    return (
        db.query(Notification)
        .filter(Notification.ticket_id == ticket_id)
        .order_by(desc(Notification.created_at))
        .all()
    )


@router.post("/check-escalations")
def check_escalations(db: Session = Depends(get_db)):
    """
    Check for tickets needing escalation.
    High/Critical tickets not picked up within 2 hours get auto-reassigned.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=2)

    stale_tickets = (
        db.query(Ticket)
        .filter(
            Ticket.status.in_(["Assigned"]),
            Ticket.severity.in_(["High", "Critical"]),
            Ticket.assigned_at < cutoff,
            Ticket.escalated == False,
        )
        .all()
    )

    escalated_count = 0
    for ticket in stale_tickets:
        alt = find_alternative_assignee(db, ticket.department or "IT", ticket.assignee_id or 0)
        if alt["employee_id"]:
            if ticket.assignee_id:
                old_emp = db.query(Employee).get(ticket.assignee_id)
                if old_emp and old_emp.current_ticket_load > 0:
                    old_emp.current_ticket_load -= 1

            ticket.assignee_id = alt["employee_id"]
            ticket.escalated = True
            ticket.assigned_at = datetime.now(timezone.utc)

            new_emp = db.query(Employee).get(alt["employee_id"])
            if new_emp:
                new_emp.current_ticket_load += 1

            _add_timeline(
                db, ticket.id, "escalation",
                f"Auto-escalated (2h timeout): {alt['reason']}",
                actor="Escalation Engine"
            )
            escalated_count += 1

    db.commit()
    return {"message": f"Checked escalations, {escalated_count} tickets escalated"}


# ─── Reply Endpoints ─────────────────────────────────────────────────

@router.post("/{ticket_id}/replies", response_model=ReplyResponse)
def create_reply(ticket_id: int, reply_data: ReplyCreate, db: Session = Depends(get_db)):
    """Add a reply to a ticket (employee or user)."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    reply = TicketReply(
        ticket_id=ticket_id,
        author_email=reply_data.author_email,
        author_name=reply_data.author_name,
        content=reply_data.content,
        is_employee_reply=reply_data.is_employee_reply,
    )
    db.add(reply)

    # Update ticket status
    if reply_data.is_employee_reply:
        if ticket.status in ["Assigned", "New"]:
            ticket.status = "In Progress"
        _add_timeline(db, ticket_id, "reply", f"Employee reply from {reply_data.author_name}", actor=reply_data.author_name)
        _send_notification(
            db, ticket_id, ticket.user_email,
            f"[Reply] {ticket.title}",
            f"You have a new reply from {reply_data.author_name}:\n\n{reply_data.content}",
            "reply"
        )
    else:
        _add_timeline(db, ticket_id, "reply", f"User reply from {reply_data.author_name}", actor=reply_data.author_email)

    db.commit()
    db.refresh(reply)
    return reply


@router.get("/{ticket_id}/replies", response_model=List[ReplyResponse])
def get_replies(ticket_id: int, db: Session = Depends(get_db)):
    """Get all replies for a ticket."""
    return (
        db.query(TicketReply)
        .filter(TicketReply.ticket_id == ticket_id)
        .order_by(TicketReply.created_at)
        .all()
    )


@router.patch("/{ticket_id}/replies/{reply_id}/feedback")
def reply_feedback(ticket_id: int, reply_id: int, feedback: ReplyFeedback, db: Session = Depends(get_db)):
    """User provides feedback on an employee reply."""
    reply = db.query(TicketReply).filter(
        TicketReply.id == reply_id,
        TicketReply.ticket_id == ticket_id
    ).first()
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")

    reply.feedback_helpful = feedback.is_helpful
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    _add_timeline(
        db, ticket_id, "reply_feedback",
        f"User feedback on reply: {'Satisfied ✓' if feedback.is_helpful else 'Not satisfied ✗'}",
        actor=ticket.user_email if ticket else "User"
    )

    if feedback.is_helpful:
        # Mark ticket as resolved
        if ticket and ticket.status not in ["Resolved", "Closed"]:
            ticket.status = "Resolved"
            ticket.resolved_at = datetime.now(timezone.utc)
            if ticket.assignee_id:
                emp = db.query(Employee).get(ticket.assignee_id)
                if emp and emp.current_ticket_load > 0:
                    emp.current_ticket_load -= 1
            _add_timeline(db, ticket_id, "resolved", "Ticket resolved — user satisfied with reply", actor="System")
    else:
        # Reassign to different employee
        if ticket:
            old_assignee_id = ticket.assignee_id
            department = ticket.department or "IT"
            alt = find_alternative_assignee(db, department, old_assignee_id or 0)
            if alt["employee_id"]:
                if old_assignee_id:
                    old_emp = db.query(Employee).get(old_assignee_id)
                    if old_emp and old_emp.current_ticket_load > 0:
                        old_emp.current_ticket_load -= 1
                ticket.assignee_id = alt["employee_id"]
                ticket.status = "Assigned"
                ticket.assigned_at = datetime.now(timezone.utc)
                new_emp = db.query(Employee).get(alt["employee_id"])
                if new_emp:
                    new_emp.current_ticket_load += 1
                _add_timeline(
                    db, ticket_id, "reassigned",
                    f"Reassigned to {alt['employee_name']} — user not satisfied with previous reply",
                    actor="System"
                )

    db.commit()
    return {"message": "Feedback recorded", "is_helpful": feedback.is_helpful}

