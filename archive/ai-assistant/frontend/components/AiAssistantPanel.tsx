import { FormEvent, useState } from "react";

interface Exchange {
  id: string;
  question: string;
  answer: string | null;
  error: string | null;
}

interface Props {
  title: string;
  description: string;
  suggestedQuestion: string;
  onAsk: (question: string) => Promise<{ answer: string }>;
}

// A minimal chat-style panel over a single onAsk call — no streaming, no
// persisted history (conversation state lives only in this component, the
// same "session, not a record" scope as the notification bell). Reused for
// both the per-project assistant (scoped to that project's data) and the
// portfolio-wide one (scoped to the whole portfolio) — the two differ only
// in which backend endpoint onAsk calls and what context that endpoint
// builds server-side.
export default function AiAssistantPanel({ title, description, suggestedQuestion, onAsk }: Props) {
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [asking, setAsking] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;

    const id = `${Date.now()}`;
    setExchanges((prev) => [...prev, { id, question: q, answer: null, error: null }]);
    setQuestion("");
    setAsking(true);
    try {
      const { answer } = await onAsk(q);
      setExchanges((prev) => prev.map((ex) => (ex.id === id ? { ...ex, answer } : ex)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get a response";
      setExchanges((prev) => prev.map((ex) => (ex.id === id ? { ...ex, error: message } : ex)));
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>

      {exchanges.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
          Ask a question below, or try:{" "}
          <button
            type="button"
            onClick={() => setQuestion(suggestedQuestion)}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            “{suggestedQuestion}”
          </button>
        </p>
      ) : (
        <div className="mt-4 space-y-4 max-h-[28rem] overflow-y-auto">
          {exchanges.map((ex) => (
            <div key={ex.id} className="space-y-1.5">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{ex.question}</p>
              {ex.error ? (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded p-2">
                  {ex.error}
                </div>
              ) : ex.answer ? (
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                  {ex.answer}
                </p>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">Thinking…</p>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question…"
          disabled={asking}
          className="flex-1 min-w-0 rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={asking || !question.trim()}
          className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shrink-0"
        >
          {asking ? "Asking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
