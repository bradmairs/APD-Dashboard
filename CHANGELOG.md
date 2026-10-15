# Changelog

Versioning: releases are numbered `X.YY`. A small change or fix bumps the last
digit (1.0 -> 1.01); a larger or more significant update bumps the tenth
(1.01 -> 1.1). `package.json` uses the matching semver (1.01 = 1.0.1,
1.1 = 1.1.0). The current version is in `VERSION`.

## 1.01 - 2026-10-15

- Renamed the app to "APD Project Management Dashboard" (login page, dashboard header, browser tab, 2FA issuer, digest emails, README, package names)

## 1.0 - 2026-10-15

First release of the GVW deployment. Single-organisation build of the APD
Project Management Dashboard (feature set as of its release 1.22), with:

- Projects, tasks (recurring, portfolio-wide, templates) and the full set of project registers (risks, actions & decisions, RFIs, defects, variations, delays, EOT claims, cash flow, milestones, payment claims, contracts, subcontractors, permits, insurance & warranties, stakeholders, meeting minutes, correspondence, documents, SQE, safety inspections, environmental monitoring, site visits & photos, training, toolbox talks, lessons learned, enquiries, tenders, performance reviews, commissioning & handover)
- Dashboard with project health, alerts, Today & Upcoming, charts, ranked global search, CSV import/export, monthly and closeout reports
- Users and roles (Admin / Member / Viewer), optional two-factor authentication, email digest, optional self-hosted AI assistant
- Docker Compose deployment with all data stored under `./data/`
