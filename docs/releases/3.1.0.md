# APD Project Management Dashboard 3.1.0

**Your Tool Suggestions: Ideas & Notes, workbook data import, spell check, What's new and clearer labels.**

## New
- **Ideas & Notes** on every project (Overview tab), for brainstorming:
  - Coloured note cards with tags, pinning, search and tag filters, plus a quick "jot an idea" box.
  - Link notes like Obsidian with `[[Note title]]`. Each note lists what it links to and what links to it, and a link to a note that doesn't exist yet creates it.
  - **Export to Obsidian** downloads every note as Markdown files, with tags and dates, plus an index note. Unzip the folder into your Obsidian vault.
  - **Import .md** brings Obsidian or other Markdown notes in.
- **Update the project from the monthly report workbook:**
  - When you upload a workbook or pull it from SharePoint, tick **Also update cash flow & schedule**.
  - This copies the workbook's monthly cash flow (actuals up to the report month, forecasts after), its milestones and its approved completion date into the project.
  - Tick **Overwrite existing** to replace values already in the dashboard; otherwise only blanks are filled in.
- **What's new:** after an update, the first visit shows this summary once. Reopen it any time from your avatar menu.
- **Spell check** (Australian English) in every text box and formatted text field. Search boxes are left alone.

## Changed
- **Dashboard tiles follow the manager filter.** With My projects or a project manager selected, Total projects, In construction, Overdue and Total approved budget count only those projects, and say whose they are.
- **"Target Completion" is now "Approved Completion Target"** everywhere: forms, tables, project pages, reports, charts and history.
- **The dashboard's budget column is now Latest Approved Budget.** It shows the original budget when it hasn't changed, and hovering shows the original. The board cards use it too.
- **The formatting toolbar stays at the top** while you scroll through long text such as meeting minutes.

## Already in place
- **Automatic Meeting Minute Actions:** attaching Word minutes picks out the project manager's actions and asks you to confirm them (since 2.3.0 and 2.4.0).
- **Monthly Reporting:** the workbook-matching monthly report with SharePoint sync (since 2.0.0).

Both can be marked Done in Tool Suggestions.

## Update

On the server: `git pull`, then `docker compose up -d --build`. One new table (project notes) is added when the backend starts; nothing existing is changed. The left menu should then show v3.1.0.
