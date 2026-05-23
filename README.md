# 💰 Finance Ops Console

A modern finance operations dashboard built for e-commerce and marketplace businesses to manage revenue reporting, CSV ingestion, payout reconciliation, accounting period close workflows, and audit tracking.

This platform is focused specifically on **finance operations, reporting, and reconciliation workflows** — it is **not** a full ERP system.

Designed with scalable architecture and operational efficiency in mind, the application supports both mock-data development environments and PostgreSQL-backed production workflows.

---

# 🌐 Overview

Finance Ops Console provides operational finance tooling for businesses handling:

- Marketplace sales reporting
- Refund and fee tracking
- Payout reconciliation
- Accounting period management
- Import validation pipelines
- Financial audit logging

The platform is designed to simulate and support real-world finance operations workflows used in high-volume e-commerce environments.

---

# 🏢 Enterprise Context

This system is designed around operational finance workflows commonly used in large-scale e-commerce and marketplace businesses.

It reflects production-style tooling patterns used for:
- Revenue tracking
- Marketplace reconciliation
- Financial reporting
- Audit and compliance visibility
- Internal operational finance processes

The architecture emphasizes scalability, modularity, and structured financial data processing.

---

# ✨ Features

## 📊 Finance Dashboard
- Revenue KPIs
- Refund analytics
- Platform fee breakdowns
- Trend visualization
- Marketplace performance tracking

## 🧾 Orders & Refunds
- Searchable finance tables
- Advanced filtering
- CSV export support
- Refund and fee visibility

## 📥 Data Import System
Supports importing:
- Orders
- Payments
- Refunds
- Marketplace fees
- Bank transactions

Compatible with:
- CSV files
- Spreadsheet-based imports

## 🔄 Reconciliation Engine
- Match marketplace payouts to bank deposits
- Reconciliation workflows
- Variance visibility
- PostgreSQL-backed matching system

## 📅 Period Close Workflows
- Lock accounting periods
- Prevent unauthorized changes
- Track close actions with audit logging

## 📜 Audit Trail System
- Field-level change tracking
- Import history
- Adjustment logging
- User activity visibility

---

# ⚙️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 6, Tailwind CSS, Recharts |
| Backend API | Node.js 22, Express |
| Database | PostgreSQL 16 (optional) |
| Deployment | Firebase Hosting + Cloud Functions (optional) |

---

# 🚀 Quick Start (Mock Data Mode)

No database is required for development or demo usage.

## Install dependencies

```bash
npm install
npm run setup
```

## Start development environment

```bash
npm run dev
```

---

## Local URLs

| Service | URL |
|---------|-----|
| Web UI | http://localhost:5173 |
| API | http://localhost:3001 |

---

# 🐘 Local PostgreSQL Development

## Start PostgreSQL with Docker

```bash
docker compose up -d
```

---

## Configure server environment

```bash
cp server/.env.example server/.env
```

Set:

```env
DATABASE_URL=postgresql://erps:erps@localhost:5432/erps
```

---

## Run migrations

```bash
npm run db:migrate --prefix server
```

---

## Start application

```bash
npm run dev
```

---

# 🔓 Enable Reconciliation UI (Optional)

```bash
cp client/.env.example client/.env
```

Set:

```env
VITE_ENABLE_RECONCILIATION=true
```

---

# 📜 Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Run API + frontend dev servers |
| `npm run setup` | Install server/client dependencies |
| `npm run build` | Production frontend build |
| `npm run start` | Start API only |
| `npm run db:migrate --prefix server` | Apply database migrations |
| `npm run validate:imports --prefix server` | Validate import templates |

---

# 🧠 Architecture Overview

## 📦 Frontend Layer
- React SPA powered by Vite
- Modular dashboard components
- Recharts-based financial visualizations
- Responsive finance UI workflows

## 🔌 Backend API
- Express.js REST API
- Finance ingestion pipelines
- Reconciliation logic
- Audit logging workflows

## 🗄️ Data Layer
- PostgreSQL-backed reconciliation support
- Mock dataset fallback system
- Migration-driven schema management

---

# 📂 Project Structure

```text
├── client/          React SPA (Vite)
├── server/          Express API (+ Firebase Functions entry)
├── server/db/       PostgreSQL schema and migrations
├── docker-compose.yml
└── firebase.json    Optional Firebase deployment config
```

---

# 🔄 Finance Workflow Coverage

The system supports operational workflows including:

- Marketplace order imports
- Revenue tracking
- Refund reconciliation
- Fee classification
- Bank payout matching
- Accounting period locking
- Audit visibility

---

# 🌩️ Firebase Deployment (Optional)

## Deployment Steps

1. Create Firebase project
2. Enable Hosting + Functions
3. Configure `.firebaserc`
4. Set environment variables
5. Deploy:

```bash
npm run build
firebase deploy
```

---

# 🔐 Environment Variables

## Server (`server/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `USE_MOCK_FINANCE` | Force mock mode |
| `CORS_ORIGINS` | Allowed production origins |
| `PORT` | API port |

---

## Client (`client/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_ENABLE_RECONCILIATION` | Enable reconciliation UI |
| `VITE_API_BASE_URL` | Production API URL |

---

# 📊 Mock Data Support

The platform supports two modes:

## Demo Mode
- No database required
- Uses generated sample finance data
- Ideal for demos and development

## Production Mode
- PostgreSQL-backed reconciliation
- Persistent financial records
- Full audit logging support

---

# 🎯 Purpose

Finance Ops Console was built to demonstrate:

- Enterprise finance dashboard architecture
- Data ingestion systems
- Reconciliation workflow design
- Audit-compliant operational tooling
- Scalable React + Node.js architecture

---

# 📄 License

## 🔒 Proprietary Portfolio License

Copyright © 2026. All rights reserved.

This software is proprietary and confidential.

No part of this repository may be copied, modified, distributed, sublicensed, or used for commercial purposes without explicit written permission from the author.

This includes:
- Financial workflow systems
- Dashboard architecture
- Reconciliation logic
- Audit trail structure
- Data ingestion pipelines
- UI/UX implementations

Permission is granted only for:
- Portfolio review
- Technical evaluation
- Recruiter assessment

Unauthorized use is strictly prohibited.

---

# 👨‍💻 Author

Saed Nour

Specialized in:
- Enterprise dashboard systems
- Finance operations tooling
- Full-stack architecture
- Data processing pipelines
- Workflow-driven React applications

---

# 🚀 Project Goal

Finance Ops Console demonstrates how modern finance operations platforms handle ingestion, reconciliation, reporting, and audit workflows in scalable e-commerce and marketplace environments.