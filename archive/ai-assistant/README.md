# Archived: AI Assistant

The **AI Assistant** tab (on each project and on the main dashboard) was
retired in version 1.43. Its code is kept here, outside the build, so it
can be brought back later. The last release that shipped it is the commit
`e6d1b15` (version 1.42).

What it did: a chat box that answered questions about one project (or the
whole portfolio) using a locally hosted Ollama model, with a text summary
of the project's registers as context.

## Files

| Archived file | Original location |
| --- | --- |
| `backend/aiContext.ts` | `backend/src/aiContext.ts` — builds the project/portfolio text context |
| `backend/routes/ai.ts` | `backend/src/routes/ai.ts` — `POST /api/projects/:id/ai/ask` and `POST /api/ai/ask` |
| `frontend/components/AiAssistantPanel.tsx` | `frontend/src/components/AiAssistantPanel.tsx` — the chat panel |

## Restoring it

1. Move the three files back to their original locations.
2. Backend: in `src/index.ts` import `aiRouter` from `./routes/ai` and mount
   it with `app.use("/api/ai", requireAuth, aiRouter)`; in
   `src/routes/projects.ts` import the default export of `./ai` and mount it
   with `router.use("/:id/ai", projectAiRouter)`.
3. Frontend: add `askProjectAi` / `askPortfolioAi` back to `src/api.ts`
   (POST `/projects/:id/ai/ask` and `/ai/ask` with `{ question }`, returning
   `{ answer }`), and add an `"ai"` tab rendering `AiAssistantPanel` to
   `ProjectDetailPage.tsx` and `DashboardPage.tsx`. `git show e6d1b15` has
   the exact code.
4. It needs Ollama configured (`OLLAMA_BASE_URL`, `OLLAMA_CHAT_MODEL`), the
   same settings the meeting-minutes AI features still use.

The archived code may need small updates if the data model has changed
since: it reads most project registers through Prisma.
