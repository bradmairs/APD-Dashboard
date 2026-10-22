# Changelog

Versioning: releases are numbered `X.YY`. A small change or fix bumps the last
digit (1.0 -> 1.01); a larger or more significant update bumps the tenth
(1.01 -> 1.1). `package.json` uses the matching semver (1.01 = 1.0.1,
1.1 = 1.1.0). The current version is in `VERSION`.

## 1.2 - 2026-10-22

- Site visits: "Notes" is now **Site Visit Purpose** and "Discussion Notes" is now **Site Visit Notes**; new **Site Visit Outcomes and Actions** field; photos can be taken or added straight from the Log/Edit Site Visit form
- New **TRIM Links** tab on the dashboard: shared TRIM links grouped by category, plus every project's TRIM folder
- New project fields: **TRIM Folder** and **Consultant**
- Project sections with more than 5 items can be collapsed/expanded, with **Expand all / Collapse all** on each tab (remembered per section)
- Today & Upcoming can be filtered by project manager; the choice is saved to your account
- Contracts: "PO Value" is now **PO Number**, a reference rather than a dollar amount (existing values kept)
- New **Procurement** tab on each project: Tenders (moved from Budget & Contract), Tender Submissions & Assessment, and a Procurement Checklist with a one-click standard checklist

## 1.11 - 2026-10-15

- New **Project Number** field on the New/Edit Project form, shown on the project page, monthly and closeout reports, the dashboard project list and CSV export, and included in search

## 1.1 - 2026-10-15

- Cash flow: one-click **Mark as actual** / **Mark as forecast** on each entry switches it in place, keeping its amount (with undo), instead of needing a new entry
- New **Tool Suggestions** page (button next to Lessons Learned) where anyone can suggest new features and improvements; admins set status and reply
- Project Manager is now picked from a dropdown of users (defaulting to the creator) and linked to that account; existing projects are linked automatically where the name matches exactly one user
- Notifications (the bell and the email digest) now only cover the signed-in user's own projects, plus portfolio-wide tasks
- Project "Jump to" links now stop with the section just below the sticky header instead of scrolling it underneath
- Meeting minutes Type is now a dropdown with more options (General Meeting, Workshop, Risk Workshop, PCG, Steering Committee, Pre-start and more) plus "Other…" for anything else

## 1.0 - 2026-10-15

First release of the GVW deployment. Single-organisation build of the APD
Project Management Dashboard (feature set as of its release 1.22), with:

- Projects, tasks (recurring, portfolio-wide, templates) and the full set of project registers (risks, actions & decisions, RFIs, defects, variations, delays, EOT claims, cash flow, milestones, payment claims, contracts, subcontractors, permits, insurance & warranties, stakeholders, meeting minutes, correspondence, documents, SQE, safety inspections, environmental monitoring, site visits & photos, training, toolbox talks, lessons learned, enquiries, tenders, performance reviews, commissioning & handover)
- Dashboard with project health, alerts, Today & Upcoming, charts, ranked global search, CSV import/export, monthly and closeout reports
- Users and roles (Admin / Member / Viewer), optional two-factor authentication, email digest, optional self-hosted AI assistant
- Docker Compose deployment with all data stored under `./data/`
- Named "Project Management Dashboard", with "Asset & Project Delivery" as the dashboard header subtitle
