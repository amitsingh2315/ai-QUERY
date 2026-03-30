"""
Employee Assignee Suggestion Engine — Module 4
Selects the best employee based on skills, workload, and availability.
"""

from sqlalchemy.orm import Session
from models import Employee


def suggest_assignee(db: Session, department: str, category: str, severity: str) -> dict:
    """
    Find the best available employee for a ticket based on:
    1. Department match
    2. Skill tag match with ticket category
    3. Current ticket load (lower is better)
    4. Availability status (Available > Busy, skip On Leave)

    Returns:
        {
            "employee_id": int or None,
            "employee_name": str or None,
            "reason": str
        }
    """
    # Get active employees in the target department
    candidates = (
        db.query(Employee)
        .filter(
            Employee.department == department,
            Employee.is_active == True,
            Employee.availability != "On Leave",
        )
        .all()
    )

    if not candidates:
        # Fallback: try any available employee
        candidates = (
            db.query(Employee)
            .filter(
                Employee.is_active == True,
                Employee.availability == "Available",
            )
            .all()
        )

    if not candidates:
        return {
            "employee_id": None,
            "employee_name": None,
            "reason": "No available employees found",
        }

    # Score each candidate
    scored = []
    category_lower = category.lower() if category else ""

    for emp in candidates:
        score = 0.0

        # Skill match bonus (0-40 points)
        skills = [s.strip().lower() for s in (emp.skill_tags or "").split(",") if s.strip()]
        if category_lower in skills:
            score += 40
        elif any(category_lower in skill for skill in skills):
            score += 20

        # Availability bonus (0-30 points)
        if emp.availability == "Available":
            score += 30
        elif emp.availability == "Busy":
            score += 10

        # Lower load is better (0-20 points)
        load_penalty = min(emp.current_ticket_load * 4, 20)
        score += (20 - load_penalty)

        # Faster resolution time bonus (0-10 points)
        if emp.avg_resolution_time > 0:
            time_bonus = max(0, 10 - emp.avg_resolution_time)
            score += time_bonus

        scored.append((emp, score))

    # Sort by score descending
    scored.sort(key=lambda x: x[1], reverse=True)
    best = scored[0][0]

    return {
        "employee_id": best.id,
        "employee_name": best.name,
        "reason": f"Best match: {best.name} (Dept: {best.department}, Load: {best.current_ticket_load}, Score: {scored[0][1]:.0f})",
    }


def find_alternative_assignee(db: Session, department: str, exclude_employee_id: int) -> dict:
    """
    Find an alternative employee for escalation.
    Excludes the currently assigned employee.
    """
    candidates = (
        db.query(Employee)
        .filter(
            Employee.department == department,
            Employee.is_active == True,
            Employee.availability == "Available",
            Employee.id != exclude_employee_id,
        )
        .order_by(Employee.current_ticket_load.asc())
        .all()
    )

    if not candidates:
        # Broaden search to any available employee
        candidates = (
            db.query(Employee)
            .filter(
                Employee.is_active == True,
                Employee.availability == "Available",
                Employee.id != exclude_employee_id,
            )
            .order_by(Employee.current_ticket_load.asc())
            .all()
        )

    if candidates:
        emp = candidates[0]
        return {
            "employee_id": emp.id,
            "employee_name": emp.name,
            "reason": f"Escalation reassignment to {emp.name}",
        }

    return {
        "employee_id": None,
        "employee_name": None,
        "reason": "No alternative employees available for escalation",
    }
