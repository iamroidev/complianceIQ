import type { GeneratedBy } from "../types";
import type { AiIssue } from "./validators";
import type { AiPrompt } from "./prompts";

export type AiMode = "live" | "fixtures" | "off";

/** Unset or unknown AI_MODE behaves like fixtures — the offline demo default. */
export function resolveAiMode(env: Record<string, string | undefined> = process.env): AiMode {
  return env.AI_MODE === "live" || env.AI_MODE === "off" ? env.AI_MODE : "fixtures";
}

export type AiClient = (prompt: AiPrompt) => Promise<string>;

/** OpenAI-compatible Kimi (Moonshot) call — temperature 0, JSON output. */
export function kimiClient(
  options: {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    fetchImpl?: typeof fetch;
  } = {},
): AiClient {
  const baseUrl = options.baseUrl ?? process.env.KIMI_BASE_URL ?? "https://api.moonshot.ai/v1";
  const apiKey = options.apiKey ?? process.env.KIMI_API_KEY;
  const model = options.model ?? process.env.KIMI_MODEL;
  const doFetch = options.fetchImpl ?? fetch;

  return async (prompt) => {
    if (!apiKey || !model) throw new Error("AI_MODE=live requires KIMI_API_KEY and KIMI_MODEL");
    const response = await doFetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Kimi request failed with status ${response.status}`);
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Kimi response contained no content");
    return content;
  };
}

export interface RunAiTaskOptions<T> {
  mode: AiMode;
  prompt: AiPrompt;
  parse(raw: string): T;
  validate(output: T): AiIssue[];
  loadFixture(): T | undefined;
  fallback(): T;
  client?: AiClient;
}

export interface RunAiTaskResult<T> {
  output: T;
  generatedBy: GeneratedBy;
  issues: AiIssue[];
}

/**
 * The §7.4 pipeline: `off` uses the fallback; `fixtures` loads pre-generated
 * output (validated defensively, falling back if it somehow fails); `live`
 * calls the model, validates, retries once with the failure reasons, then
 * falls back. AI output never bypasses validation.
 */
export async function runAiTask<T>(options: RunAiTaskOptions<T>): Promise<RunAiTaskResult<T>> {
  const templateResult = (issues: AiIssue[] = []): RunAiTaskResult<T> => ({
    output: options.fallback(),
    generatedBy: "template",
    issues,
  });

  if (options.mode === "off") return templateResult();
  if (options.mode === "fixtures") {
    const fixture = options.loadFixture();
    if (!fixture) return templateResult();
    const issues = options.validate(fixture);
    if (issues.length === 0) return { output: fixture, generatedBy: "fixture", issues: [] };
    return templateResult(issues);
  }

  const client = options.client ?? kimiClient();
  let lastIssues: AiIssue[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const prompt =
        attempt === 0
          ? options.prompt
          : {
              system: options.prompt.system,
              user: `${options.prompt.user}\n\nThe previous attempt failed validation:\n${lastIssues
                .map((issue) => `- ${issue.message}`)
                .join("\n")}\nFix these problems and return the JSON again.`,
            };
      const output = options.parse(await client(prompt));
      const issues = options.validate(output);
      if (issues.length === 0) return { output, generatedBy: "kimi", issues: [] };
      lastIssues = issues;
    } catch (error) {
      lastIssues = [
        {
          code: "invalid_output",
          message: error instanceof Error ? error.message : "Model output could not be parsed.",
        },
      ];
    }
  }
  return templateResult(lastIssues);
}

export interface AiDeps {
  mode?: AiMode;
  client?: AiClient;
}
