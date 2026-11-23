import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  extractJsonFromModelText,
  findAiModelById,
  FREE_AI_MODELS,
  type AiModelAvailability,
  type AiModelSpec,
  type AiProviderId,
} from '../data/aiModels.ts';

export interface ImageInputPart {
  mimeType: string;
  data: string;
}

export class AiRequestError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

const PROVIDER_ENDPOINTS: Record<Exclude<AiProviderId, 'gemini'>, string> = {
  pollinations: 'https://gen.pollinations.ai/v1/chat/completions',
  zai: 'https://api.z.ai/api/paas/v4/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
};

function getEnvValue(envVar: string | null): string | null {
  if (!envVar) return null;
  const raw = process.env[envVar];
  if (!raw || !raw.trim() || raw.startsWith('MY_')) return null;
  return raw.trim();
}

export function isModelConfigured(spec: AiModelSpec): boolean {
  if (spec.keyless) return true;
  return getEnvValue(spec.envVar) !== null;
}

export function listModelsWithAvailability(): AiModelAvailability[] {
  return FREE_AI_MODELS.map((spec) => ({
    ...spec,
    configured: isModelConfigured(spec),
  }));
}

export function extractErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'AI generation failed.';
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) return String(parsed.error.message);
    if (parsed?.message) return String(parsed.message);
  } catch {
    // not JSON
  }
  return raw;
}

async function generateWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err instanceof AiRequestError && err.status >= 400 && err.status < 500 && err.status !== 429) {
        throw err;
      }
      const msg = extractErrorMessage(err);
      const isTransient =
        msg.includes('503') ||
        msg.includes('high demand') ||
        msg.includes('429') ||
        msg.toLowerCase().includes('rate limit');
      if (!isTransient || attempt === retries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
    }
  }
  throw lastErr;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = getEnvValue('GEMINI_API_KEY');
  if (!apiKey) {
    throw new AiRequestError(
      'GEMINI_API_KEY is not configured. Add your Gemini API key in Settings > Secrets.',
      400,
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callOpenAiCompatibleProvider(options: {
  spec: AiModelSpec;
  systemInstruction: string;
  userPrompt: string;
  jsonContract: string;
  imageParts?: ImageInputPart[];
}): Promise<Record<string, unknown>> {
  const { spec, systemInstruction, userPrompt, jsonContract, imageParts = [] } = options;

  if (imageParts.length > 0 && !spec.supportsVision) {
    throw new AiRequestError(
      `"${spec.label}" is text-only and cannot inspect uploaded images or video frames. Select GLM-4.6V Flash Vision, Qwen 3.8 27B Vision, Gemma 4 31B Vision, Gemini 3.8 Flash, or Gemini 4 Hydrogen for Style Transfer.`,
      400,
    );
  }

  const endpoint = PROVIDER_ENDPOINTS[spec.provider as Exclude<AiProviderId, 'gemini'>];
  const apiKey = getEnvValue(spec.envVar);

  if (!spec.keyless && !apiKey) {
    throw new AiRequestError(
      `${spec.envVar} is not configured in server secrets for ${spec.providerLabel}. Add ${spec.envVar} in Settings > Secrets, or switch to Gemini 4 Hydrogen / Gemini 3.8 Flash.`,
      400,
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  if (spec.provider === 'openrouter') {
    headers['HTTP-Referer'] = process.env.APP_URL || 'http://localhost:3000';
    headers['X-Title'] = 'Kinetik Studio';
  }

  const fullSystemPrompt = `${systemInstruction}

CRITICAL OUTPUT RULE:
Return ONLY a single valid JSON object (no markdown commentary outside JSON) matching this contract:
${jsonContract}`;

  const userContent =
    imageParts.length > 0
      ? [
          { type: 'text', text: userPrompt },
          ...imageParts.map((part) => ({
            type: 'image_url',
            image_url: {
              url: `data:${part.mimeType};base64,${part.data}`,
            },
          })),
        ]
      : userPrompt;

  const sendRequest = async (includeResponseFormat: boolean) => {
    const body: Record<string, unknown> = {
      model: spec.modelName,
      messages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: spec.supportsReasoning ? 0.6 : 0.4,
      max_tokens: 4096,
    };

    if (includeResponseFormat && !spec.supportsReasoning) {
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55_000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const textBody = await res.text();
      if (!res.ok) {
        let message = `${spec.providerLabel} (${spec.label}) returned HTTP ${res.status}`;
        try {
          const parsedErr = JSON.parse(textBody);
          const detail =
            parsedErr?.error?.message ||
            parsedErr?.message ||
            parsedErr?.detail ||
            '';
          if (detail) message = `${spec.providerLabel}: ${detail}`;
        } catch {
          if (textBody.trim()) {
            message = `${spec.providerLabel} (${res.status}): ${textBody.slice(0, 220)}`;
          }
        }
        throw new AiRequestError(message, res.status);
      }

      const payload = JSON.parse(textBody);
      const rawContent = payload?.choices?.[0]?.message?.content;
      const contentStr = Array.isArray(rawContent)
        ? rawContent
            .map((chunk: { text?: string }) => chunk?.text ?? '')
            .join('\n')
        : String(rawContent ?? '');

      return extractJsonFromModelText(contentStr);
    } finally {
      clearTimeout(timeout);
    }
  };

  return generateWithRetry(async () => {
    try {
      return await sendRequest(!spec.supportsReasoning);
    } catch (err) {
      // Some open-weight free endpoints reject response_format: { type: 'json_object' } with 400
      if (
        err instanceof AiRequestError &&
        err.status === 400 &&
        !spec.supportsReasoning &&
        err.message.toLowerCase().includes('response_format')
      ) {
        return await sendRequest(false);
      }
      throw err;
    }
  });
}

export async function runStructuredAi(options: {
  modelId?: string;
  systemInstruction: string;
  userPrompt: string;
  jsonContract: string;
  geminiSchema: Record<string, unknown>;
  imageParts?: ImageInputPart[];
}): Promise<{
  data: Record<string, unknown>;
  modelUsed: {
    id: string;
    label: string;
    providerLabel: string;
  };
}> {
  const spec = findAiModelById(options.modelId);
  const imageParts = options.imageParts ?? [];

  if (spec.provider === 'gemini') {
    const ai = getGeminiClient();
    const contents =
      imageParts.length > 0
        ? {
            parts: [
              ...imageParts.map((p) => ({
                inlineData: { mimeType: p.mimeType, data: p.data },
              })),
              { text: options.userPrompt },
            ],
          }
        : options.userPrompt;

    const response = await generateWithRetry(() =>
      ai.models.generateContent({
        model: spec.modelName,
        contents,
        config: {
          systemInstruction: options.systemInstruction,
          ...(spec.supportsReasoning
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
          responseMimeType: 'application/json',
          responseSchema: options.geminiSchema,
        },
      }),
    );

    const parsed = extractJsonFromModelText((response.text ?? '{}').trim());
    return {
      data: parsed,
      modelUsed: {
        id: spec.id,
        label: spec.label,
        providerLabel: spec.providerLabel,
      },
    };
  }

  const parsed = await callOpenAiCompatibleProvider({
    spec,
    systemInstruction: options.systemInstruction,
    userPrompt: options.userPrompt,
    jsonContract: options.jsonContract,
    imageParts,
  });

  return {
    data: parsed,
    modelUsed: {
      id: spec.id,
      label: spec.label,
      providerLabel: spec.providerLabel,
    },
  };
}
