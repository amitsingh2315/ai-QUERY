"""
AI Analysis Service — Module 1
Handles ticket analysis using LLM (Groq / Claude) with mock fallback.
Contains the robust prompt engineering for structured JSON output.
"""

import json
import os
import re
import random
from typing import Optional
from schemas import AIAnalysisResult

# ─── LLM Prompt Template ─────────────────────────────────────────────

TICKET_ANALYSIS_PROMPT = """You are an expert IT support ticket analyst for an enterprise organization.
Analyze the following support ticket and return a STRICTLY structured JSON response.

## TICKET DETAILS
Title: {title}
Description: {description}
User Email: {user_email}

## INSTRUCTIONS
1. Carefully read the ticket title and description.
2. Categorize the ticket into exactly ONE of the allowed categories.
3. Assess the severity based on business impact and urgency.
4. Determine if the ticket can be auto-resolved (simple FAQs, password resets, policy questions, status inquiries) or needs human assignment.
5. Detect the user's emotional sentiment.
6. Suggest the most appropriate department and employee role.
7. Provide a confidence score (0.0 to 1.0) for your analysis.
8. Estimate resolution time realistically.

## HANDLING EDGE CASES
- If the ticket is UNCLEAR or VAGUE: Set category to "Other", severity to "Medium", confidence_score below 0.5, and recommend "Assign to department".
- If the ticket contains MULTIPLE ISSUES: Focus on the PRIMARY/most urgent issue for categorization, mention others in ai_summary.
- If the user is EMOTIONAL/FRUSTRATED: Set sentiment to "Frustrated", consider bumping severity if warranted, and always recommend "Assign to department" for frustrated users with complex issues.
- If the ticket is a SIMPLE FAQ/REQUEST (password reset, leave policy, billing clarification, status check): Recommend "Auto-resolve".

## ALLOWED VALUES
Category: Billing, Bug, Access, HR, Server, DB, Feature, Other
Severity: Critical, High, Medium, Low
Recommended Resolution Path: Auto-resolve, Assign to department
Sentiment: Frustrated, Neutral, Polite

## REQUIRED OUTPUT FORMAT
Return ONLY valid JSON with these exact keys (no markdown, no explanation, no additional text):
{{
    "category": "<one of allowed categories>",
    "ai_summary": "<concise 1-2 sentence summary of the issue>",
    "severity": "<one of allowed severities>",
    "recommended_resolution_path": "<Auto-resolve or Assign to department>",
    "sentiment": "<one of allowed sentiments>",
    "suggested_department": "<department name>",
    "suggested_employee": "<role/title of ideal assignee or null>",
    "confidence_score": <float between 0.0 and 1.0>,
    "estimated_resolution_time": "<e.g. 30 minutes, 2 hours, 1 day>"
}}
"""


# ─── Mock AI Analysis (Demo/Fallback Mode) ───────────────────────────

# Keyword-based classification rules for the mock engine
MOCK_RULES = {
    "password": {"category": "Access", "severity": "Low", "path": "Auto-resolve", "dept": "IT", "time": "15 minutes"},
    "reset": {"category": "Access", "severity": "Low", "path": "Auto-resolve", "dept": "IT", "time": "15 minutes"},
    "login": {"category": "Access", "severity": "Medium", "path": "Auto-resolve", "dept": "IT", "time": "30 minutes"},
    "billing": {"category": "Billing", "severity": "Medium", "path": "Auto-resolve", "dept": "Finance", "time": "1 hour"},
    "invoice": {"category": "Billing", "severity": "Medium", "path": "Auto-resolve", "dept": "Finance", "time": "1 hour"},
    "payment": {"category": "Billing", "severity": "Medium", "path": "Assign to department", "dept": "Finance", "time": "2 hours"},
    "payroll": {"category": "Billing", "severity": "High", "path": "Assign to department", "dept": "Finance", "time": "4 hours"},
    "reimbursement": {"category": "Billing", "severity": "Medium", "path": "Assign to department", "dept": "Finance", "time": "2 days"},
    "bug": {"category": "Bug", "severity": "High", "path": "Assign to department", "dept": "Engineering", "time": "4 hours"},
    "error": {"category": "Bug", "severity": "High", "path": "Assign to department", "dept": "Engineering", "time": "4 hours"},
    "crash": {"category": "Bug", "severity": "Critical", "path": "Assign to department", "dept": "Engineering", "time": "2 hours"},
    "broken": {"category": "Bug", "severity": "High", "path": "Assign to department", "dept": "Engineering", "time": "4 hours"},
    "server": {"category": "Server", "severity": "Critical", "path": "Assign to department", "dept": "DevOps", "time": "1 hour"},
    "down": {"category": "Server", "severity": "Critical", "path": "Assign to department", "dept": "DevOps", "time": "1 hour"},
    "outage": {"category": "Server", "severity": "Critical", "path": "Assign to department", "dept": "DevOps", "time": "1 hour"},
    "database": {"category": "DB", "severity": "Critical", "path": "Assign to department", "dept": "Engineering", "time": "2 hours"},
    "db": {"category": "DB", "severity": "Critical", "path": "Assign to department", "dept": "Engineering", "time": "2 hours"},
    "query": {"category": "DB", "severity": "High", "path": "Assign to department", "dept": "Engineering", "time": "3 hours"},
    "leave": {"category": "HR", "severity": "Low", "path": "Auto-resolve", "dept": "HR", "time": "15 minutes"},
    "hr": {"category": "HR", "severity": "Low", "path": "Auto-resolve", "dept": "HR", "time": "30 minutes"},
    "policy": {"category": "HR", "severity": "Low", "path": "Auto-resolve", "dept": "HR", "time": "15 minutes"},
    "vacation": {"category": "HR", "severity": "Low", "path": "Auto-resolve", "dept": "HR", "time": "15 minutes"},
    "feature": {"category": "Feature", "severity": "Medium", "path": "Assign to department", "dept": "Product", "time": "1 week"},
    "request": {"category": "Feature", "severity": "Medium", "path": "Assign to department", "dept": "Product", "time": "3 days"},
    "access": {"category": "Access", "severity": "High", "path": "Assign to department", "dept": "IT", "time": "1 hour"},
    "permission": {"category": "Access", "severity": "High", "path": "Assign to department", "dept": "IT", "time": "1 hour"},
    "compliance": {"category": "Other", "severity": "High", "path": "Assign to department", "dept": "Legal", "time": "2 days"},
    "legal": {"category": "Other", "severity": "High", "path": "Assign to department", "dept": "Legal", "time": "2 days"},
    "marketing": {"category": "Other", "severity": "Low", "path": "Assign to department", "dept": "Marketing", "time": "3 days"},
}


