import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health check endpoint
app.get('/api/ai/health', (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  res.json({
    status: 'ok',
    available: hasKey,
    provider: 'Google Gemini 3.8 Flash'
  });
});

// AI Question Generation Endpoint
app.post('/api/ai/generate-questions', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(401).json({
      code: 'API_KEY_MISSING',
      error: 'GEMINI_API_KEY environment variable is missing or placeholder. Please configure your Gemini API Key in AI Studio secrets.'
    });
  }

  const {
    material = '',
    count = 5,
    difficulty = 'medium',
    types = ['mcq', 'true_false'],
    topic = '',
    includeExplanations = true
  } = req.body;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const clampedCount = Math.min(30, Math.max(1, Number(count) || 5));

    const prompt = `You are an expert university professor and assessment designer.
Generate exactly ${clampedCount} high-quality, academically rigorous assessment questions based on the following context.

Topic / Subject Focus: ${topic || 'General Course Curriculum'}
Difficulty Level: ${difficulty}
Allowed Question Types: ${types.join(', ')}
Include Explanations: ${includeExplanations ? 'Yes' : 'No'}

Study Material & Notes:
"""
${material.slice(0, 15000)}
"""

CRITICAL INSTRUCTIONS:
1. Return a JSON object with an "items" array containing exactly ${clampedCount} questions.
2. For "mcq": provide exactly 4 options in an "options" string array, and "correctIndex" (0, 1, 2, or 3).
3. For "true_false": "correctIndex" must be 1 (for True) or 0 (for False).
4. For "multi_select": provide 4 options in "options", and "correctIndices" as an array of 0-based indices.
5. For "fill_blank" and "short_answer": provide "acceptedAnswers" as an array of valid synonyms/phrases.
6. For "essay": provide an objective evaluation "rubric" string.
7. Provide a detailed, pedagogical "explanation" for every question explaining why the correct answer is right.
8. Each question must test understanding, reasoning, or application, avoiding trivial or repetitive queries.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: 'Question type: mcq, multi_select, true_false, fill_blank, short_answer, essay'
                  },
                  question: { type: Type.STRING, description: 'Question statement' },
                  points: { type: Type.NUMBER, description: 'Marks points' },
                  difficulty: { type: Type.STRING, description: 'easy, medium, hard' },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Choices for MCQ or multi-select'
                  },
                  correctIndex: { type: Type.NUMBER, description: '0-based index for mcq or true_false (1=True, 0=False)' },
                  correctIndices: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: '0-based indices for multi_select'
                  },
                  acceptedAnswers: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Accepted string answers for fill_blank/short_answer'
                  },
                  explanation: { type: Type.STRING, description: 'Detailed educational explanation' },
                  rubric: { type: Type.STRING, description: 'Grading rubric for essays' }
                },
                required: ['type', 'question']
              }
            }
          },
          required: ['items']
        }
      }
    });

    const text = response.text;
    if (!text) {
      return res.status(502).json({ error: 'Empty response returned from Gemini API' });
    }

    const parsed = JSON.parse(text);
    return res.json({
      items: parsed.items || [],
      tokensUsed: response.usageMetadata?.totalTokenCount || 0
    });
  } catch (error: any) {
    console.error('Gemini Assessment Generation Error:', error);
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('resource_exhausted')) {
      return res.status(429).json({
        code: 'QUOTA_EXCEEDED',
        error: 'Gemini API quota exceeded. Please select a paid API key or wait for the quota rate limits to reset.'
      });
    }
    return res.status(500).json({
      code: 'GENERATION_FAILED',
      error: error?.message || 'Failed to synthesize assessment questions'
    });
  }
});

// AI OCR & Handwritten Math Recognition Endpoint
app.post('/api/ai/ocr-handwriting', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(401).json({
      code: 'API_KEY_MISSING',
      error: 'GEMINI_API_KEY environment variable is not configured. OCR requires an active Gemini API Key.'
    });
  }

  const { imageDataUrl, mode = 'mixed', expectedContext = '' } = req.body;
  if (!imageDataUrl || typeof imageDataUrl !== 'string') {
    return res.status(400).json({ error: 'No valid imageDataUrl provided.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Extract base64 data and mime type
    const matches = imageDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid data URL format for canvas image.' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const prompt = `You are a high-precision handwritten document and mathematical formula OCR engine.
Transcribe all handwritten handwriting, mathematics, symbols, equations, and diagrams found in this image.
Mode: ${mode}
Context: ${expectedContext || 'Academic student handwriting'}

Return a JSON object containing:
- "text": Clean transcribed plain-text representation.
- "latex": LaTeX formatted mathematical formula representation of any equations (e.g. "\\int_{0}^{\\infty} x^2 dx = ...").
- "confidence": Float between 0.0 and 1.0 indicating transcription confidence.
Do not hallucinate or guess if the image is blank.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            latex: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ['text', 'confidence']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      text: parsed.text || '',
      latex: parsed.latex || '',
      confidence: parsed.confidence || 0.9,
      recognizedAt: new Date().toISOString(),
      provider: 'Gemini 3.8 Flash Vision OCR'
    });
  } catch (err: any) {
    console.error('OCR Recognition Error:', err);
    if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota') || err?.message?.includes('resource_exhausted')) {
      return res.status(429).json({
        code: 'QUOTA_EXCEEDED',
        error: 'Gemini API quota exceeded. Please select a paid API key or wait for the quota rate limits to reset.'
      });
    }
    return res.status(500).json({
      error: err?.message || 'Handwriting OCR transcription failed'
    });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ONYX full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
