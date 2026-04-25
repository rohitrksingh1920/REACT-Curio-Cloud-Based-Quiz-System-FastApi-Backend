# 🎓 Curio — Cloud Quiz Platform

> A full-stack cloud-based quiz management system built with **FastAPI** (backend) and **React + Vite** (frontend). Supports role-based access for **Admins**, **Teachers**, and **Students** with real-time analytics, leaderboards, and notifications.

---

## 📁 Project Structure

```
REACT CCBQS/
├── alembic/                    # Database migration scripts
│   └── versions/
├── alembic.ini                 # Alembic configuration
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic Settings (reads .env)
│   │   │   ├── database.py     # SQLAlchemy engine + session
│   │   │   ├── email.py        # SMTP OTP sender
│   │   │   ├── security.py     # JWT + password hashing
│   │   │   └── blacklist.py    # Token blacklist (optional)
│   │   ├── models/
│   │   │   ├── user.py         # User, UserRole enum
│   │   │   ├── quiz.py         # Quiz, Question, Option, Enrollment
│   │   │   ├── attempt.py      # QuizAttempt, AttemptAnswer
│   │   │   └── notification.py # Notification model
│   │   ├── routers/
│   │   │   ├── auth.py         # /api/auth/*
│   │   │   ├── dashboard.py    # /api/dashboard/*
│   │   │   ├── quiz.py         # /api/quizzes/*
│   │   │   ├── analytics.py    # /api/analytics
│   │   │   ├── leaderboard.py  # /api/leaderboard/*
│   │   │   ├── notifications.py# /api/notifications/*
│   │   │   ├── settings.py     # /api/settings/*
│   │   │   └── admin.py        # /api/admin/*
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── quiz.py
│   │   │   └── misc.py
│   │   ├── main.py             # FastAPI app entry point
│   │   └── seed.py             # Demo data seeder
│   ├── Dockerfile
│   ├── requirements.txt
│   └── venv/
├── ccbqs/             
│   ├── src/
│   │   ├── api/index.js        # All API calls
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── ToastContext.jsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.jsx
│   │   │   │   ├── Sidebar.jsx + .css
│   │   │   │   └── TopHeader.jsx + .css
│   │   │   ├── quiz/
│   │   │   │   └── QuizCard.jsx
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
│   │   ├── styles/global.css   # Full design system
│   │   ├── App.jsx             # Router + providers
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── frontend/                   # ← Built output (served by Nginx)
├── nginx/
│   └── cloudquiz.conf          # Nginx config
├── docker-compose.yml
├── .env                        # Secrets (never commit)
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

# 2. Copy and fill in your .env
cp .env.example .env
# Edit .env — set SMTP_USER, SMTP_PASS, SECRET_KEY

# 3. Build the React frontend first
cd frontend-react
npm install
npm run build        # outputs to ../frontend/
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
source backend/venv/bin/activate   # Windows: backend\venv\Scripts\activate
pip install -r backend/requirements.txt

# Set env vars
export DATABASE_URL="postgresql://curio_user:localdevpass@localhost:5432/curio_db"
export SECRET_KEY="dev-secret-min-32-chars-change-me"

# Run migrations + seed
alembic upgrade head
python -m backend.app.seed

# Start backend
uvicorn backend.app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend-react
npm install
npm run dev      # Vite dev server on http://localhost:5173
                 # proxies /api → http://localhost:8000
```

---

## 🔑 Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@projexi.com | admin1234 |
| **Teacher** | rohitrk.singh1920@gmail.com | rohit1234 |
| **Student** | alice@example.com | student123 |
| **Student** | bob@example.com | student123 |

---

## 🌐 API Reference

Base URL: `http://localhost:8000`

