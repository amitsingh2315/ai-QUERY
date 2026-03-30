"""
Seed data for the AI Ticketing System.
Populates the employee directory and creates example test tickets.
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models import Employee


SEED_EMPLOYEES = [
    # Engineering
    {"name": "Alice Chen", "email": "alice.chen@company.com", "department": "Engineering", "role": "Senior Backend Engineer", "skill_tags": "bug,db,server,api,python", "avg_resolution_time": 3.5, "current_ticket_load": 2, "availability": "Available"},
    {"name": "Bob Martinez", "email": "bob.martinez@company.com", "department": "Engineering", "role": "Full Stack Developer", "skill_tags": "bug,feature,frontend,react", "avg_resolution_time": 4.0, "current_ticket_load": 1, "availability": "Available"},
    {"name": "Charlie Park", "email": "charlie.park@company.com", "department": "Engineering", "role": "Database Engineer", "skill_tags": "db,server,sql,performance", "avg_resolution_time": 2.5, "current_ticket_load": 3, "availability": "Busy"},

    # DevOps
    {"name": "Diana Singh", "email": "diana.singh@company.com", "department": "DevOps", "role": "DevOps Engineer", "skill_tags": "server,deployment,infrastructure,monitoring", "avg_resolution_time": 1.5, "current_ticket_load": 1, "availability": "Available"},
    {"name": "Ethan Wu", "email": "ethan.wu@company.com", "department": "DevOps", "role": "SRE", "skill_tags": "server,outage,kubernetes,cloud", "avg_resolution_time": 2.0, "current_ticket_load": 0, "availability": "Available"},

    # IT
    {"name": "Fiona O'Brien", "email": "fiona.obrien@company.com", "department": "IT", "role": "IT Support Lead", "skill_tags": "access,permission,password,hardware", "avg_resolution_time": 1.0, "current_ticket_load": 2, "availability": "Available"},
    {"name": "George Lee", "email": "george.lee@company.com", "department": "IT", "role": "System Administrator", "skill_tags": "access,server,network,security", "avg_resolution_time": 2.0, "current_ticket_load": 0, "availability": "Available"},

    # HR
    {"name": "Hannah Kim", "email": "hannah.kim@company.com", "department": "HR", "role": "HR Manager", "skill_tags": "hr,leave,policy,benefits,onboarding", "avg_resolution_time": 4.0, "current_ticket_load": 1, "availability": "Available"},
    {"name": "Ian Patel", "email": "ian.patel@company.com", "department": "HR", "role": "HR Coordinator", "skill_tags": "hr,leave,payroll,recruitment", "avg_resolution_time": 3.0, "current_ticket_load": 0, "availability": "On Leave"},

    # Finance
    {"name": "Julia Wang", "email": "julia.wang@company.com", "department": "Finance", "role": "Finance Analyst", "skill_tags": "billing,payroll,reimbursement,invoicing", "avg_resolution_time": 5.0, "current_ticket_load": 1, "availability": "Available"},
    {"name": "Kevin Brown", "email": "kevin.brown@company.com", "department": "Finance", "role": "Accounts Manager", "skill_tags": "billing,payment,accounting,tax", "avg_resolution_time": 6.0, "current_ticket_load": 0, "availability": "Available"},

    # Product
    {"name": "Laura Davis", "email": "laura.davis@company.com", "department": "Product", "role": "Product Manager", "skill_tags": "feature,bug,roadmap,ux", "avg_resolution_time": 8.0, "current_ticket_load": 2, "availability": "Busy"},
    {"name": "Mike Johnson", "email": "mike.johnson@company.com", "department": "Product", "role": "UX Designer", "skill_tags": "feature,ui,design,accessibility", "avg_resolution_time": 6.0, "current_ticket_load": 0, "availability": "Available"},

    # Legal
    {"name": "Nancy Taylor", "email": "nancy.taylor@company.com", "department": "Legal", "role": "Legal Counsel", "skill_tags": "compliance,legal,contract,privacy", "avg_resolution_time": 12.0, "current_ticket_load": 0, "availability": "Available"},

    # Marketing
    {"name": "Oscar Rivera", "email": "oscar.rivera@company.com", "department": "Marketing", "role": "Marketing Manager", "skill_tags": "marketing,campaign,social,content", "avg_resolution_time": 10.0, "current_ticket_load": 1, "availability": "Available"},
]


# Example tickets for testing all modules
EXAMPLE_TICKETS = [
    {
        "title": "Cannot reset my password",
        "description": "I've been trying to reset my password for the past hour but the reset link keeps expiring. Please help me regain access to my account. My username is jdoe@company.com.",
        "user_email": "john.doe@company.com",
    },
    {
        "title": "Server is completely down — URGENT",
        "description": "The production server api.company.com is completely unreachable since 2 PM. All customer-facing APIs are returning 502 errors. This is affecting thousands of users. We need immediate resolution!",
        "user_email": "ops.team@company.com",
    },
    {
        "title": "Database query taking too long",
        "description": "The user search query on the admin dashboard is taking over 30 seconds to return results. It used to take under 1 second. I suspect the users table index might be corrupted after last night's migration.",
        "user_email": "dev.team@company.com",
    },
    {
        "title": "What is the leave policy for new employees?",
        "description": "Hi, I recently joined the company and would like to know the leave policy. How many vacation days do I get? Can I carry them over to next year? Also, what's the process for applying for sick leave?",
        "user_email": "new.employee@company.com",
    },
    {
        "title": "Billing discrepancy on my invoice",
        "description": "I noticed my latest invoice (#INV-2024-0342) has a charge of $500 for a service I never subscribed to. Could you please clarify this charge and issue a corrected invoice? Thank you.",
        "user_email": "customer@example.com",
    },
    {
        "title": "Feature request: Dark mode for dashboard",
        "description": "It would be great if the analytics dashboard supported dark mode. Many of our team members work late hours and the bright white interface causes eye strain. This could also improve accessibility for users with light sensitivity.",
        "user_email": "product.feedback@company.com",
    },
    {
        "title": "Cannot access shared drive after role change",
        "description": "I was recently promoted from Junior Developer to Senior Developer but I still can't access the Engineering shared drive. My access permissions haven't been updated. I need access to the architecture documents ASAP for a critical project deadline.",
        "user_email": "promoted.dev@company.com",
    },
    {
        "title": "Payroll calculation error this month",
        "description": "My payroll this month is incorrect. The overtime hours were not included in the calculation. I worked 15 extra hours last week which should have been compensated. I'm very frustrated because this is the second time this has happened!",
        "user_email": "frustrated.employee@company.com",
    },
    {
        "title": "Application crashes on report export",
        "description": "When I try to export the monthly sales report to PDF, the application crashes with error code ERR_OUT_OF_MEMORY. This happens consistently when the report has more than 500 rows. Stack trace attached.",
        "user_email": "sales.team@company.com",
    },
    {
        "title": "Need compliance review for new data processing",
        "description": "We are planning to implement a new customer data processing pipeline that involves storing EU customer data. We need a compliance review to ensure we meet GDPR requirements before we can proceed with development.",
        "user_email": "project.lead@company.com",
    },
]


def seed_employees(db: Session):
    """Seed the employee directory if empty."""
    count = db.query(Employee).count()
    if count > 0:
        print(f"[Seed] Employee directory already has {count} entries, skipping.")
        return

    for emp_data in SEED_EMPLOYEES:
        emp = Employee(**emp_data)
        db.add(emp)

    db.commit()
    print(f"[Seed] Added {len(SEED_EMPLOYEES)} employees to the directory.")
