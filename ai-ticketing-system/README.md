# 🤖 Advanced AI Ticketing System

## 🌐 Live Website

You can access and explore the live version of the project here:

👉 **Open the Website:**  
https://ai-ticketing-frontend.onrender.com/

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

## Login
<img width="500" height="900" alt="image" src="https://github.com/user-attachments/assets/73211743-dbb5-46fd-8b92-194c2a90b8a6" />


## Modules

1. **Ticket Intake & AI Analysis** — Submit tickets, AI returns structured category/severity/routing
<img width="1800" height="800" alt="image" src="https://github.com/user-attachments/assets/886c7ee7-b181-4e05-be1f-872876fea964" />

3. **Auto-Resolution Engine** — AI auto-resolves common tickets (password resets, FAQs, policies)
<img width="400" height="400" alt="image" src="https://github.com/user-attachments/assets/cbcf8b69-b60b-4006-9da8-88fa5e5641f3" />

4. **Intelligent Department Routing** — Rules-based routing to Engineering, DevOps, HR, Finance, etc.


5. **Employee Directory & Assignee Suggestion** — Skill-based matching considering load & availability
<img width="400" height="350" alt="image" src="https://github.com/user-attachments/assets/4a12e923-d59b-463a-967c-bcc652c4e718" />
<img width="1000" height="700" alt="image" src="https://github.com/user-attachments/assets/6ed46927-e18c-4d67-ae8c-a8d806f4b218" />



6. **Ticket Lifecycle Management** — Status tracking, notes, escalation, timeline, notifications
<img width="1000" height="150" alt="image" src="https://github.com/user-attachments/assets/b4e420bf-c92e-4a52-905d-b075e83fad87" />
<img width="350" height="450" alt="image" src="https://github.com/user-attachments/assets/9d764f2e-44a0-4465-b189-5d88ecac4f97" />


7. **Analytics Dashboard** — Charts (Recharts): department load, categories, trends, performance
<img width="1000" height="600" alt="image" src="https://github.com/user-attachments/assets/a538e275-6534-472d-9f12-402662606025" />




## Project Structure/

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


## 🚀 Features

### 1️⃣ AI Ticket Analysis
When a user submits a ticket, the AI reads the issue and identifies:

- category  
- severity  
- suggested response  

### 2️⃣ Auto Ticket Routing
The system automatically routes tickets to the correct department such as:

- Engineering  
- DevOps  
- HR  
- Finance  

### 3️⃣ Real-time Chat System
Users and support agents can communicate through a live chat system without refreshing the page.

### 4️⃣ Employee Directory
Admins can manage employees and view:

- ticket workload  
- department  
- availability  

### 5️⃣ Ticket Lifecycle Management
Tickets move through different states:

- Open  
- In Progress  
- Closed  

### 6️⃣ Analytics Dashboard
The system provides analytics including:

- department workload  
- ticket categories  
- performance metrics  


---

## ⚠️ Known Limitations

Currently the AI system does not learn automatically from previously solved tickets. When a user marks a solution as satisfactory, the system does not store that knowledge to improve future responses.

Additionally, the project uses SQLite which is suitable for development and demo purposes but may not scale well for large production systems.

AI responses may also require human verification for complex technical issues.


---

## 🔮 Future Improvements

With more development time, the system could be improved by:

- Adding a vector database so the AI can learn from previously solved tickets  
- Implementing authentication and role-based access control  
- Using PostgreSQL instead of SQLite for better scalability  
- Improving analytics to track employee performance and resolution time


### USER DASHBOARD
<img width="1800" height="1000" alt="image" src="https://github.com/user-attachments/assets/c1783438-a387-4829-9498-7af4768fdced" />




## ADMIN PORTAL
<img width="2000" height="1000" alt="image" src="https://github.com/user-attachments/assets/f4b4e138-3d15-46b0-9320-a913344d625a" />

