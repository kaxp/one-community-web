import { describe, expect, it, vi, beforeEach } from 'vitest';

// Two tests that exercise the `runOCR` branch on `VITE_OCR_SERVER_ENABLED`:
//
//   - When the flag is FALSE (default), `runOCR` delegates to
//     `OCRServiceInterim.recognize` (tesseract.js).
//   - When the flag is TRUE, `runOCR` POSTs the blob as multipart/form-data
//     to `/ocr` and returns the server response.
//
// Each test uses `vi.resetModules()` + a per-test `vi.doMock` of `@/lib/env`
// so the dynamic import picks up the right flag value.

const recognizeSpy = vi.hoisted(() =>
  vi.fn(async () => ({ raw_text: 'Tess output', confidence: 0.9 })),
);

beforeEach(() => {
  vi.resetModules();
  recognizeSpy.mockClear();
});

describe('runOCR (flag-branched)', () => {
  it('VITE_OCR_SERVER_ENABLED=false → uses OCRServiceInterim (tesseract.js)', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { OCR_SERVER_ENABLED: false, API_BASE_URL: 'http://localhost' },
    }));
    vi.doMock('@/api/interim/ocr-client', () => ({
      OCRServiceInterim: { recognize: recognizeSpy },
    }));
    const apiPostSpy = vi.fn();
    vi.doMock('@/api/client', () => ({
      apiClient: { post: apiPostSpy, get: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
    }));

    const { runOCR } = await import('@/api/endpoints');
    const blob = new Blob(['x'], { type: 'image/png' });
    const result = await runOCR({ blob });

    expect(recognizeSpy).toHaveBeenCalledTimes(1);
    expect(apiPostSpy).not.toHaveBeenCalled();
    expect(result.raw_text).toBe('Tess output');
  });

  it('VITE_OCR_SERVER_ENABLED=true → POSTs multipart to /ocr and returns server payload', async () => {
    vi.doMock('@/lib/env', () => ({
      env: { OCR_SERVER_ENABLED: true, API_BASE_URL: 'http://localhost' },
    }));
    vi.doMock('@/api/interim/ocr-client', () => ({
      OCRServiceInterim: { recognize: recognizeSpy },
    }));
    const serverPayload = { raw_text: 'Server output', confidence: 0.95 };
    const apiPostSpy = vi.fn(async () => ({
      data: { data: serverPayload, error: null },
    }));
    vi.doMock('@/api/client', () => ({
      apiClient: { post: apiPostSpy, get: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
    }));

    const { runOCR } = await import('@/api/endpoints');
    const blob = new Blob(['x'], { type: 'image/png' });
    const result = await runOCR({ blob });

    expect(recognizeSpy).not.toHaveBeenCalled();
    expect(apiPostSpy).toHaveBeenCalledTimes(1);
    const call = apiPostSpy.mock.calls[0] as unknown as [
      string,
      unknown,
      { headers: Record<string, string> },
    ];
    expect(call[0]).toBe('/ocr');
    expect(call[1]).toBeInstanceOf(FormData);
    expect(call[2].headers['Content-Type']).toBe('multipart/form-data');
    expect(result).toEqual(serverPayload);
  });
});
