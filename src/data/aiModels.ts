export type AiProviderId =
  | 'gemini'
  | 'pollinations'
  | 'zai'
  | 'openrouter'
  | 'groq'
  | 'nvidia'
  | 'mistral';

export type AiModelFamily =
  | 'deepseek'
  | 'glm'
  | 'gemini'
  | 'more';

export interface AiModelSpec {
  id: string;
  label: string;
  family: AiModelFamily;
  provider: AiProviderId;
  providerLabel: string;
  modelName: string;
  supportsVision: boolean;
  supportsReasoning: boolean;
  keyless: boolean;
  envVar: string | null;
  contextLabel: string;
  tierLabel: string;
  bestFor: string;
}

export interface AiModelAvailability extends AiModelSpec {
  configured: boolean;
}

export const DEFAULT_AI_MODEL_ID = 'gemini:gemini-4-hydrogen';

export const FREE_AI_MODELS: AiModelSpec[] = [
  // Gemini Free (Built-in AI Studio)
  {
    id: 'gemini:gemini-4-hydrogen',
    label: 'Gemini 4 Hydrogen',
    family: 'gemini',
    provider: 'gemini',
    providerLabel: 'Google AI Studio',
    modelName: 'gemini-4-hydrogen',
    supportsVision: true,
    supportsReasoning: true,
    keyless: false,
    envVar: 'GEMINI_API_KEY',
    contextLabel: 'Multimodal · Strict JSON',
    tierLabel: 'Built-in Free',
    bestFor: 'Image/video Style Transfer, Auto-Compose, and schema-strict scenes',
  },
  {
    id: 'gemini:gemini-3.8-flash',
    label: 'Gemini 3.8 Flash',
    family: 'gemini',
    provider: 'gemini',
    providerLabel: 'Google AI Studio',
    modelName: 'gemini-3.8-flash',
    supportsVision: true,
    supportsReasoning: true,
    keyless: false,
    envVar: 'GEMINI_API_KEY',
    contextLabel: '1M Ctx · Fast Multimodal',
    tierLabel: 'Google Free Tier',
    bestFor: 'Ultra-fast multi-asset generation, palettes, and vision style transfer',
  },

  // DeepSeek Free Models
  {
    id: 'openrouter:deepseek/deepseek-r1:free',
    label: 'DeepSeek R1 (:free)',
    family: 'deepseek',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    modelName: 'deepseek/deepseek-r1:free',
    supportsVision: false,
    supportsReasoning: true,
    keyless: false,
    envVar: 'OPENROUTER_API_KEY',
    contextLabel: '164K · Reasoning',
    tierLabel: 'OpenRouter Free',
    bestFor: 'High-precision keyframe choreography, Auto-Compose, and multi-object scenes',
  },
  {
    id: 'nvidia:deepseek-ai/deepseek-r1',
    label: 'DeepSeek R1 (NIM)',
    family: 'deepseek',
    provider: 'nvidia',
    providerLabel: 'NVIDIA NIM',
    modelName: 'deepseek-ai/deepseek-r1',
    supportsVision: false,
    supportsReasoning: true,
    keyless: false,
    envVar: 'NVIDIA_API_KEY',
    contextLabel: '128K · Reasoning',
    tierLabel: 'NVIDIA Free Trial',
    bestFor: 'Deep reasoning motion plans and procedural asset generation',
  },
  {
    id: 'pollinations:deepseek',
    label: 'DeepSeek V3',
    family: 'deepseek',
    provider: 'pollinations',
    providerLabel: 'Pollinations',
    modelName: 'deepseek',
    supportsVision: false,
    supportsReasoning: false,
    keyless: false,
    envVar: 'POLLINATIONS_API_KEY',
    contextLabel: '128K · Fast JSON',
    tierLabel: 'Pollinations Free',
    bestFor: 'Scene layouts, SVG assets, and kinetic text generation',
  },
  {
    id: 'pollinations:deepseek-r1',
    label: 'DeepSeek R1 (Pollinations)',
    family: 'deepseek',
    provider: 'pollinations',
    providerLabel: 'Pollinations',
    modelName: 'deepseek-r1',
    supportsVision: false,
    supportsReasoning: true,
    keyless: false,
    envVar: 'POLLINATIONS_API_KEY',
    contextLabel: '128K · Reasoning',
    tierLabel: 'Pollinations Free',
    bestFor: 'Complex multi-layer choreography and timing math',
  },

  // Z.ai / Zhipu Free GLM Models
  {
    id: 'zai:glm-4.7-flash',
    label: 'GLM-4.7 Flash',
    family: 'glm',
    provider: 'zai',
    providerLabel: 'Z.ai (Zhipu)',
    modelName: 'glm-4.7-flash',
    supportsVision: false,
    supportsReasoning: true,
    keyless: false,
    envVar: 'ZAI_API_KEY',
    contextLabel: '200K · 30B MoE',
    tierLabel: 'Z.ai Free',
    bestFor: '200K context scenes, SVG path design, and rapid JSON generation',
  },
  {
    id: 'zai:glm-4.6v-flash',
    label: 'GLM-4.6V Flash Vision',
    family: 'glm',
    provider: 'zai',
    providerLabel: 'Z.ai (Zhipu)',
    modelName: 'glm-4.6v-flash',
    supportsVision: true,
    supportsReasoning: true,
    keyless: false,
    envVar: 'ZAI_API_KEY',
    contextLabel: '128K · Vision VLM',
    tierLabel: 'Z.ai Free',
    bestFor: 'Image & video frame Style Transfer with Z.ai multimodal vision',
  },
  {
    id: 'zai:glm-4.5-flash',
    label: 'GLM-4.5 Flash',
    family: 'glm',
    provider: 'zai',
    providerLabel: 'Z.ai (Zhipu)',
    modelName: 'glm-4.5-flash',
    supportsVision: false,
    supportsReasoning: false,
    keyless: false,
    envVar: 'ZAI_API_KEY',
    contextLabel: '128K · Fast Text',
    tierLabel: 'Z.ai Free',
    bestFor: 'Lightweight palette art direction and fast asset generation',
  },

  // More Top Free Models
  {
    id: 'openrouter:openrouter/free',
    label: 'OpenRouter Auto Free',
    family: 'more',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    modelName: 'openrouter/free',
    supportsVision: false,
    supportsReasoning: false,
    keyless: false,
    envVar: 'OPENROUTER_API_KEY',
    contextLabel: 'Auto Router',
    tierLabel: 'OpenRouter Free',
    bestFor: 'Automatic routing to the healthiest live free open-weight model',
  },
  {
    id: 'openrouter:qwen/qwen3.8-27b:free',
    label: 'Qwen 3.8 27B Vision',
    family: 'more',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    modelName: 'qwen/qwen3.8-27b:free',
    supportsVision: true,
    supportsReasoning: true,
    keyless: false,
    envVar: 'OPENROUTER_API_KEY',
    contextLabel: '128K · Vision VLM',
    tierLabel: 'OpenRouter Free',
    bestFor: 'Multimodal Style Transfer, typography, and structured layouts',
  },
  {
    id: 'openrouter:nvidia/nemotron-3-super-120b-a12b:free',
    label: 'Nemotron 3 Super 120B',
    family: 'more',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    modelName: 'nvidia/nemotron-3-super-120b-a12b:free',
    supportsVision: false,
    supportsReasoning: true,
    keyless: false,
    envVar: 'OPENROUTER_API_KEY',
    contextLabel: '262K · 120B MoE',
    tierLabel: 'OpenRouter Free',
    bestFor: 'Rich multi-layer storytelling scenes and detailed animation timing',
  },
  {
    id: 'openrouter:google/gemma-4-31b-it:free',
    label: 'Gemma 4 31B Vision',
    family: 'more',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    modelName: 'google/gemma-4-31b-it:free',
    supportsVision: true,
    supportsReasoning: false,
    keyless: false,
    envVar: 'OPENROUTER_API_KEY',
    contextLabel: '128K · Vision VLM',
    tierLabel: 'OpenRouter Free',
    bestFor: 'Color palettes, editorial art direction, and image Style Transfer',
  },
  {
    id: 'groq:llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B (Groq)',
    family: 'more',
    provider: 'groq',
    providerLabel: 'Groq LPU',
    modelName: 'llama-3.3-70b-versatile',
    supportsVision: false,
    supportsReasoning: false,
    keyless: false,
    envVar: 'GROQ_API_KEY',
    contextLabel: '128K · Ultra-Fast',
    tierLabel: 'Groq Free Tier',
    bestFor: 'Near-instant motion iterations, palettes, and rapid Auto-Compose',
  },
  {
    id: 'mistral:mistral-small-latest',
    label: 'Mistral Small',
    family: 'more',
    provider: 'mistral',
    providerLabel: 'Mistral AI',
    modelName: 'mistral-small-latest',
    supportsVision: false,
    supportsReasoning: false,
    keyless: false,
    envVar: 'MISTRAL_API_KEY',
    contextLabel: '128K · Experiment Free',
    tierLabel: 'Mistral Free Tier',
    bestFor: 'Crisp palette art direction, SVG paths, and structured scene JSON',
  },
  {
    id: 'pollinations:qwen-coder',
    label: 'Qwen Coder',
    family: 'more',
    provider: 'pollinations',
    providerLabel: 'Pollinations',
    modelName: 'qwen-coder',
    supportsVision: false,
    supportsReasoning: false,
    keyless: false,
    envVar: 'POLLINATIONS_API_KEY',
    contextLabel: '64K · Code & SVG',
    tierLabel: 'Pollinations Free',
    bestFor: 'Vector SVG paths, procedural rigs, and crisp JSON choreography',
  },
];

export function findAiModelById(modelId?: string | null): AiModelSpec {
  if (modelId) {
    const found = FREE_AI_MODELS.find((m) => m.id === modelId);
    if (found) return found;
  }
  return FREE_AI_MODELS[0];
}

export function extractJsonFromModelText(raw: string): Record<string, unknown> {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Model returned an empty response.');
  }

  // Strip reasoning/thinking tags produced by DeepSeek R1 or GLM thinking models
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Extract content from markdown code fences if present
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }

  try {
    const direct = JSON.parse(cleaned);
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
      return direct as Record<string, unknown>;
    }
    if (Array.isArray(direct)) {
      return { items: direct };
    }
  } catch {
    // Fall through to balanced JSON substring extraction
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = cleaned.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  }

  throw new Error('Model response did not contain a valid JSON object.');
}
