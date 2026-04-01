# 🤖 Advanced AI Ticketing System

A smart internal ticketing platform where AI reads incoming tickets, analyzes them using LLM, auto-resolves when possible, or intelligently routes them to the correct department and employee.

## Architecture

```
Frontend (React) → API (FastAPI) → AI Analysis Layer → Routing Engine → Ticket System → Analytics
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, SQLAlchemy |
| Database | SQLite |
| Frontend | React 18, TailwindCSS 3, Recharts |
| AI/LLM | Groq(free cost) |
| Real-time | WebSockets |

## Login
<img width="500" height="900" alt="image" src="https://github.com/user-attachments/assets/73211743-dbb5-46fd-8b92-194c2a90b8a6" />


## Modules

1. **Ticket Intake & AI Analysis** — Submit tickets, AI returns structured category/severity/routing
2. **Auto-Resolution Engine** — AI auto-resolves common tickets (password resets, FAQs, policies)
3. **Intelligent Department Routing** — Rules-based routing to Engineering, DevOps, HR, Finance, etc.
4. **Employee Directory & Assignee Suggestion** — Skill-based matching considering load & availability
5. **Ticket Lifecycle Management** — Status tracking, notes, escalation, timeline, notifications
6. **Analytics Dashboard** — Charts (Recharts): department load, categories, trends, performance

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# (Optional) Configure AI — system works without API keys using mock AI
copy .env.example .env
# Edit .env to add OPENAI_API_KEY or ANTHROPIC_API_KEY

# Start server
uvicorn main:app --reload --port 8000
```

The backend auto-creates the database, tables, and seeds 15 employees on first run.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### API Docs

FastAPI Swagger UI: http://localhost:8000/docs

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tickets/` | Create ticket (AI analysis + routing) |
| GET | `/api/tickets/` | List tickets with filters |
| GET | `/api/tickets/{id}` | Get ticket detail |
| PATCH | `/api/tickets/{id}/status` | Update status |
| POST | `/api/tickets/{id}/notes` | Add note |
| GET | `/api/tickets/{id}/timeline` | Get timeline |
| POST | `/api/tickets/{id}/feedback` | Submit feedback |
| POST | `/api/tickets/{id}/escalate` | Escalate ticket |
| GET | `/api/employees/` | List employees |
| POST | `/api/employees/` | Add employee |
| PUT | `/api/employees/{id}` | Update employee |
| DELETE | `/api/employees/{id}` | Deactivate employee |
| GET | `/api/analytics/overview` | Dashboard stats |
| GET | `/api/analytics/department-load` | Department chart data |
| GET | `/api/analytics/top-categories` | Top 5 categories |
| WS | `/ws` | WebSocket real-time updates |

## Example Test Tickets

The system includes 10 pre-built test ticket scenarios in `backend/seed_data.py`:

1. Password reset (→ Auto-resolve)
2. Server down — URGENT (→ DevOps, Critical)
3. Database query slow (→ Engineering, Critical)
4. Leave policy inquiry (→ Auto-resolve)
5. Billing discrepancy (→ Auto-resolve)
6. Feature request: Dark mode (→ Product)
7. Access permissions after role change (→ IT, High)
8. Payroll calculation error (→ Finance, Frustrated)
9. Application crash on export (→ Engineering, Bug)
10. Compliance review needed (→ Legal, High)

## Project Structure

```
ai-ticketing-system/
├── backend/
│   ├── main.py              # FastAPI app + WebSocket
│   ├── database.py           # SQLite + SQLAlchemy setup
│   ├── models.py             # ORM models
│   ├── schemas.py            # Pydantic schemas
│   ├── ai_service.py         # LLM prompt + OpenAI/Claude + mock
│   ├── routing_engine.py     # Department routing rules
│   ├── assignee_engine.py    # Employee matching engine
│   ├── seed_data.py          # Employee + ticket seed data
│   ├── requirements.txt
│   ├── .env.example
│   └── routers/
│       ├── tickets.py        # Ticket CRUD + lifecycle
│       ├── employees.py      # Employee directory
│       └── analytics.py      # Dashboard analytics
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx           # Routing + layout
│       ├── api.js            # API client
│       ├── index.css         # Design system
│       └── pages/
│           ├── TicketSubmit.jsx
│           ├── TicketList.jsx
│           ├── TicketDetail.jsx
│           ├── EmployeeDirectory.jsx
│           └── Analytics.jsx
└── README.md
```
