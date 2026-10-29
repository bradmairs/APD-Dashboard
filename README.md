# Project Management Dashboard

A project management dashboard for Goulburn Valley Water's Asset & Project
Delivery (APD) team. It gives Project Managers a single view of construction
projects — status, budget, key dates, and who owns what — plus a detail page
per project for tracking tasks/milestones and their due dates.

## Versioning

Releases are numbered `X.YY` (current: see `VERSION`, history in `CHANGELOG.md`).
A small update or fix bumps the last digit (1.0 -> 1.01); a larger or more
significant update bumps the tenth (1.01 -> 1.1). Each release is tagged `vX.YY`.

## Stack

- **Frontend:** React + TypeScript (Vite), Tailwind CSS
- **Backend:** Node.js + Express + TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **Runtime:** Docker Compose (three services: `frontend`, `backend`, `db`)

## Running it

```bash
cp .env.example .env
# edit .env: set JWT_SECRET to a random value, e.g. `openssl rand -base64 32`
docker compose up --build
```

- Data: everything persistent is stored in `./data/` next to `docker-compose.yml`
  (`db/` = the Postgres database, `uploads/` = attachments and photos) as bind mounts, so backing up or moving the app is just copying that folder.
  Docker creates it on first start. Upgrading from a version that used named
  volumes? Those volumes are not read any more; copy their contents into `./data/`
  (e.g. `docker run --rm -v apd-project-management-dashboard_db_data:/from -v "$PWD/data/db":/to alpine cp -a /from/. /to/`)
  before starting, or you will start with empty databases.
- Dashboard: http://localhost:8080
- API directly: http://localhost:4000/api/projects

The backend runs Prisma migrations and seeds a handful of example projects
(and demo user accounts — see **Authentication** below) automatically on
first startup, so the dashboard isn't empty.

## Local development (without Docker)

Requires Node 20+ and a local Postgres instance.

```bash
# Backend
cd backend
cp .env.example .env   # point DATABASE_URL at your local Postgres; set a real JWT_SECRET
npm install
npm run prisma:migrate:dev
npm run dev             # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173, proxies /api to backend via vite/nginx in prod
```

The Vite dev server proxies `/api` to `http://localhost:4000` (see
`frontend/vite.config.ts`), matching the nginx proxy used in the Docker build,
so `npm run dev` talks to your local backend out of the box.

### Tests and CI

`npm test` in either `backend/` or `frontend/` runs the Vitest unit tests
(`*.test.ts` next to the code) — currently the pure logic that's easiest to
get subtly wrong: budget maths (`variations.ts`), Project Health RAG
thresholds (`health.ts`), risk scoring, task due-date helpers, CSV
escaping/formula-neutralising, and search ranking. They need no database.
`.github/workflows/ci.yml` runs the tests plus a typecheck/build of both
packages on every pull request and on pushes to `main`.

## Data model (v1)

Each **Project** tracks:

- Name, description, asset type (e.g. Pipeline, Pump Station, Treatment Plant)
- Status: Planning → Design → Tender → Construction → Project Completion →
  Defects Liability → Complete (plus On Hold / Cancelled). Project
  Completion sits between Construction and Defects Liability — practical
  completion/handover has been reached, the defects liability period is
  about to start, but the project isn't administratively closed out yet
- Project Number (the organisation's own project number — optional free
  text, shown on the project page, reports and the dashboard list, and
  searchable)
- TRIM Folder (the project's records folder — a TRIM link or container
  number, shown as an "Open in TRIM" link on the project page when it's a
  web link) and Consultant (alongside Contractor)
- BP Ref. No., Project Manager, Project Director, Project Sponsor. The
  Project Manager is picked from a dropdown of active user accounts (a new
  project defaults to whoever is creating it) rather than typed, and is
  stored as a link to that user (`projectManagerId`) alongside their name —
  that link is what decides who gets the project's notifications. Projects
  from before this change were linked automatically where the typed name
  matched exactly one user; any that didn't match keep their typed name,
  shown as "(not a user)" in the dropdown until a user is picked
- Location, contractor
- Original Budget, Latest Approved Budget, vs. contract value (Contract
  Value itself isn't on the New/Edit Project form — it's set once from a
  seed/import or left blank, then only shown read-only, in the Cash Flow
  panel, Monthly/Closeout reports, and the Dashboard CSV export)
- Start date, target completion date, actual completion date

A project marked "overdue" on the dashboard means its target completion date
has passed while it's still actively in progress — Project Completion,
Defects Liability, Complete, and Cancelled projects are excluded, since
passing that date is expected by then.

Each project also has a list of **Tasks** (visible on its detail page, opened
by clicking a row): title, status (To Do / In Progress / Done), and an
optional due date. Tasks with a due date show up in the dashboard's
**Today & Upcoming** tab (see below) and in the notification bell described
below.

See `backend/prisma/schema.prisma` for the source of truth.

## Notifications

A bell icon next to the account menu — present on every page, not just the
dashboard — shows a badge with the count of items that are overdue/expired
or due/expiring within their respective windows, on **your projects only**
(those where you're the linked Project Manager — see Projects above —
plus portfolio-wide tasks, which belong to no project): tasks and open RFIs due within 7 days, and permits or
insurance/warranties expiring within 60 days. The badge is red if anything
is overdue or expired, amber if only "due soon"/"expiring soon" items
remain. Clicking it opens one merged list — tasks, permits, insurance/
warranties, and RFIs together, sorted soonest first, each tagged with its
type and linking to its project.

`frontend/src/components/NotificationBell.tsx` composes this from four
existing portfolio-wide endpoints and their existing expiry/overdue
helpers rather than adding new backend logic: `getUpcomingTasks()` (all
fetched tasks are listed, but only overdue/due-soon ones count toward the
badge, via `taskMeta.ts`'s `isTaskOverdue`/`isTaskDueSoon`),
`getAllPermits()` / `getAllInsuranceWarranties()` filtered to flagged
items only via `permitMeta.ts`'s and `insuranceWarrantyMeta.ts`'s expiry
helpers, and `getAllRfis()` filtered via `rfiMeta.ts`'s
`isRfiOverdue`/`isRfiDueSoon` — the same helpers the dashboard's
"Permits Expiring Soon", "Insurance & Warranties Expiring Soon", and
"Open RFIs" panels use, so all four stay in agreement.

There's no email/SMS delivery — this is in-app only. Nothing to configure
(no SMTP credentials needed).

## Global Search

A search box next to the account menu — present on every page, the same
"always available" placement as the notification bell — lets you find a
record by keyword without knowing which project or register it's in.
Type two or more characters and, after a short debounce, a dropdown shows
matches grouped by type, each linking straight to its project — opened on
the tab that holds that register (an RFI opens Quality & Risk, a Variation
opens Budget & Contract). Press **Ctrl+K** (**⌘K** on a Mac) from any page
to jump straight into the search box; Esc closes it.

It searches across every project-scoped register with meaningful text to
match: Projects, Tasks, Milestones, Risks & Opportunities, Actions &
Decisions, RFIs, Defects, Delays, EOT Claims, Commissioning & Handover checklist
items, Variations, Contracts, Payment Claims, Insurance & Warranties,
Permits & Approvals, Performance Reviews, Stakeholders, Meeting Minutes,
Site Visits, Community Enquiries, the Document Register, Correspondence,
Archive Links, Lessons Learned, Training Records, Toolbox Talks,
Environmental Monitoring, Safety Inspections, SQE Issues, Subcontractors,
and Tender Packages — effectively the whole dashboard, not a curated
subset of it. `GET /api/search?q=` (`backend/src/routes/search.ts`) runs
one case-insensitive `contains` query per register in parallel, fetching up
to 25 candidates each. `backend/src/searchRank.ts` then scores every
candidate (exact title > title prefix > a word starting with the query >
title substring > subtitle match > a match only in a hidden field, ties
broken by most recent), keeps each register's best 5, and orders the
registers by their best hit — so an exact RFI number surfaces first even
if five newer records also mention it. Results are still bucketed by type
for display; there's no single merged list, since "5 RFIs and 5 documents"
is more useful than one arbitrarily-mixed one.
Tasks are the one register filtered server-side beyond the text match
(`projectId: { not: null }`), since a portfolio-wide Task has no project
to link a result to.

`frontend/src/components/GlobalSearch.tsx` is self-contained like
`NotificationBell` — no props, it fetches on its own as you type — and is
wired into `UserMenu.tsx` so it appears in both the Dashboard and project
detail page headers without being wired into each page separately.

## Activity history

Every project and task change is written to an append-only `ActivityLog` —
who did what, and when. It's attributed to the logged-in user (name captured
at write time, so entries stay meaningful even if that user is later
removed), and visible in two places:

- Each project's detail page has an **Activity** panel scoped to that project
- The dashboard's **Recent Activity** panel shows the latest changes across
  every project, each linking back to its project

