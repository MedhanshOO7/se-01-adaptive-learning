// Provider-agnostic client for OpenAI-compatible LLM gateways. Detects whichever key is set
// (OpenRouter or OpenCode Zen), lists + ranks models, and runs chat completions. Raw fetch,
// no SDK. Keys come from the environment (loaded from .env by the npm scripts).

export interface NormModel {
  id: string;
  free: boolean;
  context: number;
  output: number;
  structured: boolean;
  reasoning: boolean;
}

interface Provider {
  name: string;
  modelsUrl: string;
  chatUrl: string;
  normalize: (m: any) => NormModel;
}

const num = (v: unknown): number =>
  typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : 0;
const has = (arr: unknown, k: string): boolean => Array.isArray(arr) && arr.includes(k);

const OPENROUTER: Provider = {
  name: 'OpenRouter',
  modelsUrl: 'https://openrouter.ai/api/v1/models',
  chatUrl: 'https://openrouter.ai/api/v1/chat/completions',
  normalize: (m) => ({
    id: String(m.id),
    free: num(m.pricing?.prompt) === 0 && num(m.pricing?.completion) === 0,
    context: num(m.context_length) || num(m.top_provider?.context_length),
    output: num(m.top_provider?.max_completion_tokens),
    structured: has(m.supported_parameters, 'response_format') || has(m.supported_parameters, 'structured_outputs'),
    reasoning: has(m.supported_parameters, 'reasoning') || has(m.supported_parameters, 'include_reasoning') || !!m.reasoning,
  }),
};

const OPENCODE: Provider = {
  name: 'OpenCode Zen',
  modelsUrl: 'https://opencode.ai/inference/v1/models',
  chatUrl: 'https://opencode.ai/inference/openai/v1/chat/completions',
  normalize: (m) => ({
    id: String(m.id),
    free: num(m.cost?.text?.input?.price) === 0 && num(m.cost?.text?.output?.price) === 0,
    context: num(m.limit?.context),
    output: num(m.limit?.output),
    structured: m.capabilities?.structured_output === true,
    reasoning: m.capabilities?.reasoning?.supported === true,
  }),
};

function apiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY || process.env.OPENCODE_API_KEY || process.env.LLM_API_KEY;
}

/** Pick the provider from whichever key is present (OpenRouter wins if both). */
export function provider(): Provider {
  if (process.env.OPENCODE_API_KEY && !process.env.OPENROUTER_API_KEY) return OPENCODE;
  return OPENROUTER;
}

function authHeaders(required: boolean): Record<string, string> {
  const key = apiKey();
  if (required && !key) throw new Error('Set OPENROUTER_API_KEY (or OPENCODE_API_KEY) first.');
  return key ? { authorization: `Bearer ${key}` } : {};
}

export async function listModels(): Promise<NormModel[]> {
  const p = provider();
  const res = await fetch(p.modelsUrl, { headers: authHeaders(false) }); // models endpoints are public
  if (!res.ok) throw new Error(`Model list failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { data?: any[] } | any[];
  const data = Array.isArray(body) ? body : (body.data ?? []);
  return data.map(p.normalize);
}

/** Best-first for authoring: free, then structured output, then reasoning, then bigger context. */
export function rank(models: NormModel[]): NormModel[] {
  const score = (m: NormModel) => (m.free ? 8 : 0) + (m.structured ? 4 : 0) + (m.reasoning ? 2 : 0);
  return [...models].sort((a, b) => score(b) - score(a) || b.context - a.context);
}

export function bestFree(models: NormModel[]): NormModel | undefined {
  const r = rank(models);
  return r.find((m) => m.free && m.structured && m.reasoning) ?? r.find((m) => m.free) ?? r[0];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chat(opts: { model: string; messages: ChatMessage[]; maxTokens?: number }): Promise<string> {
  const res = await fetch(provider().chatUrl, {
    method: 'POST',
    headers: { ...authHeaders(true), 'content-type': 'application/json' },
    body: JSON.stringify({ model: opts.model, messages: opts.messages, max_tokens: opts.maxTokens ?? 8000 }),
  });
  if (!res.ok) throw new Error(`Chat request failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error(`No content in response: ${JSON.stringify(body).slice(0, 500)}`);
  return content;
}
