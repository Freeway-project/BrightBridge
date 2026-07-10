# CourseBridge Teammate Guide: Local Dev Setup

This guide provides instructions on how to stand up a fully functional local development stack on your machine (specifically tailored for Windows/WSL2, macOS, and Linux).

---

## 1. Prerequisites

Before running the setup, ensure you have the following installed:

1.  **Docker Desktop** (or Docker Engine on Linux)
    *   *Windows Users*: Configure Docker Desktop to use the **WSL2 backend**.
    *   *Linux Users*: Ensure your account is added to the `docker` group (`sudo usermod -aG docker $USER`, then re-login) so you can run Docker commands without `sudo`.
2.  **Node.js v20+** and **npm**
3.  **Git**

---

## 2. Quick Start Bootstrap

We provide a fully automated cross-platform setup script that provisions the Postgres container, pulls a fresh production database dump (if you have production access), restores it to your container, applies the latest migrations, seeds test accounts, and configures your local environment.

Run the following commands from the repository root:

```bash
# 1. Install dependencies
npm install

# 2. Run the bootstrapper
npm run dev:setup
```

### What the Setup Script Does:
1.  **Validates Docker**: Verifies that the Docker daemon is running.
2.  **Launches Postgres Container**: Runs a `postgres:17-alpine` container mapped to port `5433` (saving conflict with any local postgres on port 5432).
3.  **Restores Prod Data (Optional)**: If you have production DB access configured in `.env.mirror` or `.env.prod`, it automatically takes a fresh production database dump and restores it to your container.
4.  **Runs Migrations**: Updates your local database schema to match the current branch commits.
5.  **Seeds Test Credentials**: Unlocks showcase test users with the default password `Dev1234!`.
6.  **Configures Environment**: Creates a local `apps/web/.env.local` file with the correct database connection string, session secret keys, and activates the local developer bypass switcher.
7.  **Launches Next.js Dev Server**: Spins up the Turborepo dev runner.

---

## 3. Showcase Sign-in Accounts

Once `npm run dev:setup` completes and the app is running on [http://localhost:3000](http://localhost:3000), you can log in directly using these showcase credentials:

*   **Super Admin**: `superadmin@coursebridge.dev` / Password: `Dev1234!`
*   **Full Admin**: `admin@coursebridge.dev` / Password: `Dev1234!`
*   **TA / Staff**: `ta@coursebridge.dev` / Password: `Dev1234!`

In development mode, you can also use the **floating role switcher panel** in the bottom-right corner of the browser to instantly toggle between user identities and test cross-role permissions.

---

## 4. Troubleshooting

*   **Docker Daemon Error**: "Docker daemon is not running..."
    *   *Fix*: Ensure Docker Desktop is active. Under Windows/WSL2, make sure Docker integration is enabled for your active WSL2 distribution under *Settings -> Resources -> WSL Integration*.
*   **Port 5433 Bound**: "port is already allocated..."
    *   *Fix*: Another service is already using port 5433. Stop any existing postgres container or change the host port mapping inside [docker-compose.yml](file:///mnt/data/projects/BrightBridge/docker-compose.yml).
*   **No Prod DB Access**: "⚠️ No production database credentials found..."
    *   *Expected behavior*: If you do not have production DB credentials, the script will skip the restore stage. The database will be created as a clean, schema-only instance. You can still register/sign in or ask a teammate to share a `.dump` backup and place it in the `backups/` folder, then manually run:
        ```bash
        RESTORE_DATABASE_URL=postgresql://coursebridge_user:localdev@localhost:5433/coursebridge scripts/restore-db-backup.sh backups/<file>.dump
        ```
