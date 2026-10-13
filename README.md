# Tipped — TIP Manila Campus Incident Reporting System

Tipped is a campus incident reporting system for TIP Manila. Students, staff, and guests can submit reports, while authorized department staff and administrators review and manage incidents in a role-scoped queue.

## Features

- Authenticated and guest incident reporting
- Automatic department routing based on issue-category mappings
- Report status tracking and real-time updates
- Image attachments
- Role-based access for users, department staff, administrators, and superadmins

## Tech stack

- **Frontend:** React 19, Vite, React Router, Tailwind CSS, Axios, Lucide React, and Socket.IO Client
- **Backend:** Node.js, Express 5, Socket.IO, and Mongoose
- **Database:** MongoDB
- **Authentication:** JWT, bcrypt, and Google OAuth

The frontend and backend are separate npm projects, each with its own `package.json` and lockfile.

## Prerequisites

- Git
- Node.js and npm
- A MongoDB instance, local or hosted

## Local setup

### 1. Configure the backend

From the repository root, create `backend/.env` using the example:

```powershell
Copy-Item backend\.env.example backend\.env
```

Set at least these values in `backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/tipped
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long
```

`PORT` defaults to `5000`; `NODE_ENV` defaults to development. The application exits during startup if `MONGO_URI` is empty or `JWT_SECRET` is shorter than 32 characters.

### 2. Install and start the backend

```bash
cd backend
npm ci
npm run dev
```

The API and Socket.IO server run on `http://localhost:5000` by default. Use `npm start` to start the backend without Node's watch mode. Run backend tests with `npm test`.

### 3. Install and start the frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Vite serves the app at `http://localhost:3000` and proxies `/api` requests to `http://localhost:5000`. The frontend also provides `npm run build`, `npm run lint`, and `npm run preview`.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | JWT signing secret; at least 32 characters |
| `PORT` | No | Backend port; defaults to `5000` |
| `NODE_ENV` | No | Runtime environment |
| `CORS_ORIGINS` / `FRONTEND_URL` | No | Allowed frontend origins; local defaults include ports `3000` and `5173` |
| `GOOGLE_CLIENT_ID` | For Google sign-in | Backend accepted Google OAuth client ID(s), comma-separated |
| `VITE_GOOGLE_CLIENT_ID` | No | Frontend Google OAuth client ID override |
| `VITE_SOCKET_URL` | No | Socket.IO URL override; defaults to the backend in development |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | For Cloudinary image hosting | Cloudinary credentials |
| `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | For email delivery | SMTP account credentials and optional sender address |
| `TRUST_PROXY_HOPS` | Deployment-dependent | Proxy hop count when hosted behind a reverse proxy |

Additional optional backend rate-limit and archive-cleanup settings are read from environment variables. See `backend/.env.example` and `backend/middleware/rateLimiters.js` for available defaults.

## Incident routing

Reports select an issue category. The backend looks up the category in MongoDB and uses its configured department mapping to assign the report. Department records provide the ticket-ID prefix. If no category or department mapping matches, the report is assigned to **General**.

The intended category mapping is:

| Department | Example issue categories |
| --- | --- |
| Maintenance | Comfort Room & Hygiene; Water & Plumbing; Electrical & Sockets; Air Conditioning & Ventilation; Broken Furniture & Fixtures |
| ITSO | Wi-Fi & Connectivity; Lab Computers & Peripherals; Projectors & Audio/Visual |
| SOHAS | Security or Suspicious Activity; Medical or Safety Hazard |
| Canteen | Food Quality or Hygiene |
| OSA | Student Altercation or Conduct; Lost & Found |
| General | Other / General Issue |

The actual routing is database-driven; these mappings must be configured in the application database. Superadmins can manage departments and categories through the admin interface.

## Project structure

```text
.
├── backend/
│   ├── config/          # Database, environment, and Cloudinary setup
│   ├── controllers/     # Authentication, report, and admin handlers
│   ├── middleware/      # Authentication, authorization, uploads, and rate limits
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express API route modules
│   ├── scripts/         # Maintenance and migration scripts
│   ├── test/            # Node.js built-in test runner tests
│   ├── utils/           # Shared backend helpers
│   ├── server.js        # Express and Socket.IO server entry point
│   └── socket.js        # Real-time event setup
├── frontend/
│   ├── src/
│   │   ├── api/         # API clients
│   │   ├── components/  # Shared UI components
│   │   ├── constants/   # Frontend constants
│   │   ├── hooks/       # Reusable React hooks
│   │   ├── pages/       # Landing, reporting, profile, dashboard, and admin views
│   │   └── utils/       # Frontend utilities
│   └── vite.config.js   # Development server and API proxy
├── docs/                # Project and campus reference documentation
└── README.md
```

## Main API route groups

- `/api/auth` — registration, login, profile, and authentication
- `/api/users` — user profile and account operations
- `/api/tickets` and `/api/reports` — report submission, tracking, and administration
- `/api/departments`, `/api/categories`, and `/api/admin-data` — department and category data
- `/api/health` — backend health check
