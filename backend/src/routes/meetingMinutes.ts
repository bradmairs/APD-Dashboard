import { Request, Response, Router } from "express";
import { prisma } from "../prisma";
import { describeMeetingMinutesUpdate, logActivity } from "../activityLog";
import { randomUUID } from "crypto";
import { askOllama, askOllamaJson, askOllamaVision, OllamaError } from "../ollama";
import { extractTextFromDocument, isImageUpload } from "../transcriptExtraction";
import { transcriptUpload } from "../upload";

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  return value ? new Date(value as string) : null;
}

function parseRequiredDate(value: unknown): Date | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

interface SuggestedAction {
  title: string;
  ownerName: string | null;
  dueDateHint: string | null;
}

const MAX_SUGGESTED_ACTIONS = 15;
const MAX_TITLE_LENGTH = 200;

function coerceSuggestedAction(value: unknown): SuggestedAction | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, MAX_TITLE_LENGTH) : "";
  if (!title) return null;
  const ownerName = typeof raw.ownerName === "string" && raw.ownerName.trim() ? raw.ownerName.trim() : null;
  const dueDateHint =
    typeof raw.dueDateHint === "string" && raw.dueDateHint.trim() ? raw.dueDateHint.trim() : null;
  return { title, ownerName, dueDateHint };
}

// Ollama is asked for strict JSON but, being a free-text model, sometimes
// wraps it in a markdown code fence or adds a leading sentence — this
// tries the whole response first, then just the bracketed substring, and
// only falls back to treating bullet/numbered lines as title-only
// suggestions if neither parses. Never throws: a response this can't make
// sense of just yields no suggestions.
function parseSuggestedActions(raw: string): SuggestedAction[] {
  const attempts: string[] = [raw];
  const bracketMatch = raw.match(/\[[\s\S]*\]/);
  if (bracketMatch) attempts.push(bracketMatch[0]);

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (Array.isArray(parsed)) {
        const actions = parsed
          .map(coerceSuggestedAction)
          .filter((a): a is SuggestedAction => a !== null);
        if (actions.length > 0) return actions.slice(0, MAX_SUGGESTED_ACTIONS);
      }
    } catch {
      // try the next attempt
    }
  }

  const lines = raw
    .split("\n")
    .map((line) => line.replace(/^[\s*\-\d.)]+/, "").trim())
    .filter((line) => line.length > 3 && line.length <= MAX_TITLE_LENGTH);
  return lines.slice(0, MAX_SUGGESTED_ACTIONS).map((title) => ({
    title,
    ownerName: null,
    dueDateHint: null,
  }));
}

const EXTRACT_ACTIONS_SYSTEM_PROMPT =
  "You are an assistant embedded in a project management dashboard for Goulburn Valley Water, " +
  "a water utility. You extract clear, actionable follow-up items from meeting notes for a " +
  "construction or infrastructure project delivered by consultants and contractors. " +
  "Respond with ONLY a JSON array, no other text and no markdown code fences. Each element must " +
  'have the shape {"title": string, "ownerName": string or null, "dueDateHint": string or null} ' +
  "— title is a short, clear description of the follow-up task; ownerName is who is responsible " +
  "if the notes say so, otherwise null; dueDateHint is any date or timeframe mentioned, as free " +
  "text, otherwise null. If the notes contain no follow-up items, respond with an empty array [].";