Interactive docs: [`/docs`](http://localhost:8000/docs) (Swagger UI)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/signup` | Register new student | Public |
| POST | `/api/auth/login` | Login → JWT | Public |
| GET  | `/api/auth/me` | Get current user | Bearer |
| POST | `/api/auth/forgot-password` | Send OTP | Public |
| POST | `/api/auth/reset-password` | Reset with OTP | Public |
| GET  | `/api/dashboard/stats` | Dashboard KPIs | Bearer |
| GET  | `/api/dashboard/active-quizzes` | Active quiz list | Bearer |
| GET  | `/api/dashboard/upcoming-quizzes` | Upcoming quiz list | Bearer |
| GET  | `/api/quizzes` | List quizzes (role-filtered) | Bearer |
| POST | `/api/quizzes` | Create quiz | Teacher+ |
| GET  | `/api/quizzes/{id}` | Quiz detail | Bearer |
| PATCH| `/api/quizzes/{id}` | Update quiz | Teacher+ |
| DELETE | `/api/quizzes/{id}` | Delete quiz | Teacher+ |
| GET  | `/api/quizzes/{id}/take` | Quiz for student (no answers) | Bearer |
| POST | `/api/quizzes/{id}/submit` | Submit answers | Bearer |
| POST | `/api/quizzes/{id}/enroll` | Enroll students | Teacher+ |
| GET  | `/api/analytics` | User analytics | Bearer |
| GET  | `/api/leaderboard/{id}` | Quiz leaderboard | Bearer |
| GET  | `/api/notifications` | List notifications | Bearer |
| PATCH| `/api/notifications/{id}/read` | Mark read | Bearer |
| POST | `/api/notifications/mark-all-read` | Mark all read | Bearer |
| DELETE | `/api/notifications/{id}` | Delete notification | Bearer |
| GET  | `/api/settings/profile` | Get profile | Bearer |
| PATCH| `/api/settings/profile` | Update profile | Bearer |
| POST | `/api/settings/profile/avatar` | Upload avatar | Bearer |
| POST | `/api/settings/security/request-otp` | Send OTP | Bearer |
| POST | `/api/settings/security/verify-otp` | Verify OTP + change pw | Bearer |
| POST | `/api/settings/security/change-password` | Direct password change | Bearer |
| PATCH| `/api/settings/notifications` | Update notif prefs | Bearer |
| GET  | `/api/admin/users` | List all users | Admin |
| GET  | `/api/admin/users/students` | List students | Teacher+ |
| PATCH| `/api/admin/users/{id}/role` | Change role | Admin |
| PATCH| `/api/admin/users/{id}/activate` | Toggle active | Admin |
| DELETE | `/api/admin/users/{id}` | Delete user | Admin |

---

## ⚙️ Environment Variables (`.env`)

```env
#  Database 
DATABASE_URL=postgresql://curio_user:localdevpass@localhost:5432/curio_db

#  Auth 
SECRET_KEY=your-secret-key-min-32-characters-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

#  App 
APP_NAME=Curio
APP_VERSION=1.0.0
DEBUG=True
ENVIRONMENT=development
FRONTEND_ORIGINS=["http://localhost","http://localhost:5173","http://localhost:80"]

#  Email (optional — needed for OTP password reset) 
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_gmail_app_password   # Generate at myaccount.google.com → Security → App Passwords
EMAILS_FROM_NAME=Curio
```

> **Note:** If SMTP is not configured, password reset via OTP will return a 503. Use the "Change Password" (current password) flow instead.

---

## 🎨 Frontend Tech Stack

| Library | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| React Router | 6.x | Client-side routing |
| Recharts | 2.x | Analytics charts |
| Vite | 5.x | Build tool + dev server |
| Remix Icons | 3.5 | Icon set |
| Google Fonts | Plus Jakarta Sans, Outfit | Typography |

**No Tailwind, no MUI** — uses a custom CSS design system with CSS variables for theming (light/dark mode).

---

## 🛡️ Role-Based Access

| Feature | Student | Teacher | Admin |
|---|---|---|---|
| View assigned quizzes | ✅ | ✅ | ✅ |
| Take quiz | ✅ | ✅ | ✅ |
| Create quiz | ❌ | ✅ | ✅ |
| Delete quiz | ❌ | ✅ (own) | ✅ |
| View analytics | ✅ (own) | ✅ (own) | ✅ |
| View leaderboard | ✅ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Change user roles | ❌ | ❌ | ✅ |

---

## 🔧 Maintenance Scripts

```bash
# Update app (git pull + migrate + reload)
chmod +x update.sh && ./update.sh

# Backup database
chmod +x backup.sh && ./backup.sh
# Backups saved to: /home/ubuntu/curio/backups/

# Restore a backup
gunzip < backups/curio_20260415_120000.sql.gz | \
  PGPASSWORD='localdevpass' psql -h localhost -U curio_user -d curio_db
```

---

## 🐳 Docker Details

```bash
# View logs
docker compose logs -f backend
docker compose logs -f nginx

# Rebuild after code changes
docker compose up --build -d

# Access DB shell
docker exec -it curio_db psql -U curio_user -d curio_db

# Run migrations manually
docker exec curio_backend alembic upgrade head

# Re-seed database
docker exec curio_backend python -m backend.app.seed
```

---

## 📦 Building for Production

```bash
# 1. Build React app
cd frontend-react
npm run build          # → outputs to REACT CCBQS/ccbqs/

# 2. Update .env for production
#    - Set DEBUG=False
#    - Set ENVIRONMENT=production
#    - Use a strong SECRET_KEY (32+ chars)
#    - Set real SMTP credentials

# 3. Deploy with Docker
docker compose -f docker-compose.yml up --build -d
```

---

## 🧪 Running Alembic Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "add_some_column"

# Apply all migrations
alembic upgrade head

# Roll back one step
alembic downgrade -1

# View migration history
alembic history --verbose
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m "feat: add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with ❤️ by the Rohit.
