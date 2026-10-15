// Thin client for a self-hosted Ollama server — the model runs on the same
// machine that hosts this app, reached over the Docker bridge network via
// OLLAMA_BASE_URL (host.docker.internal from inside the backend container;
// see docker-compose.yml's extra_hosts entry). No API key: Ollama's HTTP
// API is unauthenticated, so this is only appropriate for a trusted host.
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://host.docker.internal:11434";

// Two separate model slots for two separate jobs: a text/chat model (e.g.
// llama3.1, gemma2) for everything that reasons over already-textual
// project data or a transcript, and a vision-capable model (e.g. llava,
// gemma3) for reading an image (a photo of handwritten or whiteboard
// notes) into text in the first place. OLLAMA_MODEL is kept as the legacy
// env var name and falls back into the chat slot so existing deployments
// that only set it keep working unchanged.
const OLLAMA_CHAT_MODEL =
  process.env.OLLAMA_CHAT_MODEL || process.env.OLLAMA_MODEL || "llama3.1";
const OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL || "llava";

// Ollama's own default context window is small (a few thousand tokens) and
// it silently drops the oldest text when a prompt exceeds it — fine for a
// short question, not for a transcript or a whole-portfolio summary. Pinned
// explicitly so behaviour doesn't depend on whatever the server defaults to.
const OLLAMA_NUM_CTX = Number(process.env.OLLAMA_NUM_CTX) || 8192;

export class OllamaError extends Error {}

interface OllamaChatResponse {
  message?: { content?: string };
}

async function chatRequest(
  model: string,
  systemPrompt: string,
  userPrompt: string,
  images?: string[],
  opts: { json?: boolean; temperature?: number } = {}
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt, ...(images ? { images } : {}) },
        ],
        stream: false,
        // Constrains the model to emit syntactically valid JSON, which a
        // free-text prompt alone ("respond with ONLY JSON") doesn't reliably
        // get from an 8B local model.
        ...(opts.json ? { format: "json" } : {}),
        options: {
          num_ctx: OLLAMA_NUM_CTX,
          ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        },
      }),
    });
  } catch (err) {
    throw new OllamaError(
      `Could not reach Ollama at ${OLLAMA_BASE_URL}. Confirm Ollama is running on the host and OLLAMA_BASE_URL is set correctly.`
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 404) {
      throw new OllamaError(
        `Ollama doesn't have model "${model}" pulled. Run "ollama pull ${model}" on the host, or set the appropriate OLLAMA_CHAT_MODEL/OLLAMA_VISION_MODEL env var to a model you have.`
      );
    }
    throw new OllamaError(`Ollama returned an error (${res.status}): ${body || res.statusText}`);
  }

  const data = (await res.json()) as OllamaChatResponse;
  const answer = data.message?.content?.trim();
  if (!answer) {
    throw new OllamaError("Ollama returned an empty response.");
  }
  return answer;
}

// Text-in, text-out — the chat model, used for everything from answering
// portfolio questions to turning a transcript into structured minutes.
export async function askOllama(systemPrompt: string, userPrompt: string): Promise<string> {
  return chatRequest(OLLAMA_CHAT_MODEL, systemPrompt, userPrompt);
}

// Same chat model, but constrained to valid JSON output at a low temperature
// — for structured extraction (minutes, actions) where a stray sentence or a
// creative rewording breaks the parser or invents content.
export async function askOllamaJson(systemPrompt: string, userPrompt: string): Promise<string> {
  return chatRequest(OLLAMA_CHAT_MODEL, systemPrompt, userPrompt, undefined, {
    json: true,
    temperature: 0.2,
  });
}

// Image-in, text-out — the vision model, used to read a photo of
// handwritten or whiteboard notes into plain text before it's handed to
// askOllama for structuring. imageBase64 is the raw image bytes,
// base64-encoded with no "data:image/...;base64," prefix (Ollama's own
// convention, distinct from a data: URL).
export async function askOllamaVision(
  systemPrompt: string,
  userPrompt: string,
  imageBase64: string
): Promise<string> {
  return chatRequest(OLLAMA_VISION_MODEL, systemPrompt, userPrompt, [imageBase64]);
}