// A raw transcript (auto-generated captions, a typed record, or OCR output
// from a photo of notes) is messier than the minutes a PM would write by
// hand — filler speech, no structure, and often far longer than one model
// call can hold. Generation therefore runs in passes (see runDraftJob):
// each section of the transcript is read for its discussion items and
// actions, the sections are merged, and a short final pass writes the
// overview from the merged items. Asking for "topics with their talking
// points" is a task a small local model does far more completely than
// "write detailed notes", which tends to collapse to one thin paragraph.
const EXTRACT_SECTION_SYSTEM_PROMPT =
  "You are an assistant embedded in a project management dashboard for Goulburn Valley Water, " +
  "a water utility. You read a meeting transcript — auto-generated captions, a typed record, or " +
  "transcribed handwritten notes, which may be messy or full of filler speech — for a " +
  "construction or infrastructure project delivered by consultants and contractors, and pull out " +
  "what was discussed. Respond with ONLY a JSON object of the shape " +
  '{"attendees": string or null, "discussionItems": [{"topic": string, "points": [string], ' +
  '"decision": string or null}], "actions": [{"title": string, "ownerName": string or null, ' +
  '"dueDateHint": string or null}]}. ' +
  "attendees is a comma-separated list of names mentioned as present, otherwise null. " +
  "discussionItems lists each distinct subject discussed, in the order it came up: topic is a " +
  "short heading (2-6 words); points are the talking points under it — each one a complete, " +
  "concise sentence in the third person and past tense saying WHO raised, reported or agreed " +
  "WHAT (for example 'Sam confirmed the handrails will be delivered on Friday 3 October.'), " +
  "keeping the specifics (names, quantities, dates, figures, concerns raised). Never copy " +
  "speech word for word or use I, we, me or you, and leave out greetings, filler and chit-chat. " +
  "decision is what was agreed or decided on that subject, only if something actually was, " +
  "otherwise null — do not repeat the decision as one of the points. " +
  "actions lists EVERY follow-up task someone committed to or was asked to do — including " +
  "promises like 'I will…', 'we\'ll…' or 'will do' (the owner is whoever is speaking, or the " +
  "person or company they speak for, when the speaker is named) and requests like 'X, please…' " +
  "or 'X to…': title is a short description of the task; ownerName is the person who has to DO " +
  "it (if 'Sam asked Alex to chase the permit', the owner is Alex, not Sam); dueDateHint is " +
  "any date or timeframe mentioned, as free text, otherwise null. Use only what the transcript says — never " +
  "invent topics, people, dates or actions. If the text is one section of a longer transcript, " +
  "cover only this section. If it contains nothing useful, return null, [] and [].";

const SUMMARISE_MINUTES_SYSTEM_PROMPT =
  "You are an assistant embedded in a project management dashboard for Goulburn Valley Water, " +
  "a water utility. You are given the discussion items recorded at a construction or " +
  'infrastructure project meeting. Respond with ONLY a JSON object {"title": string or null, ' +
  '"meetingType": string or null, "summary": string or null}. title is a short, specific ' +
  "heading for this meeting (3-8 words) naming its main subject, such as \"Pump Station Stage 2 " +
  'Handover Planning", otherwise null. meetingType is a short label such as "Progress Meeting", ' +
  '"Design Review" or "Site Meeting" if inferable, otherwise null. summary is a 2-4 sentence ' +
  "overview for someone who was not there: the main subjects covered and any key decisions. " +
  "Use only the information given.";

const OCR_TRANSCRIPT_SYSTEM_PROMPT =
  "You transcribe text from a photo of handwritten or printed meeting notes for a construction " +
  "project management dashboard. Respond with ONLY the transcribed text, verbatim, in reading " +
  "order, with no commentary, no markdown formatting, and no preamble such as 'Here is the " +
  "transcription'. If the image contains no legible text, respond with an empty string.";

interface MeetingMinutesDraft {
  title: string | null;
  meetingType: string | null;
  summary: string | null;
  attendees: string | null;
  notes: string | null;
  actions: SuggestedAction[];
}

const MAX_FREE_TEXT_LENGTH = 5000;

function coerceDraftText(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, MAX_FREE_TEXT_LENGTH)
    : null;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const attempts = [raw, raw.match(/\{[\s\S]*\}/)?.[0]];
  for (const attempt of attempts) {
    if (!attempt) continue;
    try {
      const parsed = JSON.parse(attempt);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // try the next attempt
    }
  }
  return null;
}

interface DiscussionItem {
  topic: string;
  points: string[];
  decision: string | null;
}

const MAX_DISCUSSION_ITEMS = 40;
const MAX_POINTS_PER_ITEM = 10;
const MAX_POINT_LENGTH = 600;
const MAX_DRAFT_ACTIONS = 25;

