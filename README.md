# 🎓 Curio — Cloud Quiz Platform

> A full-stack cloud-based quiz management system built with **FastAPI** (backend) and **React + Vite** (frontend). Supports role-based access for **Admins**, **Teachers**, and **Students** with real-time analytics, leaderboards, live countdowns, and notifications. All timestamps are displayed in **IST (India Standard Time, UTC+5:30)**.

---

## 📁 Project Structure

```
THE2/
├── alembic/                        # Database migration scripts
│   ├── versions/
│   └── env.py
├── alembic.ini                     # Alembic config (timezone = Asia/Kolkata)
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic Settings (reads .env)
│   │   │   ├── database.py         # SQLAlchemy engine + session
│   │   │   ├── email.py            # SMTP OTP sender
│   │   │   ├── security.py         # JWT + password hashing
│   │   │   ├── blacklist.py        # Token blacklist (optional)
│   │   │   └── timezone_utils.py   # IST helpers: now_ist(), IST tzinfo  ← NEW
│   │   ├── models/
│   │   │   ├── user.py             # User, UserRole enum
│   │   │   ├── quiz.py             # Quiz, Question, Option, Enrollment
│   │   │   ├── attempt.py          # QuizAttempt, AttemptAnswer
│   │   │   └── notification.py     # Notification model
│   │   ├── routers/
│   │   │   ├── auth.py             # /api/auth/*
│   │   │   ├── dashboard.py        # /api/dashboard/*
│   │   │   ├── quiz.py             # /api/quizzes/*
│   │   │   ├── analytics.py        # /api/analytics
│   │   │   ├── leaderboard.py      # /api/leaderboard/*
│   │   │   ├── notifications.py    # /api/notifications/*
│   │   │   ├── settings.py         # /api/settings/*
│   │   │   └── admin.py            # /api/admin/*
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── quiz.py
│   │   │   └── misc.py
│   │   ├── main.py                 # FastAPI app entry point
│   │   └── seed.py                 # Demo data seeder (IST timestamps)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── venv/
├── frontend-react/                 # React source code
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js            # All API calls (AuthAPI, QuizAPI, …)
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # JWT, RBAC, dark mode sync
│   │   │   └── ToastContext.jsx    # Global toast notifications
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.jsx    # Sidebar + Header wrapper
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Sidebar.css
│   │   │   │   ├── TopHeader.jsx
│   │   │   │   └── TopHeader.css
│   │   │   ├── quiz/
│   │   │   │   └── QuizCard.jsx    # Reusable quiz card (IST dates)
│   │   │   └── ui/
│   │   │       └── ErrorBoundary.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── MyQuizzesPage.jsx
│   │   │   ├── CreateQuizPage.jsx + .css
│   │   │   ├── TakeQuizPage.jsx + .css
│   │   │   ├── AnalyticsPage.jsx + .css
│   │   │   ├── LeaderboardPage.jsx + .css
│   │   │   ├── NotificationsPage.jsx + .css
│   │   │   ├── SettingsPage.jsx + .css
│   │   │   ├── AdminPage.jsx + .css
│   │   │   └── NotFoundPage.jsx
│   │   ├── utils/
│   │   │   └── dateUtils.js        # IST formatters: formatIST(), timeAgoIST()  ← NEW
│   │   ├── styles/
│   │   │   └── global.css          # Full design system (light + dark mode)
│   │   ├── App.jsx                 # Router + providers + protected routes
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── frontend/                       # Built output — served by Nginx
├── nginx/
│   └── cloudquiz.conf              # Nginx config (serves React + proxies /api)
├── docker-compose.yml
├── .env                            # Secrets — never commit
├── deploy.sh                       # First-time EC2 deploy script
├── update.sh                       # Zero-downtime update script
├── backup.sh                       # PostgreSQL backup script
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Docker + Docker Compose** (recommended)
- OR **Python 3.11+** and **Node.js 20+** for local dev

---

### Option A — Docker (Recommended)

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd THE2

# 2. Copy and configure your .env
cp .env.example .env
# Edit .env — set SMTP_USER, SMTP_PASS, SECRET_KEY

# 3. Build the React frontend first
cd frontend-react
npm install
npm run build        # outputs built files to ../frontend/
cd ..

# 4. Launch all services
docker compose up --build -d

# 5. Visit http://localhost
```

