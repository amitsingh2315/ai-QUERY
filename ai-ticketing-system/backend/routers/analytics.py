"""
Analytics API Router — Module 6
Provides dashboard analytics data.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timezone, timedelta

from database import get_db
from models import Ticket, Feedback, Employee
from schemas import AnalyticsOverview, DepartmentLoad, CategoryCount

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
def get_overview(db: Session = Depends(get_db)):
    """Get overall ticket statistics."""
    total = db.query(func.count(Ticket.id)).scalar() or 0
    open_tickets = db.query(func.count(Ticket.id)).filter(
        Ticket.status.in_(["New", "Assigned", "In Progress", "Pending Info"])
    ).scalar() or 0
    resolved = db.query(func.count(Ticket.id)).filter(
        Ticket.status.in_(["Resolved", "Closed"])
    ).scalar() or 0
    auto_resolved = db.query(func.count(Ticket.id)).filter(Ticket.auto_resolved == True).scalar() or 0
    escalated = db.query(func.count(Ticket.id)).filter(Ticket.escalated == True).scalar() or 0

    # Auto resolution success rate
    total_feedback = db.query(func.count(Feedback.id)).scalar() or 0
    helpful_feedback = db.query(func.count(Feedback.id)).filter(Feedback.is_helpful == True).scalar() or 0
    success_rate = (helpful_feedback / total_feedback * 100) if total_feedback > 0 else 0.0

    # Average resolution time (for resolved tickets)
    resolved_tickets = db.query(Ticket).filter(
        Ticket.resolved_at.isnot(None),
        Ticket.created_at.isnot(None)
    ).all()

    avg_hours = 0.0
    if resolved_tickets:
        total_hours = sum(
            (t.resolved_at - t.created_at).total_seconds() / 3600
            for t in resolved_tickets
            if t.resolved_at and t.created_at
        )
        avg_hours = round(total_hours / len(resolved_tickets), 1)

    return AnalyticsOverview(
        total_tickets=total,
        open_tickets=open_tickets,
        resolved_tickets=resolved,
        auto_resolved_tickets=auto_resolved,
        escalated_tickets=escalated,
        auto_resolution_success_rate=round(success_rate, 1),
        avg_resolution_time_hours=avg_hours,
    )


@router.get("/department-load")
def get_department_load(db: Session = Depends(get_db)):
    """Get ticket count and avg resolution time per department."""
    departments = (
        db.query(
            Ticket.department,
            func.count(Ticket.id).label("ticket_count"),
        )
        .filter(Ticket.department.isnot(None))
        .group_by(Ticket.department)
        .all()
    )

    results = []
    for dept_name, count in departments:
        # Calc avg resolution time per department
        dept_resolved = db.query(Ticket).filter(
            Ticket.department == dept_name,
            Ticket.resolved_at.isnot(None),
        ).all()

        avg_time = 0.0
        if dept_resolved:
            total_h = sum(
                (t.resolved_at - t.created_at).total_seconds() / 3600
                for t in dept_resolved if t.resolved_at and t.created_at
            )
            avg_time = round(total_h / len(dept_resolved), 1)

        results.append({
            "department": dept_name,
            "ticket_count": count,
            "avg_resolution_time": avg_time,
        })

    return results


@router.get("/top-categories")
def get_top_categories(db: Session = Depends(get_db)):
    """Get top 5 recurring ticket categories this week."""
    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    categories = (
        db.query(
            Ticket.category,
            func.count(Ticket.id).label("count"),
        )
        .filter(
            Ticket.category.isnot(None),
            Ticket.created_at >= one_week_ago,
        )
        .group_by(Ticket.category)
        .order_by(func.count(Ticket.id).desc())
        .limit(5)
        .all()
    )

    return [{"category": cat, "count": cnt} for cat, cnt in categories]


@router.get("/severity-distribution")
def get_severity_distribution(db: Session = Depends(get_db)):
    """Get ticket count by severity."""
    results = (
        db.query(Ticket.severity, func.count(Ticket.id).label("count"))
        .group_by(Ticket.severity)
        .all()
    )
    return [{"severity": sev, "count": cnt} for sev, cnt in results]


@router.get("/resolution-trend")
def get_resolution_trend(db: Session = Depends(get_db)):
    """Get daily ticket creation and resolution trend for the past 30 days."""
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    # Group by date — since SQLite doesn't have date functions easily,
    # we'll compute in Python
    tickets = db.query(Ticket).filter(Ticket.created_at >= thirty_days_ago).all()

    daily = {}
    for t in tickets:
        if t.created_at:
            day = t.created_at.strftime("%Y-%m-%d")
            if day not in daily:
                daily[day] = {"date": day, "created": 0, "resolved": 0}
            daily[day]["created"] += 1
            if t.resolved_at and t.resolved_at.strftime("%Y-%m-%d") == day:
                daily[day]["resolved"] += 1

    return sorted(daily.values(), key=lambda x: x["date"])


@router.get("/employee-performance")
def get_employee_performance(db: Session = Depends(get_db)):
    """Get ticket load and resolution stats per employee."""
    employees = db.query(Employee).filter(Employee.is_active == True).all()

    results = []
    for emp in employees:
        assigned_count = db.query(func.count(Ticket.id)).filter(Ticket.assignee_id == emp.id).scalar() or 0
        resolved_count = db.query(func.count(Ticket.id)).filter(
            Ticket.assignee_id == emp.id,
            Ticket.status.in_(["Resolved", "Closed"])
        ).scalar() or 0

        results.append({
            "name": emp.name,
            "department": emp.department,
            "current_load": emp.current_ticket_load,
            "total_assigned": assigned_count,
            "total_resolved": resolved_count,
            "availability": emp.availability,
        })

    return results
