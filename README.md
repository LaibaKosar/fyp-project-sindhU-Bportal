# fyp-project-sindhU-Bportal
# Sindh Universities & Boards Portal 🎓

**A centralized governance and administrative platform for provincial university oversight in Sindh.**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat&logo=vercel)](https://fyp-project-sindh-u-bportal.vercel.app/)
[![React](https://img.shields.io/badge/React-19+-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)

**Live demo:** [https://fyp-project-sindh-u-bportal.vercel.app/](https://fyp-project-sindh-u-bportal.vercel.app/)

---

## 📋 Overview

### Problem Statement
University governance data is often fragmented across spreadsheets and local systems, making **oversight, compliance, and timely reporting** difficult for the **Universities & Boards (U&B)** department. This project delivers a **unified data hub** where provincial administrators can monitor **institutional readiness, staffing trends, and regional distribution** in real-time.

### Solution
A **full-stack administrative engine** that combines **role-based dashboards**, **interactive analytics**, and an **automated audit trail**. The system is powered by a **PostgreSQL** database with **Row Level Security (RLS)**, ensuring data integrity and institutional privacy.

---

## ✨ Key Features

- **Governance Command Center (Admin Hub)** High-density analytics featuring **Regional Distribution Charts**, **University Readiness Donut Charts**, and **Staff vs. Faculty** resource parity insights with human-readable ratios.

- **Intelligent Resource Insights** Automated calculation of staff-to-faculty ratios and **Gender Diversity Analytics** (Male/Female/Other) to help provincial oversight identify institutional needs.

- **University Focal Person (UFP) Portal** Secure workflows for managing campuses, faculties, departments, staff, and programs, strictly scoped to the focal person’s specific university.

- **System Audit Trail** An append-only **`system_logs`** table records critical actions (Faculty/Staff/Department creation) providing a **live activity feed** for U&B Admin oversight.

- **Role-Based Access Control (RBAC)** Secure authentication via **Supabase Auth** with dedicated permissions for **U&B_ADMIN** and **UFP** roles, enforced at both the application and database layers.

- **Polished Presentation UI** Built with **Tailwind CSS** for a modern aesthetic and **Framer Motion** for smooth, professional transitions and staggered data reveals.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|--------|----------------|
| **Frontend** | React, Vite, Tailwind CSS, Framer Motion |
| **Data Visualization** | Recharts (Grouped Bars, Pie/Donut Charts) |
| **Backend / BaaS** | Supabase (PostgreSQL, Auth, Realtime) |
| **Infrastructure** | Vercel (Deployment), GitHub (CI/CD) |

---

## 🏗️ System Architecture & Security

- **Database Logic**: Uses **PostgreSQL Views** (e.g., `ub_analytics_hub`) to aggregate real-time metrics across 27+ institutions without sacrificing performance.
- **Security**: **Row Level Security (RLS)** policies ensure that UFP users are strictly constrained to their institutional data, while Admins have cross-cutting read access for auditing.
- **Data Integrity**: Implemented `SECURITY DEFINER` functions in SQL to handle complex cascading deletions and authentication cleanup.

---

## 👤 Project Information
- **Developer:** Laiba Kosar
- **Academic Institution:** [Sukkur IBA University]
- **Supervisor:** Sir Ghulam Mujtaba Shaikh
- **Year:** 2026