Docker starts three containers:

| Container | Port | Role |
|---|---|---|
| `curio_db` | 5432 | PostgreSQL 15 |
| `curio_backend` | 8000 | FastAPI + Uvicorn |
| `curio_nginx` | 80 | Nginx (serves React + proxies /api) |

---

### Option B — Local Development

**Backend:**
```bash
cd THE2
python -m venv backend/venv
source backend/venv/bin/activate      # Windows: backend\venv\Scripts\activate
pip install -r backend/requirements.txt

# Set required env vars
export DATABASE_URL="postgresql://curio_user:localdevpass@localhost:5432/curio_db"
export SECRET_KEY="dev-secret-min-32-chars-change-me"

# Run migrations then seed demo data
alembic upgrade head
python -m backend.app.seed

# Start backend
uvicorn backend.app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend-react
npm install
npm run dev      # Vite dev server → http://localhost:5173
                 # /api requests are proxied to http://localhost:8000
```

---

## 🔑 Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@projexi.com | admin1234 |
| **Teacher** | rohitrk.singh1920@gmail.com | rohit1234 |
| **Student** | alice@example.com | student123 |
| **Student** | bob@example.com | student123 |
| **Student** | charlie@example.com | student123 |

---

## 🌐 API Reference

Base URL: `http://localhost:8000`