function coerceDiscussionItem(value: unknown): DiscussionItem | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const topic = typeof raw.topic === "string" ? raw.topic.trim().slice(0, MAX_TITLE_LENGTH) : "";
  const points = Array.isArray(raw.points)
    ? raw.points
        .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
        .map((p) => p.trim().slice(0, MAX_POINT_LENGTH))
        .slice(0, MAX_POINTS_PER_ITEM)
    : [];
  const decision = coerceDraftText(raw.decision)?.slice(0, MAX_POINT_LENGTH) ?? null;
  // Models often restate the decision as a bullet too; show it once.
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (decision) {
    const key = norm(decision.replace(/^decision\s*:?\s*/i, ""));
    points.splice(0, points.length, ...points.filter((p) => !norm(p).includes(key) && !key.includes(norm(p))));
  }
  if (!topic || (points.length === 0 && !decision)) return null;
  return { topic, points, decision };
}

interface TranscriptSection {
  attendees: string[];
  items: DiscussionItem[];
  actions: SuggestedAction[];
}

function parseSection(raw: string): TranscriptSection | null {
  const parsed = parseJsonObject(raw);
  if (!parsed) return null;
  return {
    attendees:
      typeof parsed.attendees === "string"
        ? parsed.attendees.split(/[,;\n]/).map((a) => a.trim()).filter(Boolean)
        : [],
    items: Array.isArray(parsed.discussionItems)
      ? parsed.discussionItems.map(coerceDiscussionItem).filter((i): i is DiscussionItem => i !== null)
      : [],
    actions: Array.isArray(parsed.actions)
      ? parsed.actions.map(coerceSuggestedAction).filter((a): a is SuggestedAction => a !== null)
      : [],
  };
}

const ACTION_STOPWORDS = new Set(["the", "and", "for", "with", "from", "that", "this", "into", "about", "then"]);

// The model rewords the same verb between passes; fold the common ones
// together so "issue the programme" and "send the programme" compare equal.
const ACTION_VERB_SYNONYMS: Record<string, string> = {
  issue: "send",
  email: "send",
  forward: "send",
  submit: "send",
  phone: "call",
  ring: "call",
  contact: "call",
};

function actionTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !ACTION_STOPWORDS.has(w))
      .map((w) => ACTION_VERB_SYNONYMS[w] ?? w)
  );
}

// A closing recap ("to summarise the actions…") or a section boundary makes
// the model list the same follow-up twice in different words, so exact-title
// matching leaves duplicates. Two titles count as the same action when the
// smaller one's meaningful words are (almost) all contained in the other's.
function isSameAction(a: SuggestedAction, b: SuggestedAction): boolean {
  const ta = actionTokens(a.title);
  const tb = actionTokens(b.title);
  const smaller = Math.min(ta.size, tb.size);
  if (smaller < 2) return a.title.toLowerCase() === b.title.toLowerCase();
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / smaller >= 0.75;
}

// "Alan" and "Alan Tyson" in the same list are one person.
function dedupeAttendees(names: string[]): string[] {
  const unique = [...new Map(names.map((n) => [n.toLowerCase(), n])).values()];
  return unique.filter(
    (name) =>
      !(
        !name.includes(" ") &&
        unique.some((other) => other !== name && other.toLowerCase().startsWith(`${name.toLowerCase()} `))
      )
  );
}

// The same subject often runs across a section boundary (or comes up twice),
// so sections are merged by topic and de-duplicated rather than concatenated.
function mergeSections(sections: TranscriptSection[]): TranscriptSection {
  const attendees: string[] = [];
  const items = new Map<string, DiscussionItem>();
  const actions: SuggestedAction[] = [];

  for (const section of sections) {
    attendees.push(...section.attendees);
    for (const item of section.items) {
      const key = item.topic.toLowerCase();
      const existing = items.get(key);
      if (!existing) {
        items.set(key, { ...item, points: [...item.points] });
        continue;
      }
      const seen = new Set(existing.points.map((p) => p.toLowerCase()));
      for (const point of item.points) {
        if (!seen.has(point.toLowerCase())) existing.points.push(point);
      }
      if (item.decision && item.decision !== existing.decision) {
        existing.decision = existing.decision ? `${existing.decision}; ${item.decision}` : item.decision;
      }
    }
    for (const action of section.actions) {
      if (!actions.some((existing) => isSameAction(existing, action))) actions.push(action);
    }
  }

  return {
    attendees: dedupeAttendees(attendees),
    items: [...items.values()].slice(0, MAX_DISCUSSION_ITEMS),
    actions: actions.slice(0, MAX_DRAFT_ACTIONS),
  };
}

