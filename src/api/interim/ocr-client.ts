// PRD §13.2 G2 — client-side OCR shim. Server-side `POST /ocr` is gated
// behind `VITE_OCR_SERVER_ENABLED`; until that flag flips, we fall back to
// running tesseract.js entirely in the browser. Latency is 2–6s on a
// mid-range laptop, so callers MUST surface a progress indicator using the
// `onProgress` callback below.
//
// `tesseract.js` is dynamically imported inside `recognize()` so it ships
// only with the AddUserPage code-split chunk rather than the main bundle.

export interface OCRProgress {
  status: string;
  progress: number;
}

export interface OCRResult {
  raw_text: string;
  confidence: number;
}

interface RecognizeArgs {
  blob: Blob | File;
  onProgress?: (p: OCRProgress) => void;
}

type LoggerMessage = { progress: number; status: string };

export const OCRServiceInterim = {
  async recognize({ blob, onProgress }: RecognizeArgs): Promise<OCRResult> {
    const Tesseract = (await import('tesseract.js')).default;
    const logger = (m: LoggerMessage) => {
      if (onProgress && typeof m.progress === 'number') {
        onProgress({ status: m.status, progress: m.progress });
      }
    };
    const result = await Tesseract.recognize(blob, 'eng', { logger });
    const raw_text = (result.data.text ?? '').trim();
    const confidence =
      typeof result.data.confidence === 'number' ? result.data.confidence / 100 : 0;
    return { raw_text, confidence };
  },
};
