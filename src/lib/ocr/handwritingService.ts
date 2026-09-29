/**
 * Handwriting and Mathematical Formula Recognition Engine (OCR)
 * Defines strongly typed contracts, bounding box coordinate representations,
 * and integration pipelines for handwritten notes, equations, and diagrams.
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StrokePoint {
  x: number;
  y: number;
  time?: number;
  pressure?: number;
}

export interface HandwrittenStroke {
  points: StrokePoint[];
  color?: string;
  strokeWidth?: number;
}

export type OcrRecognitionMode = 'text' | 'math' | 'diagram' | 'mixed';

export interface OcrRecognitionRequest {
  imageDataUrl?: string; // base64 or object URL
  strokes?: HandwrittenStroke[];
  mode: OcrRecognitionMode;
  expectedContext?: string;
  promptHint?: string;
}

export interface HandwrittenMathToken {
  symbol: string;
  latex: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

export interface OcrRecognitionResult {
  text: string;
  latex?: string;
  confidence: number;
  tokens?: HandwrittenMathToken[];
  recognizedAt: string;
  provider: string;
  rawResponse?: string;
  error?: string;
}

export interface IHandwritingRecognitionService {
  name: string;
  isAvailable(): Promise<boolean>;
  recognizeHandwriting(request: OcrRecognitionRequest): Promise<OcrRecognitionResult>;
  recognizeMathExpression(canvasImageDataUrl: string): Promise<OcrRecognitionResult>;
}

export class HandwritingServiceUnavailableError extends Error {
  constructor(message: string, public readonly code: string = 'OCR_SERVICE_UNAVAILABLE') {
    super(message);
    this.name = 'HandwritingServiceUnavailableError';
  }
}

/**
 * Gemini Vision OCR Provider
 * Invokes server proxy or directly leverages the vision model to extract
 * semantic mathematics and transcribed text from raw canvas drawings.
 */
export class GeminiVisionOcrProvider implements IHandwritingRecognitionService {
  public readonly name = 'Gemini 2.5 Vision OCR';

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('/api/ai/health', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        return Boolean(data.available);
      }
      return false;
    } catch {
      return false;
    }
  }

  async recognizeHandwriting(request: OcrRecognitionRequest): Promise<OcrRecognitionResult> {
    if (!request.imageDataUrl && (!request.strokes || request.strokes.length === 0)) {
      throw new Error('Recognition failed: No canvas image or strokes were supplied in request.');
    }

    try {
      const response = await fetch('/api/ai/ocr-handwriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: request.imageDataUrl,
          mode: request.mode,
          expectedContext: request.expectedContext
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new HandwritingServiceUnavailableError(
          errorData.error || `OCR recognition service responded with HTTP status ${response.status}`,
          'OCR_API_ERROR'
        );
      }

      const data: OcrRecognitionResult = await response.json();
      return data;
    } catch (err: any) {
      if (err instanceof HandwritingServiceUnavailableError) {
        throw err;
      }
      throw new HandwritingServiceUnavailableError(
        `Unable to reach handwriting recognition service: ${err.message || 'Network disconnected'}`,
        'NETWORK_FAILURE'
      );
    }
  }

  async recognizeMathExpression(canvasImageDataUrl: string): Promise<OcrRecognitionResult> {
    return this.recognizeHandwriting({
      imageDataUrl: canvasImageDataUrl,
      mode: 'math',
      expectedContext: 'LaTeX mathematical equation or formula recognition'
    });
  }
}

// Active singleton instance
export const handwritingService: IHandwritingRecognitionService = new GeminiVisionOcrProvider();
