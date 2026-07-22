# Clientele CRM Dashboard

A task-and-workforce management dashboard, built for two roles:

- **Employees** — log in, see their profile, work through incomplete tasks, view all
  assigned tasks, mark attendance, and apply for leave.
- **Admins** — assign and update tasks, approve new account requests, approve/reject
  leave, manage the employee roster, and "switch" into any employee's dashboard to
  see exactly what they see (useful for investigating a task). A separate admin-only
  **Business Console** handles clients, projects, and an ongoing-tasks-by-employee view.

The stack is a Python/FastAPI backend (SQLAlchemy ORM with SQLite file database support for development and PostgreSQL for production) and a React (Vite) frontend.

## Project structure

```
crm-dashboard/
  backend/     FastAPI API + SQLAlchemy models
  frontend/    React (Vite) app
```

## 1. Run the backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API runs at `http://localhost:8000`. It stores everything in an SQLite database file under `backend/data/crm.db`.

A default admin account is seeded for you:

- **Username:** `admin`
- **Password:** `admin123`

## 2. Run the frontend

In a second terminal:

```bash
cd frontend
npm install         # already done if you received this pre-built
npm run dev
```

The app runs at `http://localhost:5173` and talks to the backend at
`http://localhost:8000/api` (configurable in `frontend/.env` via `VITE_API_URL`).

## How the pieces fit together

### Employee flow
1. A new hire goes to **Request an account** on the login screen and submits their
   name, department, and a username/password.
2. Their request sits in the admin's **Account requests** queue until approved.
3. Once approved, they log in and land on their dashboard: **Overview**,
   **Incomplete tasks**, **Manage all tasks**, **Attendance & leave**, and
   **Manage my profile**.
4. Tasks move `Pending → In progress → Completed` as the employee works through
   them; completed tasks drop into the completed bucket automatically.

### Admin flow
1. **Admin update task** is where tasks are created and assigned to a specific
   employee (title, description, priority, due date), and where any task's status
   or details can be edited later.
2. **Employees** lists everyone with an approved account. The **"Switch to their
   dashboard"** button opens that employee's exact task/attendance/profile view in
   read-and-adjust mode — so an admin investigating a completed or stuck task can
   see precisely what the employee sees, without logging in as them. A banner at
   the top makes it clear you're viewing someone else's dashboard, with a one-click
   way back.
3. **Account requests** and **Leave approvals** are simple approve/reject queues.
4. The **Business console** (linked from the admin overview, or at `/admin/business`)
   is a separate, admin-only dashboard for **Clients**, **Projects** (linked to a
   client and a team of employees), and **Ongoing tasks by employee** — a quick way
   to see what's in flight across the whole team.

## API overview

All endpoints are under `/api`. Auth uses a bearer JWT returned from
`POST /api/auth/login`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login` |
| Account requests | `POST /requests` (public), `GET/POST /requests/:id/approve`, `.../reject` (admin) |
| Users | `GET/PUT /users/me`, `GET /users` (admin), `GET /users/:id` (admin), `PUT /users/:id/status` (admin) |
| Tasks | `GET/POST /tasks`, `PUT /tasks/:id`, `PUT /tasks/:id/status`, `DELETE /tasks/:id` |
| Leaves | `GET/POST /leaves`, `PUT /leaves/:id/decision` (admin) |
| Attendance | `GET /attendance`, `POST /attendance/check-in` |
| Clients / Projects | `GET/POST/DELETE /clients`, `GET/POST/PUT/DELETE /projects` (admin only) |

Admin-only list/detail endpoints accept `?employeeId=...` to filter to one
employee's data — this is what powers the "switch to employee dashboard" feature.

## Moving to a real database later

Everything reads/writes through `backend/utils/db.js` (`readData(name)` /
`writeData(name, data)`), so swapping JSON files for Postgres/MongoDB later mostly
means rewriting that one file and keeping the same function signatures — the
routes themselves won't need to change much.

## Known limitations of this first pass

- Passwords are hashed (bcrypt) but there's no password-reset flow yet.
- The JSON-file store isn't safe for concurrent writes at real scale — fine for a
  small team, but plan the database migration before this grows much.
- Admins edit their own profile by editing `users.json` directly for now.
- No file/attachment support on tasks yet.

Happy to build out any of these next — just say which one.
"# xebrightech" 
"# xebrightech" 
"# xebrightech" 
"# xebrightech" 
# xebrightech
# xebrightech
