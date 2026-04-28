# FMIS — Financial Management Information System

> A multi-tenant, enterprise-grade Financial Management Information System built with **Laravel 13** (API) and **React 19 + Vite** (SPA frontend).

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Modules](#core-modules)
4. [Tech Stack](#tech-stack)
5. [Roles & Permissions](#roles--permissions)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [API Reference](#api-reference)
9. [Project Structure](#project-structure)

---

## Overview

FMIS is a full-stack, multi-tenant financial platform designed for organisations that need to manage money, people, and compliance in one place. Each **Tenant** (organisation) is isolated with its own users, accounts, settings, and branding. A top-level **System Admin** role manages all tenants from a dedicated dashboard.

Key capabilities at a glance:

| Domain | What it does |
|---|---|
| **Transactions** | Record income/expense with multi-step approval workflows |
| **Accounts** | Chart of accounts, fund transfers, currency support |
| **Budgets** | Department/category budgets with real-time spend tracking and threshold alerts |
| **Invoices** | Generate PDF invoices, email clients, mark as paid |
| **Debts** | Track receivables/payables with repayment schedules |
| **Recurring Bills** | Auto-generate periodic payments (pause/resume) |
| **Clients** | CRM-lite contact book linked to invoices and debts |
| **Approvals** | Configurable multi-step, role-based approval workflows |
| **Analytics** | Cash flow, income vs. expenses, forecasting, financial health score |
| **Fraud Detection** | Rule-based anomaly detection on transactions |
| **Attendance** | Check-in/check-out with GPS tracking |
| **Tasks** | Assign, track progress, and log history |
| **Audit Logs** | Immutable trail of every sensitive action |
| **Elections** | Internal voting (e.g., board elections) |
| **Reports** | Excel/PDF exports with payroll-ready sheets |
| **Offline Sync** | PWA with IndexedDB (Dexie) + server push/pull sync |

---

## Architecture

```
FMIS/
├── app/, config/, ... # Laravel 13 REST API (Root)
└── frontend/          # React 19 SPA / PWA (Subdirectory)
```

The frontend build is configured to output directly into the root `public/` folder, allowing for instant "live" updates upon build.

The frontend is a **Progressive Web App (PWA)** — it can be installed on mobile/desktop and works offline, queuing changes that sync when connectivity returns.

Communication is exclusively via a versioned REST API (`/api/v1/…`) authenticated with **Laravel Sanctum** bearer tokens.

### Multi-tenancy Model

Each database row is scoped by `tenant_id`. Every Eloquent model exposes a `scopeForTenant()` local scope that controllers use to isolate data. Tenant branding (logo, colours, favicon) is applied dynamically on the frontend via CSS variables.

---

## Core Modules

### 1. Transactions & Approval Workflow

Transactions move through a state machine:

```
draft → submitted → under_review → approved → posted
                                 ↘ rejected
```

- **WorkflowEngine** (`app/Services/WorkflowEngine.php`) drives multi-step approvals. Each step is assigned to a role and can require sequential or parallel sign-off.
- Bulk submit / bulk approve supported.
- Transactions can be reverted by authorised users.

### 2. Budgets

- Budgets are scoped by `department` and `category`.
- Real-time `spent` tracking is updated as transactions are posted.
- Configurable `alert_threshold` (%) triggers a notification when spending approaches the limit.
- Computed attributes: `variance`, `usage_percentage`.

### 3. Invoices

- Line-item invoices with tax, discount, and currency.
- PDF generation via **DomPDF** (`barryvdh/laravel-dompdf`).
- Email delivery to clients.
- Linked to a `Client` record and the underlying `Transaction`.

### 4. Fraud Detection

`FraudDetectionService` evaluates every new transaction against configurable `FraudRule` records. Violations raise `FraudAlert` records that finance managers can resolve.

### 5. Analytics

`AnalyticsController` exposes:
- **Summary** — total income, expenses, net position
- **Cash flow** — time-series data
- **Income vs. Expenses** — comparison charts
- **Trends** — rolling averages
- **Budget overview** — spend vs. allocation per budget
- **Advanced** (Director-only): productivity, forecasting, financial health score, customer insights

### 6. PWA / Offline Sync

The frontend uses **Dexie** (IndexedDB wrapper) to cache data locally. A `syncService` listens for connectivity changes and flushes queued writes via `POST /api/v1/sync/push-changes`.

### 7. Elections

A lightweight internal voting module supporting: initiate election → cast vote → view results history. Useful for cooperative or board-level governance.

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Framework | Laravel 13 (PHP 8.3) |
| Auth | Laravel Sanctum (token-based) |
| Permissions | `spatie/laravel-permission` |
| PDF Export | `barryvdh/laravel-dompdf` |
| Excel Export | `maatwebsite/excel` |
| Image Handling | `intervention/image-laravel` |
| Cache / Queue | Database driver (Redis optional) |
| Database | MySQL (`fmis_db`) |
| Email | SMTP via Gmail |

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 4 |
| State | Zustand (persisted) |
| Routing | React Router 7 |
| HTTP | Axios |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Offline DB | Dexie (IndexedDB) |
| i18n | i18next |
| Maps | @react-google-maps/api |
| PWA | vite-plugin-pwa |
| UI Icons | Lucide React + Heroicons |

---

## Roles & Permissions

Roles are managed by **Spatie Laravel Permission**. The seniority hierarchy is:

| Role | Seniority | Key Permissions |
|---|---|---|
| `system-admin` | 3 | manage-tenants, all permissions |
| `director` | 3 | view-analytics (advanced), manage-workflows |
| `tenant-admin` | 3 | manage-users, manage-settings, manage-workflows |
| `manager` | 2 | manage-invoices, manage-budgets, manage-debts, resolve approvals |
| `staff` | 1 | create transactions, check-in/out, view own data |

---

## Getting Started

### Prerequisites

- PHP 8.3+, Composer
- Node.js 20+, npm
- MySQL 8+

### Initial Setup

```bash
# Install backend dependencies
composer install

# Install frontend dependencies
npm run frontend:install

# Run setup (includes migrations and key generation)
composer run setup
```

### Development

Run the full system (Backend + Frontend) concurrently:

```bash
npm run dev
```
*This command starts the Laravel server, queue worker, and the React dev server (via Vite).*

### Production Build

To build the frontend and make it "live" inside the Laravel public folder:

```bash
npm run build
```

---

## Environment Variables

Key variables in `.env`:

```env
APP_NAME=FMIS
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_DATABASE=fmis_db
DB_USERNAME=fmis_user
DB_PASSWORD=...
```

---

## Project Structure

```
FMIS/
├── app/                       # Laravel Controllers, Models, Services
├── bootstrap/                 # Laravel Bootstrap
├── config/                    # Laravel Configuration
├── database/                  # Migrations and Seeders
├── frontend/                  # React 19 SPA (Subdirectory)
│   ├── src/                   # React components, stores, hooks
│   ├── package.json           # Frontend dependencies
│   └── vite.config.ts         # Build config (outputs to ../public)
├── public/                    # Compiled assets and entry points
├── routes/                    # API and Web routes
├── resources/                 # Backend views and raw assets
├── package.json               # Root scripts for the entire system
└── README.md                  # Project documentation
```

---

> **Deployed at:** `http://fmis.skylinksolutions.co.tz`  
> **Maintainer:** Michael Kilunga — engineermichaelkilunga@gmail.com
