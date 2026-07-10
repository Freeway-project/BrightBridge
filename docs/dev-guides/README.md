# CourseBridge Developer Guides

This directory contains key documentation guides for engineers onboarding onto the CourseBridge repository.

## Table of Contents

1.  [**System Architecture Guide**](file:///mnt/data/projects/BrightBridge/docs/dev-guides/architecture.md) — ([**PDF Version**](file:///mnt/data/projects/BrightBridge/docs/dev-guides/architecture.pdf))
    *   System Overview & Purpose
    *   Monorepo Package Structure
    *   Workflow Lifecycle State Machine (Diagrams, Transition Rules, Grouping, Ball-in-Court)
    *   3-Layer Access Control Model (Global Roles, Organizational Hierarchy, Case Assignments, PBAC)
    *   Database Schema (ERD Diagram & Tables Breakdown)
    *   Integrations (OIDC and Magic Link Auth, Realtime notifications, Cloudflare R2, Provost AI Assistant, Sentry)
2.  [**Credentials & Access Management Guide**](file:///mnt/data/projects/BrightBridge/docs/dev-guides/credentials.md) — ([**PDF Version**](file:///mnt/data/projects/BrightBridge/docs/dev-guides/credentials.pdf))
    *   Environment Configurations (.env.local, .env.mirror, .env.prod)
    *   Keys, Secrets, and database connections (local Docker, dev Supabase, prod Supabase)
    *   Contact Directory & Access Request Protocol for Okanagan College IT/SysAdmins
    *   Global and Assignment Role Permission Matrix
3.  [**Local Dev Environment Setup Guide**](file:///mnt/data/projects/BrightBridge/docs/dev-guides/local-dev-setup.md)
    *   System Prerequisites & Docker Configuration
    *   Quick Start Bootstrap Setup
    *   Showcase Login Profiles & Development Bypass
    *   Troubleshooting Connection Port or Credentials Issues

---

## PDF Compilation

The PDFs are auto-generated from their Markdown equivalents using a custom Python ReportLab compilation script. If you modify any Markdown documentation file, you should recompile the PDFs to keep them in sync.

### Prerequisites

The python compilation script requires `reportlab`, which is already installed on the host environment. If you need to install it on a new development environment, run:

```bash
pip install reportlab
```

### Running compilation

To compile the Markdown files into PDFs, run the following command from the repository root:

```bash
python3 docs/dev-guides/generate_pdf.py
```

This will read `architecture.md` and `credentials.md` and rewrite `architecture.pdf` and `credentials.pdf` in this directory.
