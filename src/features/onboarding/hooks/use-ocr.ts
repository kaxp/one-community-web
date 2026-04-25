import { useCallback, useState } from 'react';
import { runOCR } from '@/api/endpoints';
import type { OCRProgress, OCRResult } from '@/api/interim/ocr-client';
import { ApiError } from '@/api/errors';

interface State {
  isRunning: boolean;
  progress: number;
  status: string;
  result: OCRResult | null;
  error: ApiError | null;
}

const INITIAL: State = {
  isRunning: false,
  progress: 0,
  status: '',
  result: null,
  error: null,
};

// PRD §13.2 G2 — OCR hook. Branches on `VITE_OCR_SERVER_ENABLED` inside
// `runOCR` (the endpoint helper); the hook surface is identical regardless
// of which path runs. We deliberately avoid `useMutation` here because the
// progress stream needs synchronous state updates per Tesseract tick.
export function useOCR() {
  const [state, setState] = useState<State>(INITIAL);

  const reset = useCallback(() => {
    setState(INITIAL);
  }, []);

  const recognize = useCallback(async (blob: Blob | File): Promise<OCRResult | null> => {
    setState({ ...INITIAL, isRunning: true });
    try {
      const result = await runOCR({
        blob,
        onProgress: (p: OCRProgress) =>
          setState((prev) => ({
            ...prev,
            progress: p.progress,
            status: p.status,
          })),
      });
      setState({
        isRunning: false,
        progress: 1,
        status: 'done',
        result,
        error: null,
      });
      return result;
    } catch (err) {
      const apiErr =
        err instanceof ApiError
          ? err
          : new ApiError('ocr_failed', err instanceof Error ? err.message : 'OCR failed', 0);
      setState({
        isRunning: false,
        progress: 0,
        status: 'failed',
        result: null,
        error: apiErr,
      });
      return null;
    }
  }, []);

  return { ...state, recognize, reset };
}
