# Changelog

Versioning: releases are numbered `X.YY`. A small change or fix bumps the last
digit (1.0 -> 1.01); a larger or more significant update bumps the tenth
(1.01 -> 1.1). `package.json` uses the matching semver (1.01 = 1.0.1,
1.1 = 1.1.0). The current version is in `VERSION`.

## 1.41 - 2026-10-30

- Long-text boxes are now true formatted editors: bold, italic, underline and bullet/numbered lists show in the box as you type (no `**` symbols); pasted text comes in without outside styling
- Meeting minutes **PDF** button on every meeting; the PDF keeps the formatting (bold, italic, underline, bullets, numbering)
- One-line previews, the monthly report workbook and search results show formatted fields as clean text

## 1.4 - 2026-10-30

- Long lists in a project (more than 5 items) show 5 with a **Show more** button; charts and totals always show. Cash Flow shows the 5 months nearest today when shortened. **Expand all / Collapse all** per tab, remembered per section
- The project **Jump to** row now stays pinned under the header while scrolling
- **TRIM Link** on each payment claim
- All cost inputs are labelled **($, Excl. GST)**
- Dashboard **TRIM & GVW Links** tab: click a link's title to open it (web addresses work with or without https://); new **General GVW Links** section for things like GVW's design guidelines
- The main dashboard remembers your last view (tab and Projects filters) on your account
- Formatting toolbar (bold, italic, underline, bullet and numbered lists) on meeting minutes and other long-text fields, shown formatted everywhere

## 1.3 - 2026-10-29

- New **Monthly Reporting** tab on every project, laid out exactly like the Monthly Report tab of the GVW monthly report workbook, with its formulas recalculating live (replaces the old Monthly Reports panel; existing reports carry over)
- New months fill themselves from the project (details, status, milestones, cash flow, risks, tasks) and carry everything else on from the previous month; **Refresh from project** re-runs it
- Upload the project's .xlsm to import its current month and Reporting Log history; **Write to workbook** writes a month back into the real file (macro, formats and formulas untouched) and can log it on the Reporting Log
- SharePoint sync through Microsoft Graph (link the project's workbook in Project Monthly Reports, pull and push); needs an app registration, see README

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