// Plain text on purpose: it lands in the Notes textarea (and the saved PDF)
// for the PM to edit, so it reads as ordinary minutes rather than markup.
function formatDiscussionNotes(items: DiscussionItem[]): string {
  return items
    .map((item) => {
      const lines = [item.topic, ...item.points.map((p) => `- ${p}`)];
      if (item.decision) lines.push(`Decision: ${item.decision}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

const TRANSCRIPT_SECTION_CHARS = 10000;
const MAX_TRANSCRIPT_CHARS = 150000;

// Splits on line, then sentence, then hard-slice boundaries so a transcript
// pasted as one enormous line still ends up in bounded sections.
function splitTranscript(text: string): string[] {
  const limit = TRANSCRIPT_SECTION_CHARS;
  const pieces = text.split(/\n+/).flatMap((line) => {
    if (line.length <= limit) return [line];
    return line.split(/(?<=[.!?])\s+/).flatMap((sentence) => {
      if (sentence.length <= limit) return [sentence];
      return sentence.match(new RegExp(`.{1,${limit}}`, "g")) ?? [];
    });
  });
  const sections: string[] = [];
  let current = "";
  for (const piece of pieces) {
    if (current && current.length + piece.length + 1 > limit) {
      sections.push(current);
      current = piece;
    } else {
      current = current ? `${current}\n${piece}` : piece;
    }
  }
  if (current) sections.push(current);
  return sections;
}

// A long transcript takes minutes on a local model, which is longer than the
// reverse proxies in front of this app will hold a single request open (60s
// by default) — so generation runs as an in-memory background job the client
// polls. A restart just drops running jobs; the client sees "expired" and
// the user retries.
interface DraftJob {
  userId: string;
  status: "running" | "done" | "error";
  progress: string;
  draft?: MeetingMinutesDraft;
  error?: string;
  createdAt: number;
}

const draftJobs = new Map<string, DraftJob>();
const DRAFT_JOB_TTL_MS = 30 * 60 * 1000;

function pruneDraftJobs() {
  const cutoff = Date.now() - DRAFT_JOB_TTL_MS;
  for (const [id, job] of draftJobs) {
    if (job.createdAt < cutoff) draftJobs.delete(id);
  }
}

async function runDraftJob(
  job: DraftJob,
  source: { pastedText: string; file?: Express.Multer.File }
) {
  try {
    let fileText = "";
    if (source.file) {
      job.progress = "Reading the uploaded file…";
      try {
        fileText = isImageUpload(source.file)
          ? await askOllamaVision(
              OCR_TRANSCRIPT_SYSTEM_PROMPT,
              "Transcribe all text visible in this image of meeting notes.",
              source.file.buffer.toString("base64")
            )
          : await extractTextFromDocument(source.file);
      } catch (err) {
        if (err instanceof OllamaError) throw err;
        throw new DraftInputError(
          err instanceof Error ? err.message : "Could not read the uploaded file"
        );
      }
    }

    const transcript = [fileText.trim(), source.pastedText].filter(Boolean).join("\n\n");
    if (!transcript) {
      throw new DraftInputError("Provide a transcript — paste text, or upload a file or a photo of notes");
    }
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      throw new DraftInputError(
        `That transcript is too long to process in one go (${transcript.length.toLocaleString()} characters; the limit is ${MAX_TRANSCRIPT_CHARS.toLocaleString()}). Split it into parts and generate each separately.`
      );
    }

    const parts = splitTranscript(transcript);
    const sections: TranscriptSection[] = [];
    const unparsed: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      job.progress =
        parts.length > 1 ? `Reading part ${i + 1} of ${parts.length}…` : "Reading the transcript…";
      const raw = await askOllamaJson(
        EXTRACT_SECTION_SYSTEM_PROMPT,
        parts.length > 1 ? `This is part ${i + 1} of ${parts.length} of a longer transcript.\n\n${parts[i]}` : parts[i]
      );
      const section = parseSection(raw);
      if (section) sections.push(section);
      else unparsed.push(raw);
    }

    const merged = mergeSections(sections);
    const notes = merged.items.length > 0 ? formatDiscussionNotes(merged.items) : null;

    let title: string | null = null;
    let meetingType: string | null = null;
    let summary: string | null = null;
    if (notes) {
      job.progress = "Writing the summary…";
      const overview = parseJsonObject(await askOllamaJson(SUMMARISE_MINUTES_SYSTEM_PROMPT, notes));
      title = coerceDraftText(overview?.title)?.slice(0, MAX_TITLE_LENGTH) ?? null;
      meetingType = coerceDraftText(overview?.meetingType)?.slice(0, MAX_TITLE_LENGTH) ?? null;
      summary = coerceDraftText(overview?.summary);
    }

    job.draft = {
      title,
      meetingType,
      summary,
      attendees: merged.attendees.length > 0 ? merged.attendees.join(", ").slice(0, MAX_FREE_TEXT_LENGTH) : null,
      // If the model never produced usable structure, keep what it did say
      // rather than discarding it silently.
      notes: notes ?? (sections.length === 0 ? coerceDraftText(unparsed.join("\n\n")) : null),
      actions: merged.actions,
    };
    job.status = "done";
  } catch (err) {
    job.status = "error";
    job.error =
      err instanceof OllamaError || err instanceof DraftInputError
        ? err.message
        : "Failed to generate meeting minutes from the transcript";
  }
}

class DraftInputError extends Error {}

const projectMeetingMinutesRouter = Router({ mergeParams: true });

type ProjectParams = { id: string };

projectMeetingMinutesRouter.get("/", async (req: Request<ProjectParams>, res: Response) => {
  const meetings = await prisma.meetingMinutes.findMany({
    where: { projectId: req.params.id },
    orderBy: { meetingDate: "desc" },
  });
  res.json(meetings);
});

projectMeetingMinutesRouter.post("/", async (req: Request<ProjectParams>, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const { title, meetingDate, meetingType, location, attendees, summary, nextMeetingDate, notes } =
    req.body as Record<string, unknown>;

  const parsedMeetingDate = parseRequiredDate(meetingDate);
  if (!parsedMeetingDate) {
    return res.status(400).json({ error: "A valid meeting date is required" });
  }

  const meeting = await prisma.meetingMinutes.create({
    data: {
      projectId: req.params.id,
      title: typeof title === "string" && title.trim() ? title.trim() : null,
      meetingDate: parsedMeetingDate,
      meetingType: (meetingType as string) || null,
      location: (location as string) || null,
      attendees: (attendees as string) || null,
      summary: (summary as string) || null,
      nextMeetingDate: parseDate(nextMeetingDate) ?? null,
      notes: (notes as string) || null,
      recordedById: req.user!.sub,
      recordedByName: req.user!.name,
    },
  });

  await logActivity({
    projectId: project.id,
    projectName: project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: meeting.title
      ? `recorded meeting minutes "${meeting.title}"`
      : `recorded meeting minutes${meeting.meetingType ? ` for a ${meeting.meetingType}` : ""}`,
  });

  res.status(201).json(meeting);
});

// Starts a background generation job and returns its id right away — see
// DraftJob for why this isn't a single request/response.
projectMeetingMinutesRouter.post(
  "/ai/generate-draft",
  transcriptUpload.single("file"),
  async (req: Request<ProjectParams>, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const pastedText = typeof req.body.text === "string" ? req.body.text.trim() : "";
    const file = req.file;
    if (!pastedText && !file) {
      return res.status(400).json({
        error: "Provide a transcript — paste text, or upload a file or a photo of notes",
      });
    }

    pruneDraftJobs();
    const jobId = randomUUID();
    const job: DraftJob = {
      userId: req.user!.sub,
      status: "running",
      progress: "Starting…",
      createdAt: Date.now(),
    };
    draftJobs.set(jobId, job);
    void runDraftJob(job, { pastedText, file });
    res.status(202).json({ jobId });
  }
);

projectMeetingMinutesRouter.get(
  "/ai/generate-draft/:jobId",
  (req: Request<ProjectParams & { jobId: string }>, res: Response) => {
    const job = draftJobs.get(req.params.jobId);
    // Same 404 for "not yours" as "doesn't exist" — don't confirm another
    // user's job id is real.
    if (!job || job.userId !== req.user!.sub) {
      return res
        .status(404)
        .json({ error: "That generation has expired — please generate again" });
    }
    res.json({ status: job.status, progress: job.progress, draft: job.draft, error: job.error });
  }
);

export const meetingMinutesRouter = Router();

meetingMinutesRouter.post("/:id/ai/extract-actions", async (req, res) => {
  const meeting = await prisma.meetingMinutes.findUnique({ where: { id: req.params.id } });
  if (!meeting) return res.status(404).json({ error: "Meeting minutes not found" });

  const notesText = [meeting.summary, meeting.notes].filter(Boolean).join("\n\n");
  if (!notesText.trim()) {
    return res
      .status(400)
      .json({ error: "Add a summary or notes to this meeting before extracting actions" });
  }

  const userPrompt = [
    `Meeting: ${meeting.title || meeting.meetingType || "Meeting"} on ${meeting.meetingDate.toISOString().slice(0, 10)}`,
    meeting.attendees ? `Attendees: ${meeting.attendees}` : null,
    meeting.summary ? `Summary:\n${meeting.summary}` : null,
    meeting.notes ? `Notes:\n${meeting.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const raw = await askOllama(EXTRACT_ACTIONS_SYSTEM_PROMPT, userPrompt);
    const actions = parseSuggestedActions(raw);
    res.json({ actions });
  } catch (err) {
    if (err instanceof OllamaError) {
      return res.status(502).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to extract actions from the AI assistant" });
  }
});

meetingMinutesRouter.put("/:id", async (req, res) => {
  const before = await prisma.meetingMinutes.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!before) return res.status(404).json({ error: "Meeting minutes not found" });

  const { title, meetingDate, meetingType, location, attendees, summary, nextMeetingDate, notes } =
    req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};

  if (title !== undefined) data.title = typeof title === "string" && title.trim() ? title.trim() : null;
  const date = parseDate(meetingDate);
  if (date !== undefined) data.meetingDate = date ?? before.meetingDate;
  if (meetingType !== undefined) data.meetingType = meetingType || null;
  if (location !== undefined) data.location = location || null;
  if (attendees !== undefined) data.attendees = attendees || null;
  if (summary !== undefined) data.summary = summary || null;
  const nextDate = parseDate(nextMeetingDate);
  if (nextDate !== undefined) data.nextMeetingDate = nextDate;
  if (notes !== undefined) data.notes = notes || null;

  try {
    const meeting = await prisma.meetingMinutes.update({
      where: { id: req.params.id },
      data,
    });
    await logActivity({
      projectId: before.project.id,
      projectName: before.project.name,
      userId: req.user!.sub,
      userName: req.user!.name,
      action: describeMeetingMinutesUpdate(before),
    });
    res.json(meeting);
  } catch (err) {
    res.status(400).json({ error: "Unable to update meeting minutes" });
  }
});

meetingMinutesRouter.delete("/:id", async (req, res) => {
  const meeting = await prisma.meetingMinutes.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!meeting) return res.status(404).json({ error: "Meeting minutes not found" });

  await logActivity({
    projectId: meeting.project.id,
    projectName: meeting.project.name,
    userId: req.user!.sub,
    userName: req.user!.name,
    action: meeting.title
      ? `deleted meeting minutes "${meeting.title}"`
      : `deleted meeting minutes${meeting.meetingType ? ` for a ${meeting.meetingType}` : ""}`,
  });
  await prisma.meetingMinutes.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default projectMeetingMinutesRouter;
