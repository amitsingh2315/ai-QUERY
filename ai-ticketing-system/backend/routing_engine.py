"""
Intelligent Department Routing Engine — Module 3
Routes tickets to the correct department based on AI analysis output.
"""

# ─── Department Routing Rules ─────────────────────────────────────────

ROUTING_RULES = {
    # Category-based routing with priority adjustments
    "DB": {
        "department": "Engineering",
        "severity_override": "Critical",
        "fallback_department": "DevOps",
    },
    "Server": {
        "department": "DevOps",
        "severity_override": "Critical",
        "fallback_department": "Engineering",
    },
    "Bug": {
        "department": "Engineering",
        "severity_override": None,
        "fallback_department": "Product",
    },
    "Access": {
        "department": "IT",
        "severity_override": "High",
        "fallback_department": None,
    },
    "Billing": {
        "department": "Finance",
        "severity_override": None,
        "fallback_department": None,
    },
    "HR": {
        "department": "HR",
        "severity_override": None,
        "fallback_department": None,
    },
    "Feature": {
        "department": "Product",
        "severity_override": None,
        "fallback_department": "Engineering",
    },
    "Other": {
        "department": "IT",
        "severity_override": None,
        "fallback_department": None,
    },
}

# Keyword-based overrides for more specific routing
KEYWORD_OVERRIDES = {
    "payroll": {"department": "Finance", "severity_override": "High"},
    "reimbursement": {"department": "Finance", "severity_override": None},
    "leave": {"department": "HR", "severity_override": None},
    "compliance": {"department": "Legal", "severity_override": "High"},
    "legal": {"department": "Legal", "severity_override": "High"},
    "marketing": {"department": "Marketing", "severity_override": None},
    "campaign": {"department": "Marketing", "severity_override": None},
    "devops": {"department": "DevOps", "severity_override": None},
    "deployment": {"department": "DevOps", "severity_override": "High"},
    "infrastructure": {"department": "DevOps", "severity_override": "High"},
}


def route_ticket(category: str, severity: str, ai_summary: str, description: str) -> dict:
    """
    Determine the target department and any severity adjustments
    based on AI analysis output and routing rules.

    Returns:
        {
            "department": str,
            "severity": str,  (possibly upgraded)
            "routing_reason": str
        }
    """
    combined_text = f"{ai_summary} {description}".lower()

    # Check keyword overrides first for specific routing
    for keyword, override in KEYWORD_OVERRIDES.items():
        if keyword in combined_text:
            final_severity = override.get("severity_override") or severity
            return {
                "department": override["department"],
                "severity": final_severity,
                "routing_reason": f"Keyword match: '{keyword}' → {override['department']}",
            }

    # Use category-based routing
    rule = ROUTING_RULES.get(category, ROUTING_RULES["Other"])
    final_severity = rule.get("severity_override") or severity

    return {
        "department": rule["department"],
        "severity": final_severity,
        "routing_reason": f"Category '{category}' → {rule['department']}",
    }