def _detect_sentiment(text: str) -> str:
    """Simple keyword-based sentiment detection for mock mode."""
    frustrated_words = ["urgent", "frustrated", "angry", "terrible", "worst", "unacceptable", "immediately", "asap", "broken again", "still not"]
    polite_words = ["please", "thank", "appreciate", "kindly", "would be great", "when you get a chance"]

    text_lower = text.lower()
    frust_count = sum(1 for w in frustrated_words if w in text_lower)
    polite_count = sum(1 for w in polite_words if w in text_lower)

    if frust_count > polite_count:
        return "Frustrated"
    elif polite_count > frust_count:
        return "Polite"
    return "Neutral"


def mock_analyze_ticket(title: str, description: str, user_email: str) -> AIAnalysisResult:
    """
    Mock AI analysis using keyword matching.
    Used when no API key is configured or as a fallback.
    """
    combined = f"{title} {description}".lower()
    sentiment = _detect_sentiment(combined)

    # Find best matching rule
    best_match = None
    for keyword, rule in MOCK_RULES.items():
        if keyword in combined:
            best_match = rule
            break

    if not best_match:
        best_match = {
            "category": "Other",
            "severity": "Medium",
            "path": "Assign to department",
            "dept": "IT",
            "time": "4 hours",
        }

    # Generate a contextual summary
    summary = f"User reports an issue related to {best_match['category'].lower()}. "
    if best_match["path"] == "Auto-resolve":
        summary += "This appears to be a common inquiry that can be resolved automatically."
    else:
        summary += f"This requires attention from the {best_match['dept']} department."

    confidence = round(random.uniform(0.75, 0.95), 2)

    return AIAnalysisResult(
        category=best_match["category"],
        ai_summary=summary,
        severity=best_match["severity"],
        recommended_resolution_path=best_match["path"],
        sentiment=sentiment,
        suggested_department=best_match["dept"],
        suggested_employee=None,
        confidence_score=confidence,
        estimated_resolution_time=best_match["time"],
    )


# ─── Real LLM Analysis ───────────────────────────────────────────────

async def analyze_with_groq(title: str, description: str, user_email: str) -> Optional[AIAnalysisResult]:
    """Analyze ticket using Groq API (LLaMA / Mixtral via Groq cloud)."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    try:
        from groq import Groq
        client = Groq(api_key=api_key)

        prompt = TICKET_ANALYSIS_PROMPT.format(
            title=title, description=description, user_email=user_email
        )

        response = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=[
                {"role": "system", "content": "You are a precise ticket analysis AI. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=500,
        )

        content = response.choices[0].message.content.strip()
        # Extract JSON from potential markdown code blocks
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return AIAnalysisResult(**data)
    except Exception as e:
        print(f"[AI Service] Groq error: {e}")
    return None


async def analyze_with_claude(title: str, description: str, user_email: str) -> Optional[AIAnalysisResult]:
    """Analyze ticket using Anthropic Claude API."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return None

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        prompt = TICKET_ANALYSIS_PROMPT.format(
            title=title, description=description, user_email=user_email
        )

        response = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307"),
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.content[0].text.strip()
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            return AIAnalysisResult(**data)
    except Exception as e:
        print(f"[AI Service] Claude error: {e}")
    return None


async def analyze_ticket(title: str, description: str, user_email: str) -> AIAnalysisResult:
    """
    Main analysis function. Tries Groq → Claude → Mock fallback.
    Always returns a valid AIAnalysisResult.
    """
    # Try Groq first
    result = await analyze_with_groq(title, description, user_email)
    if result:
        print("[AI Service] Analysis completed via Groq")
        return result

    # Try Claude
    result = await analyze_with_claude(title, description, user_email)
    if result:
        print("[AI Service] Analysis completed via Claude")
        return result

    # Fallback to mock
    print("[AI Service] Using mock analysis (no API keys configured)")
    return mock_analyze_ticket(title, description, user_email)
