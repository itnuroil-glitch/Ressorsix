# Production Docker & Coolify Deployment Guide (AlmaLinux VPS / Hostinger)

This guide provides step-by-step instructions to deploy the **Trakio Enterprise Asset Management System** to a **Hostinger AlmaLinux VPS** using **Coolify** and a **Private GitHub Repository**.

---

## 🏗️ Created Architecture & Docker Files

The repository is now fully production-ready with full containerization:

| File / Component | Purpose |
| :--- | :--- |
| `docker-compose.yml` | Orchestrates `postgres` (database), `backend` (Node API), and `frontend` (Nginx + Expo Web). |
| `backend/Dockerfile` | Production Node.js container with dependency caching, persistent upload directories, and health checks. |
| `backend/.dockerignore` | Excludes node_modules, temp files, and logs from backend image builds. |
| `backend/src/config/initDb.js` | Auto-executes `CREATE TABLE IF NOT EXISTS` migrations and session/subject schema on startup. |
| `backend/src/utils/sessionHelper.js` | Shared user lookup, subject binding, and 15-minute opaque session cookie management. |
| `backend/src/middleware/authMiddleware.js` | Enforces server-side 15-minute opaque session cookie validation on all private API endpoints. |
| `backend/src/controllers/oidcController.js` | Implements OpenID Connect PKCE authorization code flow, `<APP_SLUG>-access` group checks, and styled 403 pages. |
| `backend/src/controllers/approvalController.js` | Implements OrbisHub Centralized Mobile Push-Approval Broker integration (PKCE, status polling proxy, ES256 JWKS verification). |
| `frontend/Dockerfile` | Multi-stage build container: compiles Expo React Native Web static export (`dist`) and packages with Nginx. |
| `frontend/nginx.conf` | Production Nginx server with SPA fallback routing, static asset caching, and `/api/` reverse-proxy to backend. |
| `frontend/.dockerignore` | Excludes build caches and local node_modules from frontend image builds. |
| `.env.example` | Template listing all required production environment variables. |

---

## ⚙️ Coolify Environment Variables Configuration

Copy and paste these environment variables into your Coolify Resource **Environment Variables** tab:

```env
# Database Configuration
POSTGRES_DB=trakio
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_db_password_here
POSTGRES_PORT=5432

# Application Base URL & Ports
APP_BASE_URL=https://your-domain.com
FRONTEND_PORT=80
BACKEND_PORT=5000

# OrbisHub-Managed Authentik SSO Configuration
APP_SLUG=asset
REQUIRED_AUTHENTIK_GROUP=asset-access

AUTHENTIK_ISSUER_URL=https://auth.orbisai.ae/application/o/asset/
AUTHENTIK_CLIENT_ID=your_authentik_client_id_here
AUTHENTIK_CLIENT_SECRET=your_authentik_client_secret_here
AUTHENTIK_REDIRECT_URI=https://your-domain.com/auth/callback

AUTHENTIK_AUTHORIZE_URL=https://auth.orbisai.ae/application/o/authorize/
AUTHENTIK_TOKEN_URL=https://auth.orbisai.ae/application/o/token/
AUTHENTIK_USERINFO_URL=https://auth.orbisai.ae/application/o/userinfo/
AUTHENTIK_LOGOUT_URL=https://auth.orbisai.ae/application/o/asset/end-session/
AUTHENTIK_OPENID_CONFIGURATION=https://auth.orbisai.ae/application/o/asset/.well-known/openid-configuration

# OrbisHub Mobile Push-Approval Broker Configuration
APPROVAL_CLIENT_ID=your_approval_client_id_here
APPROVAL_CLIENT_SECRET=SET_FROM_ORBISHUB_ADMIN_UI
APPROVAL_REDIRECT_URI=https://your-domain.com/auth/orbishub/callback
APPROVAL_ISSUER=https://hub.orbisai.ae
APPROVAL_JWKS_URL=https://hub.orbisai.ae/.well-known/jwks.json

# Security Secrets
SESSION_SECRET=your_super_secret_session_key_12345
JWT_SECRET=your_long_random_secret_jwt_key_here

# Backend Security & API
DISABLE_SMTP=false
FRONTEND_URL=*
```

---

## 🚀 Step-by-Step Deployment Instructions in Coolify

### Step 1: Connect your GitHub App in Coolify
1. Log into your Coolify Dashboard on Hostinger VPS (`http://<your-vps-ip>:3000`).
2. Go to **Sources** > **GitHub Apps** and follow the instructions to grant Coolify access to your **Private GitHub Repository**.

### Step 2: Create a New Docker Compose Resource
1. Navigate to **Projects** > Select your Project & Environment (e.g., `Production`).
2. Click **+ Add Resource** > Select **Docker Compose**.
3. Choose **Private Repository (with GitHub App)**.
4. Select your repository: `your-username/your-repo-name`.
5. Select the `main` or `master` branch.
6. Coolify will automatically detect `docker-compose.yml` in the root folder.

### Step 3: Configure Domains & Environment Variables
1. Go to the **Environment Variables** tab in Coolify and paste the variables listed above.
2. Under **Domains**, assign your production domain/subdomain (e.g., `https://asset.yourcompany.com`) to the `frontend` service (port 80).

### Step 4: Deploy
1. Click **Deploy**.
2. Coolify will build the multi-stage frontend bundle and backend container, wait for PostgreSQL health checks to pass, run database schema migrations, and launch the application.

---

## 🛡️ Maintenance & Database Backups
- **Persistent Data**: Database data is stored in the Docker volume `postgres_data`.
- **Persistent Files**: Uploaded PDFs and images are preserved in `backend_uploads` and `backend_attachments` volumes.
- **Continuous Deployment**: Any git push to your GitHub repo branch will trigger automatic seamless redeployments via Coolify webhooks.
