import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL_NAME = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Add your Gemini API key in Settings > Secrets.',
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

function extractErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'AI generation failed.';
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) return String(parsed.error.message);
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
      const msg = extractErrorMessage(err);
      const isTransient = msg.includes('503') || msg.includes('high demand') || msg.includes('429');
      if (!isTransient || attempt === retries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 450 * (attempt + 1)));
    }
  }
  throw lastErr;
}

const OBJECT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    type: {
      type: Type.STRING,
      description:
        'One of: rect, circle, polygon, star, ring, line, path, text, counter, particles, waveform, orbit, blob, grid',
    },
    startTime: { type: Type.NUMBER },
    endTime: { type: Type.NUMBER },
    transform: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER },
        y: { type: Type.NUMBER },
        width: { type: Type.NUMBER },
        height: { type: Type.NUMBER },
        scaleX: { type: Type.NUMBER },
        scaleY: { type: Type.NUMBER },
        rotation: { type: Type.NUMBER },
        opacity: { type: Type.NUMBER },
      },
    },
    style: {
      type: Type.OBJECT,
      properties: {
        fillMode: {
          type: Type.STRING,
          description: 'solid, linear-gradient, radial-gradient, or none',
        },
        fillColor: { type: Type.STRING },
        fillColor2: { type: Type.STRING },
        gradientAngle: { type: Type.NUMBER },
        strokeColor: { type: Type.STRING },
        strokeWidth: { type: Type.NUMBER },
        cornerRadius: { type: Type.NUMBER },
        shadowBlur: { type: Type.NUMBER },
        shadowColor: { type: Type.STRING },
      },
    },
    shapeProps: {
      type: Type.OBJECT,
      properties: {
        sides: { type: Type.NUMBER },
        points: { type: Type.NUMBER },
        innerRadius: { type: Type.NUMBER },
        startAngle: { type: Type.NUMBER },
        endAngle: { type: Type.NUMBER },
        svgPath: {
          type: Type.STRING,
          description: 'Valid SVG path string inside a 0..100 coordinate viewBox when type is path',
        },
        pathViewBox: { type: Type.NUMBER },
      },
    },
    textProps: {
      type: Type.OBJECT,
      properties: {
        content: { type: Type.STRING },
        fontFamily: {
          type: Type.STRING,
          description: 'Plus Jakarta Sans, DM Sans, Playfair Display, or JetBrains Mono',
        },
        fontSize: { type: Type.NUMBER },
        fontWeight: { type: Type.NUMBER },
        letterSpacing: { type: Type.NUMBER },
        revealMode: {
          type: Type.STRING,
          description: 'none, fade-up, typewriter, scramble, or word-pop',
        },
        counterFrom: { type: Type.NUMBER },
        counterTo: { type: Type.NUMBER },
        counterPrefix: { type: Type.STRING },
        counterSuffix: { type: Type.STRING },
      },
    },
    proceduralProps: {
      type: Type.OBJECT,
      properties: {
        particleCount: { type: Type.NUMBER },
        particleSpeed: { type: Type.NUMBER },
        particleSpread: { type: Type.NUMBER },
        particleSize: { type: Type.NUMBER },
        waveBars: { type: Type.NUMBER },
        waveAmplitude: { type: Type.NUMBER },
        waveFrequency: { type: Type.NUMBER },
        orbitRings: { type: Type.NUMBER },
        orbitSpeed: { type: Type.NUMBER },
        blobLobes: { type: Type.NUMBER },
        blobComplexity: { type: Type.NUMBER },
        gridCols: { type: Type.NUMBER },
        gridRows: { type: Type.NUMBER },
      },
    },
    behavior: {
      type: Type.OBJECT,
      properties: {
        entrancePreset: {
          type: Type.STRING,
          description: 'none, fade, scale-pop, slide-up, slide-left, rotate-in, blur-in',
        },
        entranceDuration: { type: Type.NUMBER },
        exitPreset: {
          type: Type.STRING,
          description: 'none, fade, scale-down, slide-down',
        },
        exitDuration: { type: Type.NUMBER },
        spinSpeed: { type: Type.NUMBER },
        pulseAmp: { type: Type.NUMBER },
        pulseFreq: { type: Type.NUMBER },
        oscillateX: {
          type: Type.OBJECT,
          properties: {
            amp: { type: Type.NUMBER },
            freq: { type: Type.NUMBER },
            phase: { type: Type.NUMBER },
          },
        },
        oscillateY: {
          type: Type.OBJECT,
          properties: {
            amp: { type: Type.NUMBER },
            freq: { type: Type.NUMBER },
            phase: { type: Type.NUMBER },
          },
        },
      },
    },
    keyframes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          property: {
            type: Type.STRING,
            description: 'x, y, scaleX, scaleY, rotation, opacity, width, or height',
          },
          time: { type: Type.NUMBER },
          value: { type: Type.NUMBER },
          easing: {
            type: Type.STRING,
            description:
              'linear, easeInQuad, easeOutQuad, easeInOutCubic, easeOutBack, easeOutExpo, springElastic, bounceOut',
          },
        },
      },
    },
  },
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  app.post('/api/ai/generate-scene', async (req, res) => {
    try {
      const { prompt, stylePreset = 'Modern Kinetic', width = 1920, height = 1080, duration = 6 } =
        req.body ?? {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Please describe the motion scene to generate.' });
      }

      const ai = getAiClient();
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Create a layered motion graphics composition for a ${width}x${height} canvas (${duration}s duration).
Style direction: ${stylePreset}
User prompt: ${prompt.trim()}
Coordinate rules: Origin (0,0) is top-left, center of canvas is (${width / 2}, ${height / 2}). Place objects deliberately with visual hierarchy, strong contrast, staggered startTime values (0 to 1.2s), cohesive color palette, and kinetic behaviors or keyframes.`,
          config: {
            systemInstruction:
              'You are an award-winning motion graphics director. Design clean, balanced, multi-layered 2D motion graphic compositions with 4 to 7 distinct objects (background textures/grids, hero geometric/procedural rigs, and kinetic typography). Keep text concise (2-5 words). Always return valid hex colors.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                duration: { type: Type.NUMBER },
                bpm: { type: Type.NUMBER },
                handheldDrift: { type: Type.NUMBER },
                background: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: 'solid, linear-gradient, radial-mesh, grid-studio, or starfield',
                    },
                    color1: { type: Type.STRING },
                    color2: { type: Type.STRING },
                    color3: { type: Type.STRING },
                    angle: { type: Type.NUMBER },
                    animate: { type: Type.BOOLEAN },
                  },
                },
                objects: {
                  type: Type.ARRAY,
                  items: OBJECT_SCHEMA,
                },
              },
            },
          },
        }),
      );

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      return res.json({ scene: parsed });
    } catch (err) {
      return res.status(500).json({ error: extractErrorMessage(err) });
    }
  });

  app.post('/api/ai/generate-object', async (req, res) => {
    try {
      const { prompt, width = 1920, height = 1080, duration = 6 } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Please describe the motion object to generate.' });
      }

      const ai = getAiClient();
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Generate a single expressive animated motion object for a ${width}x${height} canvas (${duration}s duration).
User prompt: ${prompt.trim()}
Center coordinates: x=${width / 2}, y=${height / 2}. If the user asks for a custom icon, emblem, crest, arrow, or silhouette, use type="path" with a clean SVG path in a 0..100 viewBox.`,
          config: {
            systemInstruction:
              'You are a motion object engineer. Generate one finely tuned animated object with rich styling, entrance preset, and continuous motion or keyframes.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: OBJECT_SCHEMA,
          },
        }),
      );

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      return res.json({ object: parsed });
    } catch (err) {
      return res.status(500).json({ error: extractErrorMessage(err) });
    }
  });

  app.post('/api/ai/choreograph', async (req, res) => {
    try {
      const { prompt, objectSummary, duration = 6 } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Please describe the animation choreography.' });
      }

      const ai = getAiClient();
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Choreograph motion keyframes and continuous behaviors for this object over a ${duration}s timeline:
Current object: ${JSON.stringify(objectSummary ?? {})}
Choreography instruction: ${prompt.trim()}`,
          config: {
            systemInstruction:
              'You are a keyframe animation specialist. Return updated behavior settings and keyframe points that execute the user motion instruction smoothly.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                rationale: { type: Type.STRING },
                behavior: OBJECT_SCHEMA.properties.behavior,
                keyframes: OBJECT_SCHEMA.properties.keyframes,
              },
            },
          },
        }),
      );

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      return res.json({ choreography: parsed });
    } catch (err) {
      return res.status(500).json({ error: extractErrorMessage(err) });
    }
  });

  app.post('/api/ai/style-palette', async (req, res) => {
    try {
      const { prompt } = req.body ?? {};
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Please describe the brand or visual mood.' });
      }

      const ai = getAiClient();
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Design a cohesive motion graphics art direction palette for: ${prompt.trim()}`,
          config: {
            systemInstruction:
              'You are a senior motion art director. Return a harmonious high-contrast palette (hex colors), background style, and font pairing.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                paletteName: { type: Type.STRING },
                backgroundType: {
                  type: Type.STRING,
                  description: 'solid, linear-gradient, radial-mesh, grid-studio, or starfield',
                },
                bgColor1: { type: Type.STRING },
                bgColor2: { type: Type.STRING },
                bgColor3: { type: Type.STRING },
                primaryAccent: { type: Type.STRING },
                secondaryAccent: { type: Type.STRING },
                textColor: { type: Type.STRING },
                fontFamily: {
                  type: Type.STRING,
                  description: 'Plus Jakarta Sans, DM Sans, Playfair Display, or JetBrains Mono',
                },
              },
            },
          },
        }),
      );

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      return res.json({ palette: parsed });
    } catch (err) {
      return res.status(500).json({ error: extractErrorMessage(err) });
    }
  });

  app.post('/api/ai/style-transfer', async (req, res) => {
    try {
      const {
        frames = [],
        mediaKind = 'image',
        directive = '',
        adaptMotion = true,
        layersSummary = [],
      } = req.body ?? {};

      if (!Array.isArray(frames) || frames.length === 0) {
        return res.status(400).json({ error: 'Please upload a style reference image or video first.' });
      }

      const imageParts = frames
        .slice(0, 3)
        .filter((f: { data?: string }) => typeof f?.data === 'string' && f.data.length > 0)
        .map((f: { mimeType?: string; data: string }) => ({
          inlineData: {
            mimeType: f.mimeType || 'image/jpeg',
            data: f.data,
          },
        }));

      if (imageParts.length === 0) {
        return res.status(400).json({ error: 'Uploaded style reference could not be decoded.' });
      }

      const ai = getAiClient();
      const textPart = {
        text: `Analyze the uploaded ${mediaKind === 'video' ? 'video reference frames (sampled across time)' : 'style reference image'} and extract its exact artistic style—color palette, contrast, lighting glow, film grain, typography mood, and motion energy.
Apply this visual style to these existing motion graphic layers:
${JSON.stringify(layersSummary)}
User artistic customization note: ${directive.trim() || 'Match the reference mood faithfully with strong legibility.'}
Adapt motion pacing: ${adaptMotion ? 'Yes (adapt entrancePreset, spinSpeed, pulseAmp, handheldDrift)' : 'No (keep motion strictly visual)'}`,
      };

      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: { parts: [...imageParts, textPart] },
          config: {
            systemInstruction:
              'You are a senior motion graphics look-dev & style transfer director. Inspect the reference image/video frames carefully and map their palette, contrast, atmospheric glow, film grain, typography, and motion energy onto the composition JSON.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                styleSummary: { type: Type.STRING },
                background: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: 'solid, linear-gradient, radial-mesh, grid-studio, or starfield',
                    },
                    color1: { type: Type.STRING },
                    color2: { type: Type.STRING },
                    color3: { type: Type.STRING },
                    angle: { type: Type.NUMBER },
                    animate: { type: Type.BOOLEAN },
                  },
                },
                camera: {
                  type: Type.OBJECT,
                  properties: {
                    vignette: { type: Type.NUMBER },
                    filmGrain: { type: Type.NUMBER },
                    handheldDrift: { type: Type.NUMBER },
                  },
                },
                typography: {
                  type: Type.OBJECT,
                  properties: {
                    fontFamily: {
                      type: Type.STRING,
                      description: 'Plus Jakarta Sans, DM Sans, Playfair Display, or JetBrains Mono',
                    },
                    letterSpacing: { type: Type.NUMBER },
                  },
                },
                palette: {
                  type: Type.OBJECT,
                  properties: {
                    primaryColor: { type: Type.STRING },
                    secondaryColor: { type: Type.STRING },
                    textColor: { type: Type.STRING },
                    strokeColor: { type: Type.STRING },
                    shadowColor: { type: Type.STRING },
                    fillMode: {
                      type: Type.STRING,
                      description: 'solid, linear-gradient, radial-gradient, or none',
                    },
                    shadowBlur: { type: Type.NUMBER },
                  },
                },
                layerOverrides: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      fillColor: { type: Type.STRING },
                      fillColor2: { type: Type.STRING },
                      strokeColor: { type: Type.STRING },
                      fillMode: { type: Type.STRING },
                      shadowBlur: { type: Type.NUMBER },
                      entrancePreset: { type: Type.STRING },
                      spinSpeed: { type: Type.NUMBER },
                      pulseAmp: { type: Type.NUMBER },
                    },
                  },
                },
              },
            },
          },
        }),
      );

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      return res.json({ styleTransfer: parsed });
    } catch (err) {
      return res.status(500).json({ error: extractErrorMessage(err) });
    }
  });

  app.post('/api/ai/auto-compose', async (req, res) => {
    try {
      const {
        layers = [],
        width = 1920,
        height = 1080,
        duration = 6,
        layoutGoal = 'Hero Centerpiece',
        pacing = 'Balanced Studio',
        transitionStyle = 'Staggered Wave',
        instructions = '',
      } = req.body ?? {};

      if (!Array.isArray(layers) || layers.length === 0) {
        return res.status(400).json({ error: 'Add at least one layer to the stage before auto-composing.' });
      }

      const ai = getAiClient();
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Analyze these existing motion graphic assets and compose an optimal ${width}x${height} (${duration}s) scene arrangement, z-ordering, animation curves, and staggered timings.
Assets: ${JSON.stringify(layers)}
User preferences:
- Layout Goal: ${layoutGoal}
- Pacing: ${pacing}
- Transition Choreography: ${transitionStyle}
- Extra Notes: ${instructions.trim() || 'Maximize visual hierarchy, legibility, and smooth kinetic rhythm.'}`,
          config: {
            systemInstruction:
              'You are an automated motion scene compositor. Arrange EVERY provided layer id cleanly within canvas bounds (origin 0,0 top-left), assign complementary zIndex values (0 = backmost), stagger startTime/endTime cleanly, and add purposeful entrance/exit presets, continuous physics, and keyframes.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                compositionNotes: { type: Type.STRING },
                bpm: { type: Type.NUMBER },
                camera: {
                  type: Type.OBJECT,
                  properties: {
                    zoom: { type: Type.NUMBER },
                    handheldDrift: { type: Type.NUMBER },
                  },
                },
                arrangements: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      zIndex: { type: Type.NUMBER },
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER },
                      width: { type: Type.NUMBER },
                      height: { type: Type.NUMBER },
                      scaleX: { type: Type.NUMBER },
                      scaleY: { type: Type.NUMBER },
                      rotation: { type: Type.NUMBER },
                      startTime: { type: Type.NUMBER },
                      endTime: { type: Type.NUMBER },
                      entrancePreset: { type: Type.STRING },
                      entranceDuration: { type: Type.NUMBER },
                      exitPreset: { type: Type.STRING },
                      exitDuration: { type: Type.NUMBER },
                      spinSpeed: { type: Type.NUMBER },
                      pulseAmp: { type: Type.NUMBER },
                      oscillateYAmp: { type: Type.NUMBER },
                      keyframes: OBJECT_SCHEMA.properties.keyframes,
                    },
                  },
                },
              },
            },
          },
        }),
      );

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      return res.json({ compositionPlan: parsed });
    } catch (err) {
      return res.status(500).json({ error: extractErrorMessage(err) });
    }
  });

  app.post('/api/ai/generate-assets', async (req, res) => {
    try {
      const {
        keywords = '',
        category = 'All Diverse Elements',
        aesthetic = 'Modern Kinetic',
        energy = 'Dynamic',
        count = 3,
        width = 1920,
        height = 1080,
        duration = 6,
      } = req.body ?? {};

      if (!keywords || typeof keywords !== 'string' || !keywords.trim()) {
        return res.status(400).json({ error: 'Enter descriptive keywords or theme for asset generation.' });
      }

      const safeCount = Math.min(4, Math.max(1, Number(count) || 3));
      const ai = getAiClient();
      const response = await generateWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Generate ${safeCount} diverse, ready-to-animate motion graphic assets for a ${width}x${height} canvas (${duration}s duration).
Keywords / Brief: ${keywords.trim()}
Asset Category Focus: ${category}
Visual Aesthetic: ${aesthetic}
Motion Energy: ${energy}
Make each asset visually distinct (e.g. mix custom SVG vector paths, kinetic typography with revealMode like scramble/typewriter/word-pop, sweeping transition wipe beams/rects with animated width/x keyframes, or procedural waveform/orbit/particle rigs).`,
          config: {
            systemInstruction:
              'You are an intelligent motion asset generator. Output diverse, cohesive motion graphic assets with rich styling, keyframes, and kinetic behaviors tailored to the user keywords and category.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                designNotes: { type: Type.STRING },
                assets: {
                  type: Type.ARRAY,
                  items: OBJECT_SCHEMA,
                },
              },
            },
          },
        }),
      );

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);
      return res.json({
        designNotes: parsed.designNotes ?? '',
        assets: Array.isArray(parsed.assets) ? parsed.assets : [],
      });
    } catch (err) {
      return res.status(500).json({ error: extractErrorMessage(err) });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kinetik Studio server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