Interactive docs: [`/docs`](http://localhost:8000/docs) — Swagger UI with Bearer auth

### Auth

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/signup` | Register new student account | Public |
| POST | `/api/auth/login` | Login → receive JWT | Public |
| GET | `/api/auth/me` | Get current user info | Bearer |
| POST | `/api/auth/forgot-password` | Send OTP to email | Public |
| POST | `/api/auth/reset-password` | Verify OTP + set new password | Public |
| POST | `/api/auth/logout` | Logout (client discards token) | Bearer |

### Dashboard

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/dashboard/stats` | KPI stats (quizzes, score, participants) | Bearer |
| GET | `/api/dashboard/active-quizzes` | Currently active quizzes | Bearer |
| GET | `/api/dashboard/upcoming-quizzes` | Scheduled upcoming quizzes | Bearer |

### Quizzes

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/quizzes` | List quizzes (role-filtered) | Bearer |
| POST | `/api/quizzes` | Create a new quiz | Teacher+ |
| GET | `/api/quizzes/{id}` | Full quiz detail | Bearer |
| PATCH | `/api/quizzes/{id}` | Update quiz metadata | Teacher+ |
| DELETE | `/api/quizzes/{id}` | Delete quiz | Teacher+ |
| GET | `/api/quizzes/{id}/take` | Quiz for student (answers hidden) | Bearer |
| POST | `/api/quizzes/{id}/submit` | Submit quiz answers | Bearer |
| POST | `/api/quizzes/{id}/enroll` | Enroll students | Teacher+ |

### Analytics, Leaderboard & Notifications

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/analytics` | Score trends and subject performance | Bearer |
| GET | `/api/leaderboard/{id}` | Ranked leaderboard for a quiz | Bearer |
| GET | `/api/notifications` | List notifications (filter: unread) | Bearer |
| PATCH | `/api/notifications/{id}/read` | Mark one notification as read | Bearer |
| POST | `/api/notifications/mark-all-read` | Mark all as read | Bearer |
| DELETE | `/api/notifications/{id}` | Delete a notification | Bearer |

### Settings

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/settings/profile` | Get full profile | Bearer |
| PATCH | `/api/settings/profile` | Update name, dark mode, language | Bearer |
| POST | `/api/settings/profile/avatar` | Upload profile picture (PNG/JPG ≤ 5 MB) | Bearer |
| POST | `/api/settings/security/request-otp` | Send OTP for password change | Bearer |
| POST | `/api/settings/security/verify-otp` | Verify OTP + set new password | Bearer |
| POST | `/api/settings/security/change-password` | Direct password change (no OTP) | Bearer |
| PATCH | `/api/settings/notifications` | Update email digest / push alert prefs | Bearer |

### Admin

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/admin/users` | List all users (optional: filter by role) | Admin |
| GET | `/api/admin/users/students` | List all students | Teacher+ |
| PATCH | `/api/admin/users/{id}/role` | Promote / demote role | Admin |
| PATCH | `/api/admin/users/{id}/activate` | Enable or disable account | Admin |
| DELETE | `/api/admin/users/{id}` | Permanently delete user | Admin |

---

## ⚙️ Environment Variables (`.env`)

```env
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://curio_user:localdevpass@localhost:5432/curio_db
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=1800

# ── Auth ──────────────────────────────────────────────────────────────────────
SECRET_KEY=your-secret-key-min-32-characters-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ── App ───────────────────────────────────────────────────────────────────────
APP_NAME=Curio
APP_VERSION=1.0.0
DEBUG=True
ENVIRONMENT=development
FRONTEND_ORIGINS=["http://localhost","http://localhost:5173","http://localhost:80"]

# ── Timezone ──────────────────────────────────────────────────────────────────
TZ=Asia/Kolkata     # Optional Docker-level override for consistency

# ── Email — needed for OTP password reset ────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_gmail_app_password
# Generate at: myaccount.google.com → Security → App Passwords
EMAILS_FROM_NAME=Curio
```

> **Note:** If SMTP is not configured, OTP-based password reset returns HTTP 503. Use **"Change Password"** (current password required) instead — no SMTP needed.

---

## 🕐 Timezone — IST (UTC+5:30)

All timestamps in Curio are handled in **India Standard Time (IST, UTC+5:30)**:

| Layer | Implementation |
|---|---|
| **PostgreSQL** | Stores timestamps as UTC internally (`DateTime(timezone=True)`) — correct and unchanged |
| **Python backend** | `now_ist()` from `backend/app/core/timezone_utils.py` replaces all `datetime.now(timezone.utc)` calls |
| **OTP expiry** | 10-minute window is computed and checked in IST |
| **Seed data** | All historical attempt timestamps generated in IST |
| **React frontend** | All display helpers use `{ timeZone: 'Asia/Kolkata' }` via `src/utils/dateUtils.js` |
| **Alembic** | Migration filenames timestamped in IST (`timezone = Asia/Kolkata` in `alembic.ini`) |

The central backend helper (single source of truth):

```python
# backend/app/core/timezone_utils.py
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30), name="IST")

def now_ist() -> datetime:
    """Return the current datetime as a timezone-aware IST datetime."""
    return datetime.now(IST)
```

The frontend display utility:

```js
// frontend-react/src/utils/dateUtils.js
export function formatIST(isoString) {
  return new Date(isoString).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function timeAgoIST(isoString) { /* returns "5 mins ago", "Yesterday", etc. */ }
export function formatDateIST(dateStr)  { /* "20 Jun 2026" */ }
export function formatTimeIST(timeStr)  { /* "10:30 AM" */ }
export function formatCompactIST(isoString) { /* "20 Jun, 2:45 PM" */ }
```

---

## 🎨 Frontend Tech Stack

| Library | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| React Router | 6.x | Client-side routing with protected/public routes |
| Recharts | 2.x | Analytics charts (line chart + bar chart) |
| Vite | 5.x | Build tool + HMR dev server with API proxy |
| Remix Icons | 3.5 | Icon set (1000+ icons) |
| Plus Jakarta Sans | Google Fonts | Display / heading typography |
| Outfit | Google Fonts | Body / UI typography |

**No Tailwind, no MUI** — custom CSS design system with CSS custom properties for full light/dark mode theming via `html[data-theme="dark"]`.

---

## 🛡️ Role-Based Access

| Feature | Student | Teacher | Admin |
|---|---|---|---|
| View assigned quizzes | ✅ | ✅ | ✅ |
| Take quiz | ✅ | ✅ | ✅ |
| Create quiz | ❌ | ✅ | ✅ |
| Delete quiz | ❌ | ✅ (own only) | ✅ |
| View analytics | ✅ (own) | ✅ (own) | ✅ |
| View leaderboard | ✅ | ✅ | ✅ |
| Enroll students into quiz | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Change user roles | ❌ | ❌ | ✅ |
| Enable / disable accounts | ❌ | ❌ | ✅ |

Enforcement happens at both layers — frontend (React Router `ProtectedRoute`) and backend (FastAPI `Depends(require_admin)` / `Depends(require_teacher)`).

---

## 🔧 Maintenance Scripts

```bash
# First-time production deploy on EC2
chmod +x deploy.sh && ./deploy.sh

# Zero-downtime update (git pull + pip install + migrate + Gunicorn reload)
chmod +x update.sh && ./update.sh

# Backup PostgreSQL database (local + optional S3 upload)
chmod +x backup.sh && ./backup.sh
# Backups saved to: /home/ubuntu/curio/backups/curio_YYYYMMDD_HHMMSS.sql.gz

# Restore a backup
gunzip < backups/curio_20260415_120000.sql.gz | \
  PGPASSWORD='localdevpass' psql -h localhost -U curio_user -d curio_db
```

---

## 🐳 Docker Details

```bash
# View live logs
docker compose logs -f backend
docker compose logs -f nginx

# Rebuild after code changes
docker compose up --build -d

# Access PostgreSQL shell
docker exec -it curio_db psql -U curio_user -d curio_db

# Run Alembic migrations manually inside container
docker exec curio_backend alembic -c /app/alembic.ini upgrade head

# Re-seed database (skips if already seeded)
docker exec curio_backend python -m backend.app.seed

# Force wipe and re-seed
docker exec curio_db psql -U curio_user -d curio_db \
  -c "TRUNCATE users RESTART IDENTITY CASCADE;"
docker exec curio_backend python -m backend.app.seed
```

---

## 📦 Building for Production

```bash
# 1. Build the React frontend
cd frontend-react
npm run build          # outputs to THE2/frontend/ (served by Nginx automatically)
cd ..

# 2. Harden your .env for production
#    DEBUG=False
#    ENVIRONMENT=production
#    SECRET_KEY=<strong random 64-char string>
#    SMTP_USER + SMTP_PASS with real credentials

# 3. Deploy
docker compose up --build -d

# 4. Confirm health
curl http://localhost/health
# Expected: {"status":"ok","app":"Curio","version":"1.0.0","environment":"production"}
```

---

## 🧪 Alembic Migrations

```bash
# Generate a migration from model changes
alembic revision --autogenerate -m "add_new_column"

# Apply all pending migrations
alembic upgrade head

# Roll back one step
alembic downgrade -1

# View full migration history
alembic history --verbose

# Show currently applied revision
alembic current
```

---

## 📐 Design System Tokens

```css
/* Light mode (default) */
:root {
  --primary:       #5352ed;
  --primary-hover: #3c3bcf;
  --primary-light: #eef2ff;
  --bg:            #f0f3fb;
  --surface:       #ffffff;
  --surface-2:     #f8faff;
  --border:        #e4e9f2;
  --sidebar-bg:    #1a1b3a;
  --text-1:        #1e2235;
  --text-2:        #5a637a;
  --text-3:        #9aa3bb;
  --success:       #2ed573;
  --danger:        #ff4757;
  --warning:       #ffa502;
  --font-display:  'Plus Jakarta Sans', sans-serif;
  --font-body:     'Outfit', sans-serif;
}

/* Dark mode — toggled via html[data-theme="dark"] */
html[data-theme="dark"] {
  --bg:      #0d0f1e;
  --surface: #161828;
  --text-1:  #e8ecf8;
  --border:  #252a45;
}
```

Dark mode is toggled by `AuthContext.setDark(true/false)` and persisted in `localStorage` as `cq_dark`.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to GitHub: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with ❤️ by the Curio team · All times displayed in **IST (UTC+5:30)**