A deleted project's activity entries aren't deleted with it — they survive
(with a snapshot of the project's name) so there's a record that it existed
and was removed, and by whom.

## Attachments

Each project has an **Attachments** panel for drawings, contracts, and
correspondence. Files are stored on disk (not in Postgres), organized by
project under `backend/uploads/<projectId>/` — the Docker Compose setup
bind-mounts that path to `./data/uploads` (next to `docker-compose.yml`) so
uploads survive container restarts and rebuilds.

- Allowed types: PDF, Word, Excel, PowerPoint, images (PNG/JPG/GIF), CSV,
  TXT, DWG, and ZIP — anything else is rejected with a clear error
- Max file size: 20MB
- On-disk filenames are always a fresh random ID, never the name the file was
  uploaded with, so a crafted filename can't be used to overwrite another
  file or escape the upload directory
- Deleting a project deletes its attachments' files from disk too, not just
  their database rows
- Uploads and deletions are recorded in that project's Activity panel like
  any other change

## Authentication

The app requires login — every `/api/projects` and `/api/tasks` route needs a
valid session, enforced by the backend (not just hidden in the UI). Sessions
are a JWT in an httpOnly cookie, issued on `POST /api/auth/login` and checked
by `requireAuth` middleware on every protected route.

The seed script creates three demo accounts (matching the seeded projects'
project managers), all sharing one password:

| Email | Password |
|---|---|
| a.nguyen@example.com | `ChangeMe123!` |
| s.patel@example.com | `ChangeMe123!` |
| j.wilson@example.com | `ChangeMe123!` |

These are demo credentials for a starter project. Change them once you're
using the app for real — every user can do this themselves from the account
menu (top right → **Change Password**), no admin needed.

`JWT_SECRET` **must** be set to a real random value outside of local dev —
`docker compose up` will refuse to start the backend without it. Generate one
with `openssl rand -base64 32`.

### Two-factor authentication (2FA)

Every account can turn on a second sign-in step: after the password, the
login page asks for a 6-digit code from an authenticator app (Google
Authenticator, Microsoft Authenticator, Authy, 1Password, Bitwarden…). It's
opt-in per user — top right → **Two-Factor Auth** → follow the prompts:

1. Confirm your password.
2. Scan the QR code (or type the key in by hand) and enter the code the app
   shows. 2FA only switches on once a code has been verified, so a bad scan
   can't lock you out.
3. Save the 10 one-time **recovery codes** shown at the end — each lets you
   sign in once if you lose your phone. They're shown only that once; **Get
   new recovery codes** in the same dialog replaces them.

Turning 2FA off (or getting new recovery codes) needs your password plus a
current code. If someone loses both their authenticator and their recovery
codes, an admin can switch their 2FA off from **Manage Users** (the **2FA**
column → **Reset**); they sign in with just their password and re-enrol.

How it works (`backend/src/twoFactor.ts`, `backend/src/routes/auth.ts`):
standard TOTP (RFC 6238 — SHA-1, 6 digits, 30 s, ±1 step of clock drift),
implemented on `node:crypto` with the RFC test vectors as unit tests. For an
account with 2FA, `POST /api/auth/login` returns a 5-minute challenge token
instead of a session; `POST /api/auth/login/2fa` exchanges it plus a code for
the session cookie. The challenge token is signed with a key derived from
`JWT_SECRET` for that purpose only, so it can never act as a session. Each
code works once (the last accepted time step is stored), a wrong-code budget
applies per account as well as per IP, secrets are stored AES-256-GCM
encrypted (key derived from `JWT_SECRET`), and recovery codes are stored only
as hashes. **Rotating `JWT_SECRET` therefore invalidates enrolled
authenticators** — admins would need to reset 2FA for each user afterwards.

### Deploying on the internet

This app was built for a small team behind a login, not for the open
internet — but it can be exposed there (e.g. via a reverse proxy on a
domain like `pm.example.com`) with the hardening `docker-compose.yml`
and the backend already carry:

- **Login is rate-limited** — 10 failed attempts per IP per 15 minutes
  (`backend/src/routes/auth.ts`) — to blunt brute-force/credential-
  stuffing against `/api/auth/login`. This is keyed on the real client
  IP via `X-Forwarded-For`, which only works correctly through the
  chain `app.set("trust proxy", 1)` (`backend/src/index.ts`) +
  `frontend/nginx.conf`'s `proxy_set_header X-Forwarded-For
  $proxy_add_x_forwarded_for` sets up — if you add another reverse
  proxy in front of the `frontend` container, make sure it forwards
  (not strips) `X-Forwarded-For` too, or every request will look like
  it's coming from that proxy and share one rate-limit bucket.
- **`NODE_ENV=production`** is set for the `backend` service — this is
  what makes the auth cookie's `secure` flag actually take effect (see
  `COOKIE_OPTIONS` in `backend/src/routes/auth.ts`), so it isn't sent
  over a plain-HTTP connection. Serve the app over HTTPS (a reverse
  proxy terminating TLS in front of the `frontend` container is the
  usual way) — without HTTPS, this flag makes the cookie stop working
  at all rather than silently downgrading.
- **The backend's port (4000) is bound to `127.0.0.1` only**, not every
  interface — `docker-compose.yml`'s `ports:` entry. The only supported
  path in is through the `frontend` container's nginx, which proxies
  `/api/`; nginx is also where CORS-adjacent headers, TLS (via your
  reverse proxy), and this rate limiting actually take effect. A
  directly-reachable backend port would bypass all of that.
- **Security headers** (`helmet`) and a **locked-down CORS origin** are
  applied in `backend/src/index.ts` — see the comments there for what's
  configurable via `FRONTEND_URL`.
- Ollama's own exposure is a host-level concern this repo can't
  control — see the warning under **AI Assistant → Configuration**
  below if you're running it on the same host.

None of this replaces a firewall — only the ports this app itself needs
(your reverse proxy's HTTPS port) should be open to the internet at all;
Postgres never needs to be, and isn't (`docker-compose.yml` publishes no
port for either `db` service).

### Managing users

Admins get a **Manage Users** link in the account menu, opening a page to:

- See every account, its role, and when it joined
- Create a new account (name, email, a temporary password you share with
  them directly — there's no email/invite flow yet) with any role
- Change a user's role between `MEMBER`, `ADMIN`, and the read-only
  `VIEWER` (see [Viewer Role](#viewer-role) below)

An admin can't demote themselves (the UI disables their own row, and the
backend rejects it too) — a guard against a lone admin locking themselves
out by mistake.

Admins can also **deactivate** an account instead of deleting it — the
"Deactivate" link on each row. A deactivated user can't log in (their
existing session is cut off immediately too, not just future logins — every
request re-checks the flag rather than trusting the session cookie), but
nothing about them is deleted: their projects, tasks, activity history, and
attachments stay exactly as they were, still attributed to them by name.
"Reactivate" restores login access with no other side effects. The same
self-lockout guard applies here — an admin can't deactivate their own
account.

Admins can also **permanently delete** an account with the "Delete" link on each
row (after a confirmation). Deleting is irreversible and immediate: the person
loses access straight away (their open session is cut off, and signing in again
fails). What they created is
**not** deleted — projects, risks, actions, attachments, activity history and
every other record stay in place and keep showing the name they were recorded
under (each record stores the author's name alongside its link to the account;
only the link is cleared). Two-factor settings go with the account. An admin
can't delete their own account, which also means at least one active admin always
remains. Prefer **Deactivate** when someone might come back, since it can be
undone and deleting can't; a deleted person can only return as a brand-new
account.

### Permissions

Every user has a **role** — `MEMBER` (default), `ADMIN`, or the read-only
`VIEWER` — and every project records who created it. All logged-in
non-Viewer users can view every project and create new ones, but **editing
or deleting a project is restricted to its creator or an admin**; this is
enforced by the backend (a 403, not just a hidden button) as well as
reflected in the UI, which hides the Edit/Delete buttons and shows who owns
the project instead. Tasks and attachments stay open to any logged-in
non-Viewer user, matching how a small team actually works day to day — only
the project record itself needs an owner.

A project with no recorded creator (there isn't one in the current seed
data, but this covers a project whose creator's account was later removed)
is editable by anyone, rather than being permanently locked out.

The seed script creates one `admin@example.com` account (same demo
password) alongside the three `MEMBER` accounts, and assigns each seeded
project to the user matching its project manager, so the permission model
has something real to demonstrate out of the box.

## Charts

The dashboard shows a **Spend vs Budget Over Time — All Projects** chart
right below the stat cards, then a **Projects by Status** chart below
that — so both the portfolio's financial trajectory and its pipeline
shape are visible without a click. The "Reports" link opens a dedicated
page with the status chart plus two more, all built from the same
project/task data (no separate reporting backend):

- **Projects by Status** — count of projects at each pipeline stage
- **Budget by Asset Type** — total budget grouped by asset type
- **Task Progress by Project** — a To Do / In Progress / Done breakdown per
  project, sorted so the least-progressed projects surface first

The dashboard's **Spend vs Budget Over Time — All Projects** chart is the
portfolio-wide sibling of each project's own chart described below: every
project's own cumulative Actual-then-Forecast series (see the per-project
description for how that series is built) is computed independently and
only then summed by month, rather than pooling every project's raw cash
flow entries into one bucket — that distinction matters because a project
still on Forecast for a given month must keep contributing its forecast
figure to the total even in a month where some *other* project has
already booked an Actual, which a naive combined-entries approach would
silently drop. The two reference lines sum every project's Original
Budget and its Latest Approved Budget (falling back to the
variations-derived revised budget — Original Budget plus approved
variations, see Variations below — for a project with no Latest Approved
Budget entered yet), labelled "Total Original Budget" / "Total Latest
Approved Budget", the same way the per-project chart's own reference
lines do. The second line is only drawn when it differs from the first,
so a portfolio with no revisions shows just the one gray line. Both this
and the per-project chart share their SVG rendering
(`frontend/src/charts/CumulativeSpendChartView.tsx`) and cumulative-series
math (`frontend/src/charts/cumulativeSpend.ts`).

Each project's Cash Flow panel has two charts:

- **Spend vs Budget Over Time** — a cumulative line: Actual spend (solid
  blue) running into Forecast spend (dashed orange) as the project's
  Actual entries run out, plotted against up to two flat budget reference
  lines and a "Today" marker: **Original Budget** (dashed gray, from the
  project's Original Budget field, unchanging once set) and **Latest
  Approved Budget** (dashed green, from the project's Latest Approved
  Budget field — or, if that's not been entered, the variations-derived
  revised budget). The green line only appears once it differs from the
  gray one, so a project with no revisions yet shows a single reference
  line. The x-axis spans the project's
  own Start Date to Target Completion (extended to cover any entry outside
  that range), so the chart doubles as a where-are-we-in-the-schedule view,
  not just a spend total. This is the one chart in the app drawn as an SVG
  line rather than HTML/CSS bars — a diagonal line isn't something bars can
  do.
- **Monthly Spend** — the existing bar-per-month Actual (blue) vs Forecast
  (orange) view, for comparing individual months rather than the running
  total.

Every chart is hand-rolled with plain HTML/CSS or SVG (no charting library)
and draws its colors from a small validated palette in
`frontend/src/charts/palette.ts` — chosen and checked for colorblind-safe
contrast (see the `dataviz` skill this project follows: categorical hues
assigned in a fixed order, never cycled, and validated with its palette
checker before use).

## Monthly Reporting

Each project has a **Monthly Reporting** tab: one month's report at a time,
laid out cell for cell like the **Monthly Report** tab of GVW's monthly report
workbook (`<PM> - Monthly Report - <project>.xlsm`). It has the same sections
(Project Information, Current Status with the ten Emerging Risks, Budget &
Cash Flows with the annual and monthly breakdowns, Schedule / Major
Milestones, Related Project Documentation), the same labels, colours,
drop-down lists and traffic-light formatting. The grey formula cells
(Emerging Risk Health and its Yellow/Red comments, Expenditure to Date,
Forecast Total, Variance, the FY totals, the Actual/Forecast month labels and
Project Completion %) recalculate as you type, using the workbook's own
formulas (`backend/src/monthlyReport/model.ts`, mirrored in
`frontend/src/monthlyReport/model.ts` — change both).

**Starting a month** (pick the month, **Start report**) fills the report from
the project, and carries everything else on from the previous month, the way
a PM rolls the spreadsheet on. Cells filled from the project get a blue corner:

| Report cells | Filled from |
| --- | --- |
| Project name, BP Ref, PM, Director, Sponsor | Project details |
| Project Phase | Project status (Design → 3 - Plan, Tender → 4 - Procurement, ...) |
| Current Status | The milestone in progress, if it's one of the phase's statuses |
| Recently Completed | Milestones completed and tasks done in the month |
| Monthly Lookahead | Milestones forecast next month, the one in progress, tasks due |
| Emerging Risks | Open risks in the Risk Register, by category (Low → Green, Medium → Yellow, High/Critical → Red) |
| Original / Approved Budget | Original Budget / Latest Approved Budget |
| Pre-FY actual, monthly breakdowns, FY+2, FY+3, Post-FY | Cash Flow (a month's actual beats its forecast) |
| Milestone table (six WBS rows) | Milestones register |
| Approved / forecast completion, Date APD Received | Target completion, last milestone forecast, start date |

Titles, document references, contingencies, the Corporate Plan figure, notes
and commentary aren't tracked elsewhere in the dashboard, so they carry
forward. **Refresh from project** re-runs the fill on a saved month without
touching the commentary. Each saved month is still its own record (one per
project per month), editable by its author or an admin; the original
`budgetHealth`/`scheduleHealth` columns are kept in step for the rest of the
app. **Print view** and **Download PDF** give the same layout on paper.

### The workbook

The dashboard reads and writes the real workbook, so the PMs' spreadsheet in
SharePoint stays the official record and fills itself in:

- **Upload workbook** imports it: the month on its Monthly Report tab comes in
  in full, and every month on its **Reporting Log** tab that the dashboard
  doesn't have yet comes in too (the log has fewer fields — no milestones or
  notes — so it never overwrites a fuller dashboard report). The uploaded copy
  is kept as the project's workbook.
- **Write to workbook** (or **Push to SharePoint**) writes the month into the
  workbook's input cells. With **Log month** ticked it also records the month
  on the Reporting Log, as the workbook's own "Log Monthly Report" macro does,
  replacing that month's row if it's already logged — so a month can be
  re-synced as often as needed. The Snapshot tab follows automatically (it's
  formulas over the Monthly Report tab).
- **Download workbook** gives you the current file.

The file is edited in place at the XML level
(`backend/src/monthlyReport/workbook.ts`): only the input cells the dashboard
owns are replaced, and only when their value actually changed, so the VBA
macro, drop-down lists, conditional formatting and any formula a PM typed into
an input cell all come back untouched. Excel recalculates the formula cells
when the file is next opened.

### SharePoint sync

With SharePoint set up, **Choose SharePoint workbook** lists the workbooks in
the APD site's *Project Monthly Reports* folder (and one level of subfolders),
best match for the project first (its project number or BP ref in the file
name), and links one to the project. **Pull from SharePoint** then imports it,
and **Push to SharePoint** writes the month back. Pushes use the file's eTag,
so an edit someone saved in between is never overwritten (pull and try again),
and a workbook locked open in desktop Excel is reported rather than forced.

This goes through Microsoft Graph and needs an app registration in the GVW
Microsoft 365 tenant (IT can do this; it only takes a few minutes):

1. Entra ID → App registrations → **New registration** (single tenant). Note the
   **Application (client) ID** and **Directory (tenant) ID**.
2. Pick how the dashboard signs in:
   - **Each user's own account (recommended):** Authentication → *Allow public
     client flows* = Yes; API permissions → Microsoft Graph → Delegated →
     `Files.ReadWrite.All`, `Sites.ReadWrite.All`, `offline_access`, then grant
     admin consent if the tenant requires it. Each PM clicks **Connect
     Microsoft account**, enters the code shown at microsoft.com/devicelogin and
     signs in once; files are read and written with their own SharePoint
     permissions. Their sign-in is stored encrypted (key derived from
     `JWT_SECRET`) and can be removed with **Disconnect**.
   - **One server account:** Certificates & secrets → new client secret;
     API permissions → Application → `Sites.Selected` (then grant the app write
     access to the APD site) or `Sites.ReadWrite.All`, with admin consent.
3. Set in `.env`: `MS_TENANT_ID`, `MS_CLIENT_ID`, and for the server-account
   option `MS_CLIENT_SECRET`. `SHAREPOINT_REPORTS_FOLDER_URL` defaults to the
   APD site's Project Monthly Reports folder; any link to the folder works.
   Then `docker compose up -d` to restart the backend.

Without these settings the SharePoint buttons are hidden and upload/download
still work.

## Milestones

Each project has a **Milestones** panel — the source report's WBS schedule
table: Task/Activity, an optional WBS Item code, Percentage Completed
(shown as a progress bar), an optional Start Date, and Original / Forecasted
/ Actual Completion dates, plus free-text notes. A rolled-up "X% complete
overall" figure next to the panel title is the average across all of a
project's milestones, matching the source report's "Project Completion"
summary row.

Unlike Monthly Reports, milestones are a **live list**, not a per-month
snapshot — the same way Tasks work. A project's WBS breakdown (Concept
Design, Detailed Design, Construction, ...) mostly doesn't change month to
month, so re-entering the whole table on every report would just be
duplication; a monthly report view (once built) would read the milestones
as they stand at that time, the same way a real report is a point-in-time
look at a schedule that itself keeps moving.

Milestones keep their WBS order via up/down arrows (a new one is appended
to the end) rather than being sorted by date or percentage, since that
sequence is meaningful on its own and isn't derivable from the other
fields. Open to any logged-in user to edit, like Tasks and Attachments —
only the project record itself needs an owner.

### Timeline

The Schedule tab opens with a **Timeline** chart (`components/ProjectTimeline.tsx`)
above the Milestones panel — a horizontal, date-scaled view of the same
milestones plus every task with a due date. A milestone's own Start Date is
optional: most milestones simply run back-to-back, so leaving it blank
infers the bar's start as the previous milestone's own end, chaining from
the project's start date for the first one. Setting it explicitly is only
needed for a milestone that starts early, overlaps the previous one, or
otherwise runs concurrently rather than strictly in sequence — the
Milestones panel shows "After previous" in place of a date for the common,
chained case. Each bar fills proportionally to that milestone's percent
complete; tasks render as small diamond markers colored by status, on their
own row beneath the milestone bars. A milestone with no completion date at
all simply lists as "No dates set" rather than drawing a meaningless bar.

## Variations

Each project has a **Variations** panel for tracking contract variations
(scope, cost, and time changes) as they move through their own lifecycle:
Proposed → Approved or Rejected, changeable inline from the panel itself
(a status `<select>` per row) or from the full edit form. A variation
records a Reference (e.g. "VAR-01"), Title, Category (free text, with
suggestions like "Latent Conditions" or "Scope Change"), Description, a
Cost Impact (can be negative, for a credit/deduction), an optional Time
Impact in days, the date it was raised, and free-text notes. `dateDecided`
is stamped automatically the moment a variation leaves Proposed, rather
than needing to be entered by hand. The panel header totals the value of
every currently Approved variation and flags how many are still awaiting
a decision.

Only an **Approved** variation counts toward a project's budget — a
Proposed one hasn't been agreed to yet, and a Rejected one never
happened. `frontend/src/variations.ts` computes each project's *revised
budget* (its Original Budget plus the sum of its approved variations'
cost impact) once. The Cash Flow panel's Variance calculation still reads
from that revised figure. The cumulative-spend charts' Latest Approved
Budget reference line prefers the project's own Latest Approved Budget
field when it's set, and falls back to this variations-derived revised
budget otherwise — so a project tracking its budget purely through
variations still gets a second reference line, while one with an
explicit Latest Approved Budget entered isn't overridden by an unrelated
variation. When a project has no approved variations and no Latest
Approved Budget entered, there's nothing to revise, so the chart shows
just the one Original Budget line.

Like Milestones and Cash Flow entries, a variation is live data with no
per-month snapshot — its current state (and history of status changes,
via the Activity panel) is what matters, not what it looked like on some
past reporting date. Open to any logged-in user to edit, matching Tasks,
Attachments, and Milestones.

## Delays

Each project has a **Delays** register on its Schedule tab (above Extension of
Time) — the factual log of what slowed the works, which is what an EOT claim is
later built on. A delay has a title, a cause/category (free text with
suggestions such as Weather, Design / Information, Client / Approvals,
Supply Chain / Materials), a responsible party, a description, a start date, an
optional end date, a **Days Delayed** figure, a Status of Ongoing or Resolved,
a mitigation / recovery action, notes, and an optional **Related EOT Claim**
reference (e.g. `EOT-01`). A **critical path** checkbox flags delays that push
out the completion date.

Log a delay when it begins (leave the end date empty — it shows as "ongoing"),
then switch it to Resolved from the row's status dropdown, which stamps the end
date automatically (reopening clears it). If Days Delayed is left blank the
panel counts the calendar days from the start to the end date, or to today
while it's still ongoing (`frontend/src/delayMeta.ts`'s `delayDays`); an entered
figure always wins. The panel header totals the days lost, how many were on the
critical path, and how many delays are still ongoing. An end date before the
start date is rejected. Delays are searchable from the global search, written to
the activity log, deletable with undo, and exportable to CSV. The related-EOT
field is a plain reference rather than a link, so a delay doesn't have to become
a claim and one claim can cover several delays. Delays are informational: they
don't change Project Health or the revised completion date — only approved EOT
claims do. Open to any logged-in user to edit.

## Extension of Time (EOT) Claims

Each project has an **Extension of Time Claims** panel — distinct from
Variations even though both are raised against a contract. A Variation
is a scope/cost/time change the parties agree to; an EOT claim argues
the existing schedule itself was disrupted (weather, latent conditions,
a client-caused delay) and should be pushed out, independent of any
scope change. A claim records a Reference, Title, Cause (free text, with
suggestions like "Weather" or "Latent Conditions"), Description, Days
Claimed, Days Granted (once decided — can be less than Days Claimed for
a partial grant, which is why it's a separate field rather than a fourth
status), a Status of Submitted/Approved/Rejected, the date submitted,
and notes. `dateDecided` stamps automatically on leaving Submitted, the
same pattern Variations use.

Only an **Approved** claim's granted days extend a project's expected
completion date. `frontend/src/eot.ts` computes each project's *revised
completion date* (its Target Completion plus the sum of its approved
claims' granted days) — the schedule equivalent of Variations' revised
budget — and the project overview shows it alongside Target Completion
once it differs. Project Health's Schedule dimension (below) uses this
revised date too, so an approved EOT claim pushes back the
overdue/approaching-due threshold the same way an approved Variation
revises the budget threshold — deliberately different from the
dashboard's "Overdue" stat and project table, which always reflect the
literal contractual date.

Like Variations, an EOT claim is live data with no per-month snapshot.
Open to any logged-in user to edit.

## Commissioning & Handover

Each project has a **Commissioning & Handover** checklist — one shared
`ChecklistItem` model with a `phase` discriminator (Commissioning or
Handover), the same discriminator pattern used by Risks/Opportunities and
Lessons Learned, since both phases track the same shape of item (a
Title, Description, Responsible party, Due Date, Status, and Notes) and
only which stage of project closeout they belong to differs. Milestones
already track high-level WBS-phase dates, but commissioning and handover
each involve many small, checkable steps (functional tests, O&M manual
handover, training, defects sign-off) that don't warrant their own
milestone rows — this checklist gives them a home.

Status is Not Started, In Progress, Complete, or Not Applicable,
changeable inline from the panel. `completedDate` stamps automatically
the moment status changes to Complete, and clears if it's moved back off
Complete — the same auto-stamp pattern used by Variations'
`dateDecided`, Actions' `dateClosed`, SQE's `dateClosed`, and EOT's
`dateDecided`. The panel header shows a running count per phase (e.g.
"Commissioning 2/5 complete · Handover 0/3 complete"), excluding
Not Applicable items from the denominator so they don't dilute the
completion picture.

Like Stakeholders, this register has no portfolio-wide view — a
project's commissioning checklist doesn't aggregate meaningfully across
the portfolio the way an open risk or an expiring permit does. Open to
any logged-in user to edit.

## Defects & Punch List

Each project has a **Defects & Punch List** register for physical work
that needs rectifying — distinct from an SQE record (which documents a
safety/quality/environment event) and from an Actions & Decisions entry
(a general open item): a defect names a specific piece of work, tracks
who it's assigned to for fixing (a contractor or subcontractor), and
optionally how much retention money is held against it until it's
verified fixed. Fields are Title, Location, Category (free text, with
suggestions like "Civil" or "Electrical"), Description, Assigned To,
Due Date, Status, Retention Held ($), and Notes.

Status runs the normal path OPEN → RECTIFIED (the contractor says it's
done) → VERIFIED (the PM has confirmed it), with a DISPUTED status for a
defect whose existence or cause is contested — common during a Defects
Liability Period. `dateClosed` stamps automatically the moment status
becomes VERIFIED, the same auto-stamp pattern used elsewhere in the app.
The panel sorts the most outstanding defects first (open and disputed
ahead of rectified-but-unverified, verified ones last) and its header
shows a running "N outstanding of total" count.

The Dashboard has a portfolio-wide **Open Defects** panel alongside
Needs Attention, Expiring Permits, and Open SQE Issues, listing every
non-verified defect across the portfolio with a link back to its
project. Open to any logged-in user to edit.

## Payment Claims

Each project has a **Payment Claims** register — the contract-
administration counterpart to Cash Flow's monthly forecast/actual
entries, which are the PM's own budget tracking rather than a formal
claim-and-certify record. A claim has a Claim Number, an optional
Period Ending date, a Claimed Amount (what the contractor asked for),
a Certified Amount (what the PM actually certifies — often less, so
it's a separate field rather than the claimed amount rewritten in
place), a Status, the date submitted, and Notes.

Status runs the normal path SUBMITTED → CERTIFIED → PAID, with a
DISPUTED status for a claim the PM contests. Certification and payment
are tracked as two independent auto-stamped dates rather than one:
`dateCertified` stamps the moment status first reaches CERTIFIED *or*
PAID (both imply certification happened, even if a claim is certified
and paid in the same step) and clears if moved back to
SUBMITTED/DISPUTED; `datePaid` stamps only on reaching PAID and clears
otherwise. The panel header shows the total certified to date and a
running "N outstanding" count (anything not yet PAID), sorted with
disputed and submitted claims first.

The Dashboard has a portfolio-wide **Payment Claims Outstanding** panel
alongside the other exception panels, listing every claim across the
portfolio still awaiting certification or payment with a link back to
its project. Open to any logged-in user to edit.

A claim can optionally be linked to a specific entry in the project's
**Contracts** register via an optional `contractId` foreign key
(`onDelete: SetNull`, since a claim isn't required to be against a
formal Contract record and losing the contract shouldn't take the
claim's history with it — the backend also rejects a `contractId` that
doesn't belong to the same project). Linking claims this way is what
lets each Contracts row show its **Remaining** value — see the
**Contracts** section above.

## Risks & Opportunities

Each project has a **Risks & Opportunities** register — one shared `Risk`
model with a `type` discriminator, since both track the same structure
(only the polarity of the underlying uncertainty differs). Each entry has
a Title, Type (Risk or Opportunity), Category (free text), Description,
an owner, an optional due date, and a status of Open, Mitigating, or
Closed, changeable inline from the panel (a status `<select>` per row) or
from the full edit form.

Likelihood and consequence are rated on a standard 5×5 matrix — Rare
through Almost Certain, Insignificant through Severe — captured twice:
an **Inherent** rating (before any mitigation) is required on every
entry, and an optional **Residual** rating (after mitigation) can be
added once a response is in place. `frontend/src/riskScoring.ts` maps
each rating to a 1-5 value, multiplies likelihood × consequence for a
score from 1 to 25, and bands it Low/Medium/High/Critical — this scoring
is computed client-side rather than persisted, so changing the band
thresholds doesn't require a migration. The panel sorts by inherent
score (highest first) and shows both score badges side by side when a
residual rating exists, so the effect of mitigation is visible at a
glance.

The Dashboard has its own portfolio-wide **Top Risks & Opportunities**
panel, listing the highest-scored open items across every project with a
link back to each one — matching the Risks panel's per-project register
without needing to open every project to see what needs attention.

Like Variations, a risk is live data with no per-month snapshot — its
current state and status history (via the Activity panel) are what
matter. Open to any logged-in user to edit, matching Tasks, Attachments,
Milestones, and Variations.

## Requests for Information

Each project has a **Requests for Information (RFIs)** register — a
formal question raised to a designer, consultant, or client that needs
an answer before work can proceed (a specification ambiguity, a missing
detail, a site condition needing direction). A request has an RFI
Number, Subject, Question, who it was raised to, a Status of Open/
Answered/Closed, the date raised, a Response, and Notes.

`dateRequired` — the date a response is due — is the contractually
meaningful deadline, distinct from `dateRaised`, the same role
`Task.dueDate` plays for tasks: only an Open RFI can be overdue or due
soon (`frontend/src/rfiMeta.ts`'s `isRfiOverdue`/`isRfiDueSoon`, mirroring
`taskMeta.ts`). `dateAnswered` stamps automatically the moment status
first reaches Answered or Closed (both imply a response exists, the same
dual-implication pattern Payment Claims' `dateCertified` uses) and clears
if moved back to Open. The panel sorts open and answered RFIs ahead of
closed ones and flags overdue items in red.

The Dashboard has a portfolio-wide **Open RFIs** panel listing every
non-closed RFI across every project, overdue ones first, then soonest
due — and the notification bell now folds in overdue/due-soon RFIs
alongside task deadlines and expiring permits/insurance, so a late
response shows up wherever a PM is already looking. Open to any
logged-in user to edit.

## Document Register

Each project has a **Document Register** — a controlled-document list for
drawings, specifications, reports, and other project documents subject to
revision control, distinct from **Attachments** (arbitrary uploaded files
with no revision or status lifecycle). A document has a Document Number,
Title, Category (Drawing, Specification, Report, Correspondence, As-Built —
with suggestions, freeform text), Revision, a Status of Draft/For Review/
Approved/Superseded, an Issue Date, a Description, and Notes.

The status models a standard document-control lifecycle: a document is
drafted, put out for review, approved for use (e.g. Issued For
Construction), and eventually superseded by a later revision — a new
revision is added as a new record rather than overwriting the old one, so
the register keeps a full revision history rather than deleting anything.
The panel sorts documents awaiting action (For Review, then Draft) ahead
of Approved (current, in-use) documents, with Superseded revisions sinking
to the bottom (`frontend/src/documentMeta.ts`'s `documentStatusRank`,
the same status-rank pattern every other register uses). Open to any
logged-in user to edit.

## Community Enquiries & Complaints

Each project has a **Community Enquiries & Complaints** register — a log
of public enquiries and complaints about construction activity (noise,
traffic, dust, site access), distinct from **Stakeholders** (a contacts
list) and **Requests for Information** (technical questions to a
designer/consultant/client, not the public). An enquiry has an optional
Reference, a Category (Noise/Traffic/Dust/Access/Other), how it was
received (Source), the complainant's contact details, a Description, the
Date Received, a Status of Open/In Progress/Resolved/Closed, who it's
Assigned To, a Resolution, and Notes.

`dateResolved` stamps automatically the moment status first reaches
Resolved or Closed (both imply the matter is dealt with) and clears if
moved back to Open or In Progress — the same dual-implication auto-stamp
pattern RFIs' `dateAnswered` and Payment Claims' `dateCertified` use. The
panel sorts open and in-progress enquiries ahead of resolved/closed ones
(`frontend/src/enquiryMeta.ts`'s `enquiryStatusRank`).

The Dashboard's Alerts tab has a portfolio-wide **Open Enquiries** panel
listing every non-resolved, non-closed enquiry across every project.
Open to any logged-in user to edit.

## Safety, Quality & Environment

Each project has an **SQE** register for logging safety, quality, and
environmental issues: a Category (Safety/Quality/Environment), a
Severity (Low/Medium/High/Critical), Title, Description, Corrective
Action, the date it occurred, and a status of Open/In Progress/Closed
(changeable inline, like Actions & Decisions).

Severity here is rated directly on a 4-band scale rather than through
Risk's likelihood × consequence matrix — an SQE record documents
something that already happened, so there's no "likelihood" left to
assess once it's occurred, only how severe it turned out to be.
`dateClosed` stamps automatically the moment status becomes Closed, the
same pattern Actions & Decisions and Variations use for their own
closing dates.

The dashboard's portfolio-wide **Open SQE Issues** panel lists every
open issue across every project, most severe first, linking back to its
project — sitting alongside Needs Attention and Permits Expiring Soon
as a view into what needs a PM's attention today.

Like the other registers, an SQE record is live data with no per-month
snapshot. Open to any logged-in user to edit.

## Actions & Decisions

Each project has an **Actions & Decisions** register — one shared
`ActionItem` model with a `type` discriminator, the same pattern as
Risk/Opportunity. It's deliberately separate from Tasks: a Task is a
general to-do, while an Action or Decision is raised in a specific
context (a design review, a site meeting) and tracked back to that
origin. Both share a Title, Category (free text), Description, an
owner, an optional due date, and a status of Open, In Progress, or Done,
changeable inline from the panel or the full edit form.

A **Decision** is, by nature, usually already resolved the moment it's
recorded — there's no work left to do, just a record of what was agreed
— so creating one defaults its status straight to Done rather than Open
the way a new Action does; both remain fully editable afterwards (a
decision can be revisited and reopened) since the type only changes the
starting point, not what's allowed. `dateClosed` stamps automatically
the moment status becomes Done, and clears if it moves off Done again —
the same pattern `dateDecided` uses on a Variation.

Every open Action/Decision across the portfolio shows up in the
Dashboard's **Today & Upcoming** tab (see below), merged in alongside
Tasks — there's no separate portfolio-wide Actions panel, since that
would just be the same data shown twice.

Like Risks and Variations, an action item is live data with no per-month
snapshot. Open to any logged-in user to edit, matching Tasks,
Attachments, Milestones, Variations, and Risks.

## Meeting Minutes

Each project has a **Meeting Minutes** register — a simple log of project
meetings (progress meetings, design reviews, site meetings), distinct
from **Actions & Decisions** (a single decision or action, not a full
meeting record). A meeting has an optional **Meeting Title** (shown as
the meeting's heading in the list, with the date beside it), a Meeting Date, Type (a dropdown of
common types — General Meeting, Progress Meeting, Workshop, Design/Risk/
Safety in Design/Value Engineering Workshop, PCG, Steering Committee, Site,
Pre-start, Stakeholder, Handover and more — plus **Other…** to type any
other type), Location,
Attendees (freeform), a Summary, an optional Next Meeting Date, and
Notes.

Like Site Visits, this is a plain log with no status workflow — nothing
to mark open or closed, just a record of what happened. The panel sorts
by meeting date, most recent first. Open to any logged-in user to edit.

Both **+ New Meeting** and **Edit** have an **Attach Minutes Document
(PDF or Word)** file field right in the form — for the common case of
already having a signed minutes document (typed up separately, or
exported from the site's own meeting software) and just wanting to log
it against the project. It's optional and uploads alongside the save.

Expanding a meeting reveals two linked sub-sections:

- **Attachments** — files (the signed PDF, a slide deck) uploaded against
  that specific meeting rather than the project's general Attachments
  list. Reuses the same upload infrastructure with an optional
  `meetingMinutesId` tag; deleting the meeting deletes its attachments
  too (cascade), since the files have no purpose without it.
- **Actions from this meeting** — Action Items (from the Actions &
  Decisions register) tagged with the meeting they arose from, via an
  optional `meetingMinutesId` on `ActionItem`. Unlike attachments, an
  action is unlinked rather than deleted if its meeting is removed (a
  follow-up task is still real work to track even without the meeting
  record). Add one with the quick-add field, or generate a first draft
  with **AI: Suggest Actions from Notes**.

That button sends the meeting's summary and notes to the same
self-hosted Ollama model the AI Assistant uses (see below), asking it to
extract a list of candidate follow-up items — each with a title and,
where the notes say so, an owner and a due-date hint. Nothing is created
automatically: the suggestions appear as a checklist (all pre-selected)
for you to review, deselect, and add. If Ollama can't be reached, the
button shows the same clear inline error as the AI Assistant rather than
failing silently.

**Your actions become Tasks.** Each suggestion in that checklist also has
a **My task / Action** selector. Suggestions whose owner matches the
logged-in user (full name, or first name — "Alex", "Alex Smith") default
to **My task** and are added to the project's own **Tasks** list
(Schedule tab), so your to-dos stay in one place; everyone else's default
to **Action** and go into the Actions & Decisions register as before, so
you can still see what to follow up with others. The match is only a
default — flip any row before adding. A task created this way is linked
to its meeting (`Task.meetingMinutesId`, unlinked rather than deleted if
the meeting is removed), carries "From meeting: …" and any due-date hint
in its description, and shows under the meeting's "Actions from this
meeting" list with a **My task** badge alongside the other actions. The
routing logic lives in `frontend/src/meetingActionRouting.ts`, shared by
both AI flows below.

### Generate from Transcript (AI)

On **+ New Meeting**, **+ Generate from Transcript (AI)** turns a raw
meeting transcript into a structured draft in one step: paste text, or
upload a `.txt`/`.docx`/`.pdf` file or a photo of handwritten notes
(`backend/src/transcriptExtraction.ts` extracts the text — `mammoth` for
Word, `pdf-parse` for PDF; a photo instead goes through Ollama's vision
model for OCR). The extracted text is sent to Ollama's chat model, which
returns a suggested meeting title (only filled in if you haven't typed
one), meeting type, summary, attendees, notes, and a suggested-actions
list — the same shape and review-before-adding pattern as **AI: Suggest
Actions from Notes** above, filled into the form fields for you to edit
before saving.

Saving a meeting created this way does two things beyond a normal save:
it creates the selected suggested actions (linked to the new meeting, as
above), and it builds a one-page PDF summary of the final — possibly
hand-edited — meeting content (`frontend/src/meetingMinutesPdf.ts`, drawn
directly with jsPDF rather than a screenshot, since it's just structured
text) and attaches it to the meeting automatically, so there's a
shareable document alongside the structured record with no separate
export step. Editing an existing meeting or a plain (non-transcript) new
meeting doesn't trigger this — the PDF is specific to the transcript
workflow.

This uses two separate Ollama model slots — `OLLAMA_CHAT_MODEL` for text
reasoning and `OLLAMA_VISION_MODEL` for reading a photo — rather than one
model for everything; see **AI Assistant → Configuration** below.

## Correspondence

Each project has a **Correspondence Register** — a log of formal letters
and notices exchanged with consultants and contractors (a notice of
delay, a show-cause notice, a formal direction, a contractual notice),
distinct from **RFIs** (a technical question needing an answer to
proceed with works) and **Community Enquiries** (correspondence with the
public, not a project party). An entry has a Reference, a Direction of
Incoming/Outgoing, the Correspondent, a Subject, a Summary, the Date
Sent, an optional Response Due date, a Status of Open/Closed, and Notes.

`responseDueDate` is the contractually meaningful deadline, the same role
`Rfi.dateRequired` plays for RFIs: only an Open item can be overdue or
due soon (`frontend/src/correspondenceMeta.ts`'s
`isCorrespondenceOverdue`/`isCorrespondenceDueSoon`). `dateClosed` stamps
automatically the moment status reaches Closed and clears if moved back
to Open — a single-implication version of the dual-implication pattern
`Rfi.dateAnswered` uses, since Correspondence has only one closing status.
The panel sorts open correspondence ahead of closed and flags overdue
items in red.

The Dashboard has a portfolio-wide **Open Correspondence** panel listing
every non-closed entry across every project, overdue ones first, then
soonest due. Open to any logged-in user to edit.

## Stakeholders

Each project has a **Stakeholders** register — a simple contact
directory of the people and organizations with a stake in the project (a
landholder, a council contact, a community group): Name, Role,
Organization, Email, and Phone, with free-text Notes on expand. Unlike
every other register on this page, a stakeholder has no status or
lifecycle of its own — it's a directory entry, not something that moves
through states — so there's nothing to track a transition for beyond the
plain fact of an edit. No portfolio-wide view exists for this one;
stakeholders are inherently project-specific in a way that doesn't
aggregate meaningfully across the portfolio the way an open risk or an
expiring permit does. Open to any logged-in user to edit.

## Permits & Approvals

Each project has a **Permits & Approvals** register for tracking
environmental, planning, and regulatory approvals: Title, Category (free
text, with suggestions like "Environmental" or "Cultural Heritage"),
Reference Number, Issuing Authority, a Status of Pending/Approved/
Rejected (changeable inline), Date Applied, Date Approved, an Expiry
Date, and Notes.

Whether an approved permit is **Expiring Soon** (within 60 days) or
**Expired** is computed from its expiry date against the current time,
the same way a project's overdue state is computed rather than stored —
`frontend/src/permitMeta.ts` — so it can never drift stale the way a
manually-set "expired" status would the moment nobody's looking. Only an
Approved permit can meaningfully expire; a Pending or Rejected one was
never in force. The dashboard's portfolio-wide **Permits Expiring Soon**
panel lists every flagged permit across every project, soonest first,
linking back to its project — sitting alongside Needs Attention and Open
Actions as a third view into what needs a PM's attention today. Open to
any logged-in user to edit.

## Subcontractors

Each project has a **Subcontractors** register — the trade contractors
engaged on the project, distinct from `Project.contractor` (a single
freeform field naming just the head contractor). A subcontractor has a
Company Name, Trade (free text, with suggestions like "Electrical" or
"Concreting"), contact details, an optional Contract Value, Start/End
Dates, a Status of Engaged/Active/Completed/Terminated (changeable
inline), an Insurance Expiry date, and Notes.

Whether a subcontractor's insurance is **Expiring Soon** (within 60 days)
or **Expired** is computed from that date against the current time rather
than stored — the same computed-not-stored pattern Permits' expiry state
uses (`frontend/src/subcontractorMeta.ts`). Only an Engaged or Active
subcontractor's insurance still matters; a Completed or Terminated one is
no longer on site. The panel sorts currently-on-site subcontractors first
(Active, then Engaged but not yet started), with Completed/Terminated
sinking to the bottom. The Dashboard's Alerts tab has a portfolio-wide
**Subcontractor Insurance Expiring Soon** panel listing every flagged
subcontractor across every project, soonest first. Open to any logged-in
user to edit.

## Contracts

Each project has a **Contracts** register — the formal agreements that
sit above Subcontractors' trade-level engagements: a design consultant's
consultancy agreement or the head contractor's construction contract. A
contract has a Party Type (Consultant or Contractor), Party Name,
Discipline/Scope (e.g. "Structural Design"), an optional Contract Number
and Contract Form (free text, with suggestions like "AS4000-1997" or
"NEC4"), Contract Value, Contingency and Provisional Items (optional
money values — the provisional-items allowance within the contract), a
**PO Number** (the purchase order reference raised against the contract —
free text, not an amount; existing numeric PO values were carried over as
text), Retention (%), a Defects
Liability Period in months, Execution/Start/Completion dates, a Status of
Active/Complete/Terminated (changeable inline), and Notes. This is
distinct from `Project.contractor`/`Project.contractValue` (a single
freeform pair of fields kept on the project itself for a quick-glance
summary) — a project can have any number of Contracts records, e.g. one
per design consultant plus the head construction contract. Contingency in
particular is deliberately scoped per contract rather than to the project
as a whole — each contract's own risk allowance, not a single portfolio
rollup — so it's entered here and nowhere else (not on the project's Edit
form, and not among the Budget & Contract tab's cash flow stats). Open to
any logged-in user to edit.

Each contract can have Payment Claims linked against it (see
**Payment Claims** below), and its row shows a computed **Remaining**
figure — Contract Value minus the sum of claimed amounts for its linked,
non-disputed claims — right alongside the value and contingency. It's
computed client-side (`remainingContractValue()` in
`frontend/src/contractMeta.ts`) from the same `contracts` and
`paymentClaims` arrays the page already loads, the same
compute-not-store pattern used elsewhere in the app, and shown in red
when the contract is over-claimed (remaining is negative).

## Performance Reviews

Each project has a **Performance Reviews** register — periodic scorecards
for the consultants and contractors engaged on the project, distinct from
**Subcontractors** (a static engagement record with no ongoing
assessment) and **Safety, Quality & Environment** (a one-off incident,
not a scheduled review). A review has the Consultant/Contractor being
reviewed (freeform, matching the same pattern as `Subcontractor
.companyName` and `Project.contractor` rather than a foreign key, since a
review may cover the head contractor, a named subcontractor, or a design
consultant), an optional Review Period label (e.g. "Q3 2026"), a Review
Date, four 1-5 ratings — Quality, Safety, Timeliness, Communication — and
Comments.

The overall score is computed client-side as the average of the four
ratings and is never stored, the same computed-not-stored pattern Risk's
likelihood x consequence score uses (`frontend/src/performanceMeta.ts`).
A score below 2.5 is banded "Needs Improvement" and flags the review on
the Dashboard's portfolio-wide **Low Performing Contractors** panel,
worst-scoring first; "Satisfactory" (2.5-3.5), "Good" (3.5-4.5), and
"Excellent" (4.5+) round out the bands. The project panel sorts
lowest-scoring reviews first. Open to any logged-in user to edit.

## Insurance & Warranties

Each project has an **Insurance & Warranties** register — one shared
`InsuranceWarranty` model with a `type` discriminator (Insurance or
Warranty), the same discriminator pattern used elsewhere (Risk/
Opportunity, Lesson Learned, ChecklistItem), since both track the same
shape: who provides the cover, a reference number, what's covered, and
when it lapses. Fields are Title, Type, Provider (the insurer, or the
manufacturer/contractor for a warranty), Reference Number, Coverage
Details (free text — what's covered and for how much), Start Date,
Expiry Date, and Notes.

Unlike Permits & Approvals there's no application workflow — a policy
or warranty is in force from the moment it's entered — so there's no
status field. Whether an item is **Expiring Soon** (within 60 days) or
**Expired** is computed from its expiry date against the current time,
the same reasoning as `permitMeta.ts`'s expiry logic but without the
Approved-status gate (`frontend/src/insuranceWarrantyMeta.ts`). The
dashboard's portfolio-wide **Insurance & Warranties Expiring Soon**
panel lists every flagged item across every project, soonest first,
linking back to its project — alongside the other exception panels.
Open to any logged-in user to edit.

## TRIM Links

The Dashboard's **TRIM Links** tab collects links into TRIM (the records
management system) in one place:

- **TRIM Links** — shared links anyone except a Viewer can add: a title,
  the TRIM web link *or* a record/container number, an optional category
  (links are grouped by it) and description. The person who added a link,
  or an admin, can edit or delete it. Only `http(s)` values become
  clickable links.
- **Project TRIM Folders** — every project's own **TRIM Folder** (set on
  the project's Edit form, next to Project Number), linking to the project.

The list is searchable across both.

## Tool Suggestions

A **Tool Suggestions** button in the dashboard header (next to Lessons
Learned) opens a suggestion box for the dashboard itself: anyone signed in —
Viewers included — can suggest a **New Feature**, an **Improvement**, a
**Bug / Issue** or **Other**, with a title and optional detail. Suggestions
are listed newest first with who made them, filterable by status and
searchable. The person who made a suggestion (or an admin) can edit or
delete it; only an admin can set its status (Open → Planned → In Progress →
Done, or Declined) and add a response. The default **Active** filter hides
Done and Declined ones. Backed by the `ToolSuggestion` model and
`/api/tool-suggestions` (`backend/src/routes/toolSuggestions.ts`).

## Lessons Learned

Each project has a **Lessons Learned** register — one shared
`LessonLearned` model with a `type` discriminator (what went well vs.
what to improve), the same Risk/Opportunity-style pattern used
elsewhere. Each entry has a Title, Category, a description of what
happened, and a Recommendation for future projects.

Unlike the other registers, a lesson's value is less about tracking it
to closure and more about it being **findable later** — by a PM starting
a new pump station project, say, wanting to know what past pump station
projects learned. The dashboard header has its own **Lessons Learned**
page (`/lessons-learned`), separate from the per-project panel, listing
every lesson across the whole portfolio with type and category filters
plus a text search, each linking back to its project (and that project's
asset type, for exactly that "what have we learned about this kind of
asset" use case). Open to any logged-in user to edit.

## Project Health

Every project gets a live **Health** rating — Green/Amber/Red — computed
from data that's already there, rather than typed in by hand. This is
distinct from a Monthly Report's `budgetHealth`/`scheduleHealth`, which
are a PM's own judgement call as of that report's month: Project Health
recalculates on every page load from whatever the project's schedule,
cash flow, and risk register currently say, so a project that's drifted
off track shows up immediately rather than waiting for the next report.

`frontend/src/health.ts` rates three dimensions independently, then takes
the worst of the three as the overall rating. Schedule and Budget share one
percentage scale — Amber from 95% up to and including 115%, Red beyond
115%, Green below 95% — so a project a little over its timeframe or budget
isn't yet the same signal as one running materially over:

- **Schedule** — the percentage is elapsed time (project Start Date to
  today) over the planned duration (Start Date to the *revised* completion
  date — Target Completion plus any approved EOT claims' granted days, see
  Extension of Time Claims above), so a short project and a long one are
  judged on the same scale relative to their own timeframe rather than a
  fixed days-until-target countdown. Always Green if the project is
  Project Completion/Defects Liability/Complete/Cancelled, or is missing a
  start or target date. This is deliberately different from the
  dashboard's "Overdue" stat and the project table, which always reflect
  the literal contractual date rather than the revised one
- **Budget** — the percentage is the Forecast Total (from Cash Flow) over
  the project's effective budget: the manually-tracked **Latest Approved
  Budget** when one has been entered on the project, since it already
  reflects every negotiated change (not all of which get raised as a
  Variation); otherwise the **Original Budget** as revised by any approved
  Variations (`effectiveBudget()` in `frontend/src/variations.ts`, also
  used by the Cumulative Spend charts' reference lines). Green when
  there's no cash flow data yet rather than guessing
- **Risk** — Red if any open Risk (not an Opportunity, not Closed) has a
  Critical inherent score; Amber for High; Green otherwise. Unlike
  Schedule and Budget, Risk isn't on the percentage scale above

The dashboard's **Needs Attention** panel lists every project rated
Amber or Red portfolio-wide, naming which dimension(s) triggered it and
linking straight to the project — the exception-surfacing view of what a
PM should look at today, rather than a database they have to go dig
through. The same rating shows as a compact badge in the dashboard's
project table (hover for the per-dimension breakdown) and as the full
Schedule/Budget/Risk breakdown in each project's own header.

## Cash Flow

Each project has a **Cash Flow** panel — the source report's monthly
actual/forecast breakdown. Every entry is one project, one month, one
type (Actual or Forecast) and an amount; adding an entry for a month that
already has one of that type overwrites it rather than erroring, so
correcting a figure is just re-entering it.

Above the entry list, a stat row shows Original Budget, Latest Approved
Budget (when set), and Contract Value (when set — relocated here from the
project's top summary, since it belongs with the rest of the budget
figures rather than the header shown on every tab) alongside three
figures computed live from the entries, matching the "(formula)" cells in
the source report:

- **Expenditure to Date** — the sum of all Actual entries
- **Forecast Total** — the Estimate at Completion: every month's Actual
  once one exists, plus Forecast for the months that don't have one yet.
  A month with both an Actual and a leftover Forecast (normal, since
  entering an Actual doesn't delete that month's earlier Forecast) counts
  once, using the Actual — Forecast and Actual are never summed together
  for the same month
- **Variance** — the project's current budget (Original Budget, revised
  by any Approved variations — see Variations above) minus Forecast
  Total, shown in red if the project is forecast to run over

When at least one variation has been approved, two extra stats appear —
**Approved Variations** (their total cost impact) and **Revised Budget**
— so the original figure and its revision are both visible side by side
rather than the original quietly being replaced.

Each entry in the list has a one-click **Mark as actual** (on a Forecast)
or **Mark as forecast** (on an Actual) that switches that same entry's type
in place, keeping its amount — no need to add a new entry when a month's
forecast becomes its actual. If the month already has an entry of the other
type, you're asked first and it's replaced. **Edit** also lets you change
the type and amount together, and every change can be undone from the toast.

Like Milestones, this is live data rather than a per-month snapshot — an
Actual figure doesn't need re-editing once entered, and a Forecast is
expected to be revised as the project progresses. Open to any logged-in
user to edit, matching Tasks, Attachments, and Milestones.

## Project Closeout Report

Every project detail page has a **Closeout Report** button in its header,
opening a printable summary at `/projects/:id/closeout-report` — the
counterpart to a monthly report's print view, but a single point-in-time
rollup of a project's *final* outcomes rather than one month's status.
It pulls together, into the same blue-headed section layout with the same
Download PDF / Print buttons described above:

- **Final Budget Outcome** — original budget, latest approved budget (when
  set), approved variations total, the resulting final budget (via the
  same `revisedBudget()` helper the Variations panel uses), final
  expenditure (the sum of `ACTUAL` cash flow entries), the variance
  between them, contract value, and the full variations table.
- **Final Schedule Outcome** — original target completion, approved EOT
  days, the resulting revised completion date (via `revisedCompletionDate()`),
  actual completion date, overall milestone completion, and the full EOT
  claims table.
- **Commissioning & Handover** — checklist completion percentage and a list
  of any items not yet Complete or Not Applicable.
- **Defects & Punch List** — a list of any defects still Open or Disputed.
- **Outstanding RFIs** — a list of any RFIs not yet Closed.
- **Lessons Learned** — the project's full list, with description and
  recommendation for each.

Unlike a monthly report (a record of one month), this reads **live** data — milestones,
variations, EOT claims, checklist items, defects, RFIs, and lessons
learned as they stand today — rather than a locked snapshot, since a
closeout report is generated once, at (or after) project completion, not
monthly. The shared print-page chrome (`ReportSection`, `ReportField`,
`NarrativeBlock`, `HealthRow`) lives in `components/ReportPrimitives.tsx`
(it was factored out of the original monthly report view).

## Dark Mode

A sun/moon toggle — in the header next to the notification bell on every
app page, and top-right on the login page — switches the whole app between
light and dark. It's built on Tailwind's class-based dark mode
(`darkMode: "class"`): a `ThemeContext` toggles a `dark` class on `<html>`
and persists the choice to `localStorage`, defaulting to the OS's
`prefers-color-scheme` on first visit. Every page, panel, table, and modal
carries `dark:` variants, and the hand-rolled charts read their colors from
theme-aware tokens in `frontend/src/charts/palette.ts` (light/dark pairs
for grid lines, axis text, and the Actual/Forecast categorical pair —
re-validated for the dark chart surface with the same `dataviz` palette
checker used for light mode).

The monthly report sheet (on the Monthly Reporting tab and its print view
at `/projects/:id/reports/:reportId`) deliberately ignores the toggle and
always renders light — it mirrors the workbook and is meant to look the same
on screen and paper regardless of theme, so it carries no `dark:` classes.

## Site Visits

Each project has a **Site Visits** panel — a mobile-friendly field log for
the visits a project manager makes to site, since that's typically entered
from a phone standing in the field rather than at a desk. A visit records
Date, Time, Location (free text, with a **📍 Use current** button that
fills it from the browser's Geolocation API as `lat, lng`), **Site Visit
Purpose** (why the visit was made), **Site Visit Notes** (what was observed
and discussed with the contractor/site team), **Site Visit Outcomes and
Actions** (what was agreed, and who is doing what by when), and **Site
Photos** — taken with the camera or picked from the gallery right in the
form, uploaded when the visit is saved (more can still be added to a saved
visit from its card). If the visit saves but its photos fail to upload,
the panel says so rather than leaving the form open, so retrying can't
create a duplicate visit. Entries render as a stack of full-width cards rather
than the app's usual table layout — tables don't fit a narrow screen, and a
project typically has far fewer site visits than tasks or activity-log
entries, so a card per visit costs little vertical space. Each card expands
in place to show its Notes/Discussion Notes, matching the Monthly Reports
panel's expand-on-tap pattern. Like Milestones and Cash Flow entries, a
site visit is live, editable data with no month-based snapshotting — each
visit is already its own point-in-time record by nature.

Building this surfaced a pre-existing mobile layout bug: the page header's
Edit/Delete/theme-toggle/notification-bell/account-menu button row, and the
Tasks panel's "Add a task" row, didn't wrap on a narrow screen — native
`<input type="date">`/`<input type="time">` controls have a minimum
intrinsic width that doesn't shrink, so at phone width the row overflowed
sideways and forced the entire page's layout viewport wider than the
device, breaking pinch-zoom-to-fit for the whole page (not just those
rows). Fixed by allowing those rows to wrap (`flex-wrap`) across the
Dashboard, Project Detail, Reports, and Admin Users headers, and giving the
Site Visit form's own Date/Time fields a single column on narrow screens
(`grid-cols-1 sm:grid-cols-2`) rather than forcing them side by side.

### Site Photos

Each site visit card has a **Photos** section with two upload paths: **📷
Take Photo** (`<input type="file" accept="image/*" capture="environment">`,
which opens the device's camera directly on a phone) and **🖼 Add from
Gallery** (a plain multi-select file picker). Uploaded photos appear as a
thumbnail grid, click-through to the full image.

GPS coordinates and the capture time are read server-side from each
photo's own EXIF tags at upload time (`backend/src/exif.ts`, via the
`exifr` package) — never trusted from the client, the same way file type
is validated server-side for every other upload in this app. A photo
without a GPS tag (location services were off, or it came from a gallery
rather than the camera) still uploads and shows in the thumbnail grid,
just tagged "no GPS" and left off the map.

Above the site visit list, a **Site Photos** section shows every photo
across the project's site visits (not just the one being edited), with a
**Gallery / Map** toggle between two views of the same photo set
(`SitePhotosGallery.tsx` / `SitePhotosMap.tsx`, switched by local state in
`SiteVisitsPanel.tsx` — Gallery is the default, since it works with or
without GPS data):

- **Gallery** is a responsive grid of larger thumbnails, most recent
  first, each flagged with a 📍 badge if geotagged. Clicking one opens a
  full-size lightbox with Previous/Next navigation (buttons, on-screen
  arrows, or the ← → and Esc keys), a caption showing the visit's
  location and date, file size, uploader, and GPS coordinates if present,
  and a Delete action — so browsing and deleting photos no longer
  requires opening each site visit's own small thumbnail row.
- **Map** plots every geotagged photo across the project's site visits,
  with a pin per photo — clicking one opens a popup with that photo's
  thumbnail, the visit's location, and its date. This is the one
  component in the app that reaches for a mapping library: unlike the
  hand-rolled SVG/HTML charts everywhere else, real map tiles can't be
  drawn by hand, so it uses **Leaflet** with **OpenStreetMap** tiles (no
  API key required). The marker is a small inline-SVG pin via a Leaflet
  `divIcon` rather than Leaflet's bundled marker images, which sidesteps
  a well-known bundler issue where `Icon.Default`'s image paths resolve
  relative to the `leaflet` package rather than the built app and 404 in
  production.

Each site visit's own expanded card still has its small **Photos** grid
for uploading (📷 Take Photo / 🖼 Add from Gallery) and quick deletion
scoped to that visit — the project-wide Gallery/Map views are for
browsing and don't change how photos are added.

## Training & Induction Records

Each project has a **Training & Induction Records** register — site
inductions and competency certifications held by people working for a
consultant or contractor on the project (a site induction, a White Card,
Working at Heights, Confined Space, First Aid), distinct from
**Subcontractor** (a company-level engagement record) and the
**Safety, Quality & Environment** register (a one-off incident, not an
ongoing qualification). A record has a Person Name, Company, Training Type
(freeform, with suggestions), a Completion Date, an optional Expiry Date, a
Certificate Number, and Notes.

`expiryDate` is optional since some records — a one-off site induction, say
— never expire; when present it follows the same computed-not-stored
expiry pattern as Insurance & Warranties: no status field, just the date
compared against "now" (`frontend/src/trainingMeta.ts`'s
`isTrainingExpired`/`isTrainingExpiringSoon`). The panel sorts expired
records first, then expiring soon, then everything else.

The Dashboard has a portfolio-wide **Training Expiring Soon** panel
listing every expired or soon-to-expire record across every project,
soonest first. Open to any logged-in user to edit.

## Toolbox Talks

Each project has a **Toolbox Talks** log — routine on-site safety
briefings (a pre-start talk on manual handling, working at heights,
traffic management), distinct from **Meeting Minutes** (a project,
design, or progress meeting with the project team) and the
**Safety, Quality & Environment** register (a one-off incident, not a
routine briefing). A talk has a Date, Topic (freeform, with
suggestions), who Conducted it, Attendees (freeform), Key Points, and
Notes.

Like Meeting Minutes and Site Visits, this is a plain log with no status
workflow and no portfolio-wide Dashboard panel — it's too
project-specific to aggregate. The panel sorts by talk date, most recent
first. Open to any logged-in user to edit.

## Environmental Monitoring

Each project has an **Environmental Monitoring** register — routine
compliance readings (noise, dust, turbidity, vibration, groundwater
level) taken against a licence or approval condition limit, distinct
from the **Safety, Quality & Environment** register (a one-off incident,
not a scheduled quantitative sample). A reading has a Parameter
(freeform, with suggestions), Location, Monitoring Date, a Reading value
and Unit, an optional Limit value and Limit Type (must-not-exceed or
must-not-fall-below), Corrective Action, and Notes.

`limitValue` is optional — some readings are recorded for information
only, with no licence condition attached. When present, whether a
reading is an **exceedance** is computed from the reading against the
limit and limit type rather than stored, the same computed-not-stored
pattern as the expiry checks (`frontend/src/environmentalMeta.ts`'s
`isExceedance`). The panel sorts exceedances first, then most recent.

The Dashboard has a portfolio-wide **Environmental Exceedances** panel
listing every exceedance across every project, most recent first. Open
to any logged-in user to edit.

## Site Safety Inspections

Each project has a **Site Safety Inspections** register — scheduled or
ad-hoc compliance walks and audits of site conditions and contractor
practices, distinct from the **Safety, Quality & Environment** register
(a one-off incident that already happened, not a proactive assessment)
and **Toolbox Talks** (a briefing delivered to workers, not an
inspection of the site). An inspection has an Inspection Type (freeform,
with suggestions), Date, who Conducted it, Location, an optional
compliance Score (0-100), Findings, Corrective Action, and a status of
Open/In Progress/Closed for tracking any corrective action through to
completion.

`dateClosed` stamps automatically the moment status becomes Closed, the
same pattern the SQE register uses for its own closing date. The panel
sorts open/in-progress inspections first, then lowest score first within
each group.

The Dashboard has a portfolio-wide **Open Safety Inspections** panel
listing every open or in-progress inspection across every project,
lowest score first, linking back to its project. Open to any logged-in
user to edit.

## AI Assistant

Both a project's detail page and the Dashboard have an **AI Assistant**
tab — a simple ask-a-question panel backed by a self-hosted
[Ollama](https://ollama.com) model, running on the same machine that
hosts this app. There's no chat history stored anywhere: each question
and answer lives only in that tab's state for the current browser
session.

- On a **project's** AI Assistant tab, questions are scoped to that
  project — its budget vs. spend, schedule, and a summary of open items
  across every register (risks, actions, defects, RFIs, SQE issues,
  safety inspections, environmental exceedances, expired permits/
  insurance/training, low-scoring performance reviews).
- On the **Dashboard's** AI Assistant tab, questions are scoped to the
  whole portfolio — status counts, total budget vs. spend, and a
  per-project summary flagging which projects have open issues.

The backend builds this context itself from the database on every
question (`backend/src/aiContext.ts`) — a concise, bounded summary, not
a dump of every row in every table — then sends it to Ollama's `/api/chat`
endpoint alongside the question (`backend/src/ollama.ts`). No
conversation state is kept server-side either; every question is
answered fresh from the latest data.

### Configuration

Three environment variables point the backend at Ollama:

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` (docker-compose) / `http://localhost:11434` (local dev) | Where Ollama's HTTP API is reachable from the backend. |
| `OLLAMA_CHAT_MODEL` | `llama3.1` | The text/chat model — must already be pulled on that Ollama server (`ollama pull llama3.1`). Used for everything that reasons over text: the Assistant, action extraction, and transcript-to-minutes generation. `OLLAMA_MODEL` is kept as a legacy alias for this same slot. |
| `OLLAMA_VISION_MODEL` | `llava` | A vision-capable model (e.g. `llava`, `gemma3`), used only to read a photo of handwritten/whiteboard notes into text before it's handed to the chat model — see **Meeting Minutes → Generate from Transcript** above. |

`host.docker.internal` lets the `backend` container reach Ollama running
directly on the Docker host; `docker-compose.yml` adds the
`extra_hosts: host.docker.internal:host-gateway` mapping this needs on
Linux (Docker Desktop resolves it out of the box). If Ollama runs on a
different machine, point `OLLAMA_BASE_URL` at that host instead.

Ollama has no built-in authentication, so this integration assumes
Ollama is only reachable from trusted hosts (e.g. not exposed directly
to the internet). If the backend can't reach Ollama, the Assistant shows
a clear error in place of an answer rather than failing silently.

**If this app is exposed to the internet** (see "Deploying on the
internet" below), Ollama's own exposure is entirely a host-config
question this repo can't see or control — `host.docker.internal` only
works if Ollama listens on an interface the Docker bridge can reach,
which in practice means someone set `OLLAMA_HOST=0.0.0.0` on the host.
If your firewall doesn't then scope port 11434 to localhost/the Docker
subnet, Ollama's unauthenticated API is reachable from the open
internet — verify directly:
```sh
# On the host — should show 127.0.0.1 or a Docker-only address, not 0.0.0.0
ss -tlnp | grep 11434
# From OUTSIDE your network (a phone on cellular data, a friend's connection) —
# should time out or refuse, never return Ollama's version JSON
curl http://<your-public-ip>:11434/api/version
```

## Procurement

Each project has a **Procurement** tab — the one place for a project's
procurement process. It is being built up in stages; currently it holds:

- **Tenders** — the tender package register described below (moved here
  from Budget & Contract).
- **Tender Submissions & Assessment** — one row per tenderer per tender
  package: date received, tender price, whether it's conforming, an
  evaluation score (out of 100), rank, whether it's the recommended
  tenderer, and assessment notes, shown as a comparison table per package
  (`TenderSubmission` model, `/api/tender-packages/:id/submissions`).
- **Procurement Checklist** — checklist items with the `PROCUREMENT`
  phase (the same `ChecklistItem` model as Commissioning & Handover, which
  keeps showing only its own phases). An empty checklist offers a
  one-click **standard checklist** of 18 typical steps, from procurement
  plan approval through to notifying unsuccessful tenderers and recording
  the contract, which can then be edited or marked Not Applicable.

### Tenders

Each project has a **Tenders** register tracking the
process of sourcing a consultant or contractor for a package of work —
distinct from **Subcontractors**, which tracks a trade contractor
*already engaged*: this register is the process that precedes and
eventually produces an engagement, and not every package results in one
(some are cancelled before award). A tender package has an optional
Package Number, a Title and Description, a Method (Open Tender,
Selective Tender, Direct Engagement, or Expression of Interest), Date
Issued, Closing Date, Submissions Received, an Estimated Value, and a
status of Planned/Issued/Evaluation/Awarded/Cancelled. Once a package is
marked Awarded it also records who it was Awarded To and the Awarded
Value.

`dateAwarded` stamps automatically the moment status becomes Awarded,
the same pattern the EOT register uses for `dateDecided`. The panel
sorts packages currently Issued or under Evaluation first (they need
attention soonest), then Planned, with Awarded/Cancelled packages —
nothing left to do — last.

The Dashboard has a portfolio-wide **Active Tenders** panel listing
every package currently Issued or under Evaluation across every
project, soonest-closing first, linking back to its project. Open to
any logged-in user to edit.

## Tabbed Navigation

Both the Dashboard and a project's detail page had grown into one long
scroll as registers accumulated (the project page alone stacks ~20 panels).
Both now split their content into a horizontal tab bar
(`components/Tabs.tsx`, a generic underline tab bar reused by both pages)
so a screen only ever shows one section at a time:

- **Dashboard** — Projects (the filterable/searchable project table),
  Today & Upcoming (every open Task and Action/Decision across the
  portfolio, merged and bucketed by urgency), Alerts (the portfolio-wide
  "needs attention" panels for compliance/register items), Charts
  (spend-vs-budget and projects-by-status), Activity (top risks, recent
  activity feed). The header and the four stat cards — Total Projects, In
  Construction, Overdue, and Total Approved Budget (each project's Latest
  Approved Budget when set, else its Original Budget as revised by
  approved Variations, summed across the portfolio — the same
  `effectiveBudget()` figure Project Health and the Cumulative Spend
  charts use) — stay above the tabs, visible on every tab. Each card is a
shortcut: Total Projects clears the Projects tab's filters, In Construction
filters it to that status, Overdue filters it to overdue projects (shown as
a dismissible "Overdue only" chip beside the other filters — it isn't part
of a saved view), and Total Approved Budget opens the Charts tab.
- **Project detail page** — Overview (Stakeholders, Actions & Decisions,
  Activity), Schedule (Milestones, Tasks, Delays, EOT Claims, Commissioning &
  Handover), Budget & Contract (Cash Flow, Variations, Payment Claims,
  Insurance & Warranties, Permits & Approvals), Quality & Risk (Risks &
  Opportunities, SQE, Defects & Punch List, RFIs, Document Register), Site
  & Records (Site Visits, Attachments, Lessons Learned), Monthly Reporting
  (see **Monthly Reporting** above).
  The header, description, and project info field grid stay above the
  tabs, visible on every tab.

The active tab lives in the URL (`?tab=schedule`, via
`frontend/src/useTabParam.ts`; the default tab is left out to keep URLs
clean), so refreshing or pressing Back returns to the same tab, and links
can open a specific one — Today & Upcoming opens a task's project on its
Schedule tab, and Global Search opens a result on its register's tab. Every panel that was already on
these pages is still there; this only changed which section of the page
shows it.

Changing page (not just tab) scrolls back to the top, so clicking the logo
from halfway down a project page lands at the top of the dashboard rather
than midway down it.

### Sticky, Clickable Header

Every page's `<header>` — the dashboard (`/`), the project detail page,
and the standalone pages (Admin Users, Task
Templates, Lessons Learned, Reports) — has `sticky top-0 z-30`, so it
stays pinned at the top of the viewport as the content beneath it
scrolls, rather than scrolling out of view on a long Projects table, a
busy Alerts tab, or a page full of panels.

On the dashboard, the logo and title/subtitle block is wrapped in a
`Link` back to `/`, so clicking it always returns home, matching the
common "click the logo to go home" convention. On every other page
that shows the logo in its header (project detail, Admin Users,
Task Templates, Lessons Learned, Reports), just the logo itself is
wrapped in that same `Link` back to `/` — the page's own title (e.g.
the project name) is left as plain text since it isn't a "go home"
affordance. The two printable report pages
(Monthly Report view, Closeout Report) have no persistent header at
all — just a "back" link and a Print button — so they're unaffected.

### Jump To

Several project detail tabs still stack many panels (Budget & Contract
alone has eight), so a **Jump to:** row of pills
(`components/SectionJumpNav.tsx`) sits just below the tab bar, one pill per
panel in that tab, in the same top-to-bottom order they're stacked in.
Clicking one smooth-scrolls straight to that panel rather than scrolling
past everything above it first, stopping with the panel's top just below
the sticky page header (offset by the header's height, so the panel's
heading isn't hidden underneath it). Each panel is wrapped in a `<div id="...">` in
`ProjectDetailPage.tsx` that the matching pill targets; the list of
{id, label} pairs per tab is a static map there (`TAB_SECTIONS`) rather
than derived from the JSX, since the panel components themselves don't
know their own tab or position. A tab with only one section (AI Assistant)
shows no jump row at all, since there'd be nowhere else to jump to.

### Collapsing long sections

Any project section listing more than 5 items (`COLLAPSE_THRESHOLD` in
`components/CollapsibleSection.tsx`) gets a **Collapse** link above it;
collapsed, it shrinks to a one-line summary ("Risk Register · 12 items —
Expand"). When a tab has any such sections, **Expand all | Collapse all**
appears at the end of its Jump-to row. Choices are remembered in the
browser per section (so collapsing Risks keeps it collapsed on every
project), and jumping to a collapsed section expands it.

### Today & Upcoming

The Dashboard's **Today & Upcoming** tab (`TodayAndUpcomingPanel.tsx`) is
the single place to see and clear everything a PM needs to act on across
the whole portfolio, rather than checking a tasks panel and an actions
panel separately. It merges every open Task and open Action/Decision —
the same `upcomingTasks`/`actionItems` data the page already loads — into
one list, bucketed by urgency: **Overdue → Due Today → Due This Week →
Later → No Due Date** (the last bucket only ever holds Actions, since a
Task without a due date never appears in the upcoming-tasks feed at all).
Buckets are computed from calendar-day comparisons, not raw timestamp
deltas, so a due date and "now" on the same day is Due Today rather than
Overdue.

A **project manager** filter at the top narrows the list to items on that
PM's projects (portfolio-wide tasks, which belong to no project, always
show). The choice is saved to the user's account
(`User.upcomingManagerFilter`, via `PUT /api/auth/preferences`), so it
sticks across logins and devices rather than resetting each visit.

Each row shows a type badge (Task / Action / Decision), the title, a link
to its project (portfolio-wide tasks have none), an owner (Actions only),
and the due date in red once it's overdue. A checkbox on each row marks
it complete inline — `updateTask`/`updateActionItem` with `status: "DONE"`,
the same calls their own project-level panels use — so clearing something
doesn't require leaving the dashboard to open its project. A Task's due
date is also editable right here, via a date input in place of the
plain-text date (`PUT /api/tasks/:id`, the same endpoint the Schedule
tab's Tasks panel uses) — rescheduling something no longer requires
leaving the dashboard either. Actions and Decisions get the same date
input (`PUT /api/action-items/:id`), so every row's due date is editable
in place.

This tab fully supersedes two panels that used to show the same
underlying data less usefully: the Activity tab's "Upcoming Deadlines"
(Tasks only, no Actions, no inline completion) and the Alerts tab's "Open
Actions" (Actions only, no Tasks) were both removed rather than kept
alongside it — the same data in three places would be clutter, not
redundancy for safety. `GET /api/tasks/upcoming`'s result cap was raised
from 10 to 50 to match: that endpoint also feeds the notification bell,
where 10 was enough, but a dedicated tracking tab needs to show more than
the very next few before anything falls off the list.

## CSV Export

The highest-traffic registers — Risks & Opportunities, Actions & Decisions,
Defects & Punch List, RFIs, Permits & Approvals, Document Register,
Variations, Subcontractors, plus the Dashboard's project table itself —
each have an **Export CSV** button next to their "+ New X" button. It
exports exactly the rows currently loaded in that panel (same filtering/
sorting the panel already applies) via a shared client-side helper
(`frontend/src/csvExport.ts`, `components/ExportCsvButton.tsx`) — there's
no backend export endpoint, since every register's full list is already
fetched to the browser to render the panel in the first place. The file
opens correctly in Excel (UTF-8 BOM prefix, RFC 4180 quoting) for sharing
with stakeholders who don't have a login.

The remaining project registers — Contracts, Payment Claims,
Correspondence, Community Enquiries, EOT Claims, the Commissioning
checklist, Milestones, Insurance & Warranties, SQE Issues, Safety
Inspections, Training Records, Toolbox Talks, Environmental Monitoring,
Performance Reviews, Stakeholders, Tender Packages, Lessons Learned, Delays and
Site Visits — use `components/AutoExportCsvButton.tsx`, which derives the
columns from each record's own scalar fields (`csvExport.ts`'s `autoCsv`):
internal ids and timestamps are dropped, camelCase keys become headers,
ISO dates become `YYYY-MM-DD`, and enum values like `IN_PROGRESS` become
"In progress". The hand-curated panels above keep their bespoke column
order; use `ExportCsvButton` directly when a register needs one. Meeting
Minutes isn't exported — its records carry linked attachments and actions
that don't flatten into one row.

## Dashboard Filters & Saved Views

The Dashboard's Projects tab filters by status and free-text search (name/
location/manager), plus two more: a **health** filter (Green/Amber/Red,
reading the same computed `ProjectHealth.overall` the Health column shows)
and a **manager** filter (populated from whatever project managers are
actually in use, no separate list to maintain). Since a PM managing many
projects tends to reapply the same combination every visit, the current
filter state can be saved as a named view via **Save current view** —
stored in the browser's `localStorage` (`frontend/src/savedViews.ts`), not
on the server, so views are per-browser rather than shared across a team.
A **Saved views** dropdown re-applies one in a click; **Delete view**
removes the currently-selected one. The Export CSV button next to these
filters exports the currently-filtered project list, so "my overdue
projects, as a spreadsheet" is two clicks from a saved view.

## Tasks

A project's Tasks list (Schedule tab) supports full editing, not just
status and due date: **Edit** on any task switches that row to an inline
form for its title and description, with **Save**/**Cancel** — the same
`PUT /api/tasks/:id` endpoint status/due-date changes already used,
just with more fields.

Once a list has any completed tasks, a **Hide completed** link appears
beside the "x/y complete" count (it becomes **Show completed (n)** while
they're hidden). The choice is remembered in the browser, so it applies
to every task list — project and portfolio — until you switch it back.

### Recurring Tasks

Any task — a project's own or a Portfolio Task (below) — can be set to
repeat Daily, Weekly, or Monthly via the same "Repeat" selector used when
adding or editing it. Recurrence works by **recreating**, not by tracking
an ongoing series: marking a recurring task Done immediately creates the
next occurrence (same title/description, due date advanced by one
interval from the completed task's own due date, or from today if it had
none) as a new To Do row, while the completed one stays exactly as
completed history. This mirrors the delete-undo toast's "recreate, don't
restore" approach — no separate schedule/series model, just one extra
field on `Task` (`recurrence`) and a few lines in the status-update route.

### Portfolio Tasks

The Dashboard's Projects tab opens with a **Portfolio Tasks** panel —
the same task list component as a project's own Tasks, but for
reminders relevant to every project rather than any single one (e.g.
"Complete monthly reports for all projects"). A portfolio task is just a
`Task` row with no `projectId` at all, so it supports the same editing,
recurrence, and delete-undo as a project task; it's fetched and created
through `/api/tasks/portfolio` rather than a project's nested `/tasks`
route.

## Task Templates

A reusable set of tasks — e.g. a standard "Design Stage" or
"Commissioning" checklist — that can be applied to any project in one
action instead of re-entering the same boilerplate tasks every time.
Manage templates from **Task Templates** in the account menu: give a
template a name and a list of task titles, each with an optional "due N
days after start" offset (left blank, the resulting task gets no due
date). On a project's Schedule tab, above its Tasks list, **Apply a task
template…** creates one Task per template item, with due dates computed
against that project's own `startDate` at the moment it's applied — the
same template produces different actual dates on different projects.
Templates are a portfolio-wide library (`TaskTemplate`/`TaskTemplateItem`
in the schema), not tied to any one project; deleting a template never
touches tasks it already produced, since applying it just creates
ordinary Task rows with no ongoing link back to the template.

## Email Digest

An optional daily email summarizing the same items the in-app notification
bell flags — overdue/due-soon tasks and RFIs (7-day window), and
expiring/expired permits and insurance/warranties (60-day window) — on the
recipient's own projects (where they're the linked Project Manager), plus
portfolio-wide tasks. Each user gets their own list, and nothing is sent to
someone with nothing on their projects. It's opt-in at two levels, so it does nothing by default:

1. **The server needs SMTP configured.** Set `SMTP_HOST` (and optionally
   `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) in `.env` — see
   `backend/.env.example`. Leave `SMTP_HOST` unset and the feature is fully
   disabled, the same "unset env vars = integration off" pattern the
   Ollama and Engineering Archive integrations use.
2. **Each user opts in individually** from **Email Digest: Off/On** in
   their account menu — new accounts start opted out, so enabling SMTP on
   a deployment doesn't suddenly start emailing anyone who hasn't asked
   for it.

A cron job (`node-cron`, `DIGEST_CRON` env var, default 7am server-local
time daily — see `backend/src/digest.ts`) builds the digest content fresh
each run and skips sending entirely if there's nothing to report, so
opted-in users don't get empty "nothing's overdue" emails every morning.
Set `PUBLIC_APP_URL` to the deployment's externally-reachable URL to make
project names in the email clickable links back into the app; without it
the digest still sends, just as plain text project names.

## CSV Import

The same registers that have an Export CSV button (Risks & Opportunities,
Permits & Approvals, Subcontractors, Document Register) also have an
**Import CSV** button next to it. Pick a file, and the panel shows a
preview of every row it parsed before anything is sent — nothing is
created until you confirm. Each row is submitted through the same
create endpoint the "+ New X" form already uses
(`frontend/src/csvImport.ts` + `components/ImportCsvButton.tsx`), so
per-field validation is identical either way; a bad row is reported by row
number in the results screen without blocking the rows around it. The
expected header row matches that register's own CSV export, so
round-tripping an exported file (edit it in a spreadsheet, re-import)
works out of the box. Dates accept either ISO format or the app's own
display format (e.g. "20 Aug 2025"), and currency cells tolerate a `$` and
thousands separators.

## Bulk Actions

Risks & Opportunities, Actions & Decisions, Defects & Punch List, RFIs,
Permits & Approvals, Document Register, Variations, and Subcontractors
each have a checkbox on every row plus a **Select all / Deselect all**
toggle. Selecting one or more rows reveals a toolbar
(`frontend/src/components/BulkActionsBar.tsx`, backed by the
`useSelection` hook) to change status or delete every selected row in one
action, with a single confirmation covering the whole batch rather than
one dialog per row. Under the hood this loops the same per-row
update/delete calls the single-row Edit/Delete buttons already use — there
are no new bulk-specific backend endpoints — so it's subject to the exact
same validation and permission checks.

## Editable Timeline

On a project's Schedule tab, a milestone's bar on the Timeline chart can be
dragged left or right to reschedule it: grabbing the bar and releasing
updates that milestone's forecasted completion date
(`frontend/src/components/ProjectTimeline.tsx`), writing back through the
same `PUT /api/milestones/:id` endpoint the Milestones panel's own edit
form uses. A milestone that's already been marked actually complete isn't
draggable — only the forecast can move, not history. The chart previews
the new date live while dragging and only saves once you let go; a
negligible drag (under a minute of resulting date change) is treated as a
click and ignored.

## Viewer Role

A third role, alongside `MEMBER` and `ADMIN`: **`VIEWER`** gets full read
access to the whole dashboard and no create/update/delete access anywhere.
The real boundary is on the backend — `blockViewerMutations`
(`backend/src/middleware/blockViewerMutations.ts`) sits behind
`requireAuth` on every register route and rejects any non-`GET` request
from a Viewer with a 403, so this holds even if a Viewer reaches a
create/edit form through some UI path that hasn't been explicitly hidden.
The frontend additionally hides the highest-traffic entry points for a
better experience — the Dashboard's "+ New Project" button and the project
table's Edit/Delete column (`canModifyProject`/`canModifyReport` in
`frontend/src/permissions.ts` both return `false` for a Viewer) — rather
than touching every one of the dozens of register panels individually;
anywhere a Viewer does trigger a mutation, the backend's 403 surfaces
through the same error-message UI every form already has. AI Assistant
queries are intentionally exempt from the block, since they don't
mutate project data.

## Undo for Deletes

Every delete across the project detail page's registers — tasks,
milestones, cash flow entries, risks, actions, stakeholders, permits,
lessons learned, meeting minutes, and every other register — shows a brief
"Deleted. Undo" toast in the bottom-right of the screen for 8 seconds.
Clicking **Undo** recreates the row from the data it had just before
deletion; letting the toast expire (or dismissing it with the × button)
discards it as before. Deleting several rows in a row stacks a toast for
each, so an earlier delete's undo window isn't lost when a later one
appears.

The mechanism is `UndoToastProvider`/`useUndoToast()`
(`frontend/src/undo/UndoToastContext.tsx`), mounted once at the app root
alongside the other cross-cutting providers, so any page's delete handler
can call `notifyUndo(message, onUndo)` without prop-drilling. "Undo" is
implemented as **recreate**, not a true restore: it calls back into the
same create endpoint the row's Add form already uses, so the restored row
gets a new ID and creation timestamp. Two categories are deliberately left
without undo — deleting a whole Project (too destructive/cascading to
safely reverse), and deleting an Attachment or a Site Visit Photo (the
underlying file is removed from disk immediately, so there's nothing left
to restore). Undoing a Meeting Minutes deletion restores the record's own
fields, but its cascade-deleted Attachments and any linked Action Items
are not restored — the toast's message says so explicitly.

### Confirm Dialogs

Every "Delete …? This cannot be undone." prompt uses an in-app dialog
(`ConfirmProvider`/`useConfirm()` in
`frontend/src/confirm/ConfirmContext.tsx`, mounted at the app root next to
the undo toasts) instead of the browser's plain `window.confirm()` popup,
so it matches the app's styling and dark mode. It keeps the same
contract — resolves `true` to go ahead, `false` to cancel — with the
red **Delete** (or **Remove**) button focused so Enter confirms, and Esc,
**Cancel**, or clicking outside cancels.

## Faster First Load

Each page is loaded as its own chunk (`React.lazy` routes in
`frontend/src/App.tsx`) rather than one ~1.5 MB bundle, so opening the
dashboard no longer downloads the project page's charts, map, and PDF
libraries up front — the initial script is now ~200 KB, with the rest
fetched the first time a page that needs it is opened.

## Roadmap ideas (not built yet)

This is intentionally a starting point. Natural next steps to discuss:

- SMS delivery for deadline notifications (today: in-app via the
  notification bell, and email via the opt-in daily digest above)
- Integration with existing GVW systems (e.g. finance, GIS/asset data)

## Project structure

```
backend/    Express API + Prisma schema/migrations
frontend/   React dashboard (Vite)
docker-compose.yml
```
