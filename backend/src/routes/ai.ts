import { Request, Response, Router } from "express";
import { askOllama, OllamaError } from "../ollama";
import { buildPortfolioContext, buildProjectContext } from "../aiContext";

const MAX_QUESTION_LENGTH = 2000;

function parseQuestion(body: unknown): string | null {
  const question = (body as Record<string, unknown> | undefined)?.question;
  if (typeof question !== "string" || !question.trim()) return null;
  return question.trim().slice(0, MAX_QUESTION_LENGTH);
}

const SYSTEM_PROMPT_PREFIX =
  "You are an assistant embedded in a project management dashboard for Goulburn Valley Water, " +
  "a water utility. You help project managers understand the status of their construction and " +
  "infrastructure projects, delivered by consultants and contractors. Answer clearly and " +
  "concisely using only the data provided below. If the data doesn't answer the question, say " +
  "so rather than guessing. Every date below is already annotated with its exact distance from " +
  "today (e.g. '(in 12 days)' or '(5 days ago)') and marked OVERDUE where relevant — use those " +
  "given annotations rather than computing date differences yourself, and don't call a target " +
  "completion date 'overdue' on your own initiative unless it is explicitly marked OVERDUE: a " +
  "project already in Defects Liability, Complete, or Cancelled status has passed that date by " +
  "design, not because it's late.";

const projectAiRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectAiRouter.post("/ask", async (req: Request<ProjectParams>, res: Response) => {
  const question = parseQuestion(req.body);
  if (!question) return res.status(400).json({ error: "A question is required" });

  const context = await buildProjectContext(req.params.id);
  if (context === null) return res.status(404).json({ error: "Project not found" });

  const systemPrompt = `${SYSTEM_PROMPT_PREFIX}\n\nProject data:\n${context}`;
  try {
    const answer = await askOllama(systemPrompt, question);
    res.json({ answer });
  } catch (err) {
    if (err instanceof OllamaError) {
      return res.status(502).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to get a response from the AI assistant" });
  }
});

export const aiRouter = Router();

aiRouter.post("/ask", async (req: Request, res: Response) => {
  const question = parseQuestion(req.body);
  if (!question) return res.status(400).json({ error: "A question is required" });

  const context = await buildPortfolioContext();
  const systemPrompt = `${SYSTEM_PROMPT_PREFIX} You have visibility across the whole project portfolio, not just one project.\n\nPortfolio data:\n${context}`;
  try {
    const answer = await askOllama(systemPrompt, question);
    res.json({ answer });
  } catch (err) {
    if (err instanceof OllamaError) {
      return res.status(502).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to get a response from the AI assistant" });
  }
});

export default projectAiRouter;
