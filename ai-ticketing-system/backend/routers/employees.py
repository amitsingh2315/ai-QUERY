"""
Employee API Router — Module 4
Employee directory CRUD and management.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from database import get_db
from models import Employee, Ticket
from schemas import EmployeeCreate, EmployeeUpdate, EmployeeResponse, ActiveTicketInfo

router = APIRouter(prefix="/api/employees", tags=["Employees"])


@router.get("/", response_model=List[EmployeeResponse])
def list_employees(
    department: Optional[str] = None,
    availability: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    """List employees with optional filters."""
    query = db.query(Employee)
    if active_only:
        query = query.filter(Employee.is_active == True)
    if department:
        query = query.filter(Employee.department == department)
    if availability:
        query = query.filter(Employee.availability == availability)
    return query.order_by(Employee.name).all()


@router.get("/active-tickets", response_model=List[ActiveTicketInfo])
def get_active_tickets(db: Session = Depends(get_db)):
    """
    Return active ticket assignments for all employees.
    Active = status in (Assigned, In Progress, Pending Info).
    Returns the most recent active ticket per employee.
    """
    active_statuses = ["Assigned", "In Progress", "Pending Info"]
    rows = (
        db.query(Ticket, Employee)
        .join(Employee, Ticket.assignee_id == Employee.id)
        .filter(Ticket.status.in_(active_statuses))
        .order_by(desc(Ticket.created_at))
        .all()
    )

    results = []
    seen_employees = set()
    for ticket, employee in rows:
        if employee.id not in seen_employees:
            seen_employees.add(employee.id)
            results.append(ActiveTicketInfo(
                employee_id=employee.id,
                employee_name=employee.name,
                ticket_id=ticket.id,
                ticket_title=ticket.title,
                ticket_category=ticket.category,
            ))

    return results


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    """Get single employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.post("/", response_model=EmployeeResponse)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db)):
    """Add a new employee."""
    existing = db.query(Employee).filter(Employee.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee with this email already exists")

    emp = Employee(**data.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(employee_id: int, data: EmployeeUpdate, db: Session = Depends(get_db)):
    """Update an employee's details."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(emp, key, value)

    db.commit()
    db.refresh(emp)
    return emp


@router.delete("/{employee_id}")
def deactivate_employee(employee_id: int, db: Session = Depends(get_db)):
    """Deactivate (soft delete) an employee."""
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp.is_active = False
    db.commit()
    return {"message": f"Employee {emp.name} deactivated"}


@router.get("/departments/list")
def list_departments(db: Session = Depends(get_db)):
    """Get all unique departments."""
    depts = db.query(Employee.department).distinct().all()
    return [d[0] for d in depts]
