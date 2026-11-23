import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_AI_MODEL_ID,
  FREE_AI_MODELS,
  extractJsonFromModelText,
  findAiModelById,
} from './aiModels.ts';

test('FREE_AI_MODELS includes DeepSeek, Z.ai GLM, Gemini, and additional free models', () => {
  const families = new Set(FREE_AI_MODELS.map((m) => m.family));
  assert.ok(families.has('deepseek'), 'Missing DeepSeek family');
  assert.ok(families.has('glm'), 'Missing Z.ai GLM family');
  assert.ok(families.has('gemini'), 'Missing Gemini family');
  assert.ok(families.has('more'), 'Missing additional free models');

  const ids = FREE_AI_MODELS.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length, 'Model IDs must be unique');

  const visionModels = FREE_AI_MODELS.filter((m) => m.supportsVision);
  assert.ok(visionModels.some((m) => m.id === 'zai:glm-4.6v-flash'));
  assert.ok(visionModels.some((m) => m.id === 'gemini:gemini-4-hydrogen'));
  assert.ok(visionModels.some((m) => m.id === 'gemini:gemini-3.8-flash'));
  assert.ok(visionModels.some((m) => m.id === 'openrouter:qwen/qwen3.8-27b:free'));

  for (const model of FREE_AI_MODELS) {
    assert.ok(model.envVar, `Model ${model.id} should specify its server secret envVar`);
  }
});

test('findAiModelById resolves known IDs and safely falls back to default', () => {
  const glm = findAiModelById('zai:glm-4.7-flash');
  assert.equal(glm.modelName, 'glm-4.7-flash');
  assert.equal(glm.provider, 'zai');

  const deepseek = findAiModelById('openrouter:deepseek/deepseek-r1:free');
  assert.equal(deepseek.supportsReasoning, true);
  assert.equal(deepseek.provider, 'openrouter');

  const fallback = findAiModelById('nonexistent:model');
  assert.equal(fallback.id, DEFAULT_AI_MODEL_ID);
});

test('extractJsonFromModelText strips <think> tags, code fences, and surrounding prose', () => {
  const deepseekOutput = `<think>
Let me plan the motion scene coordinates carefully...
</think>
\`\`\`json
{
  "name": "Kinetic Pulse",
  "duration": 6,
  "objects": []
}
\`\`\``;
  const parsed1 = extractJsonFromModelText(deepseekOutput);
  assert.equal(parsed1.name, 'Kinetic Pulse');
  assert.equal(parsed1.duration, 6);

  const proseWrapped = `Here is the choreography plan you requested:\n{"rationale":"Smooth ease","keyframes":[{"property":"x","time":0,"value":200}]}\nHope this helps!`;
  const parsed2 = extractJsonFromModelText(proseWrapped);
  assert.equal(parsed2.rationale, 'Smooth ease');
  assert.ok(Array.isArray(parsed2.keyframes));

  assert.throws(() => extractJsonFromModelText('not json at all'), /valid JSON/);
});
