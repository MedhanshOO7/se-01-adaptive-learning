// Minimal OpenCode Zen client (OpenAI-compatible gateway). Raw fetch, no SDK.
//
// Endpoints (overridable via OPENCODE_BASE_URL; default is the current `/inference` form):
//   models : <base>/v1/models
//   chat   : <base>/openai/v1/chat/completions
// Auth: Authorization: Bearer $OPENCODE_API_KEY. Free models are text-only and may change
// often — run `npm run models` to see the live list.

const BASE = process.env.OPENCODE_BASE_URL ?? 'https://opencode.ai/inference';

function apiKey(): string {
  const key = process.env.OPENCODE_API_KEY;
  if (!key) throw new Error('Set OPENCODE_API_KEY (your free OpenCode Zen key) first.');
  return key;
}

/** Auth header only if a key is set — the models endpoint is public, chat is not. */
function authHeaders(required: boolean): Record<string, string> {
  const key = required ? apiKey() : process.env.OPENCODE_API_KEY;
  return key ? { authorization: `Bearer ${key}` } : {};
}

export interface ModelInfo {
  id: string;
  [k: string]: unknown;
}

export async function listModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${BASE}/v1/models`, { headers: authHeaders(false) });
  if (!res.ok) throw new Error(`Model list failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { data?: ModelInfo[] } | ModelInfo[];
  return Array.isArray(body) ? body : (body.data ?? []);
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** One chat completion; returns the assistant message text. */
export async function chat(opts: {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch(`${BASE}/openai/v1/chat/completions`, {
    method: 'POST',
    headers: { ...authHeaders(true), 'content-type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 8000,
    }),
  });
  if (!res.ok) throw new Error(`Chat request failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error(`No content in response: ${JSON.stringify(body).slice(0, 500)}`);
  return content;
}
