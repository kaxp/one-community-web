import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useOCR } from './use-ocr';

// Hoist-friendly mock for the interim OCR service. Default export is fine
// because the hook calls it via the endpoint helper, which imports it by
// named export.
const recognizeMock = vi.hoisted(() => vi.fn());
vi.mock('@/api/interim/ocr-client', () => ({
  OCRServiceInterim: { recognize: recognizeMock },
}));

beforeEach(() => {
  recognizeMock.mockReset();
});

describe('useOCR — client-side (interim) path', () => {
  it('reports isRunning, progress, and a final result on success', async () => {
    recognizeMock.mockImplementation(
      async ({
        onProgress,
      }: {
        onProgress?: (p: { status: string; progress: number }) => void;
      }) => {
        onProgress?.({ status: 'recognizing', progress: 0.5 });
        onProgress?.({ status: 'recognizing', progress: 0.95 });
        return { raw_text: 'Kapil Sahu\n+919876543210', confidence: 0.91 };
      },
    );

    const { result } = renderHook(() => useOCR());
    expect(result.current.isRunning).toBe(false);

    let resolved: unknown = null;
    await act(async () => {
      resolved = await result.current.recognize(new Blob(['x'], { type: 'image/png' }));
    });

    expect(resolved).toMatchObject({ raw_text: expect.stringContaining('Kapil') });
    await waitFor(() => expect(result.current.isRunning).toBe(false));
    expect(result.current.result?.raw_text).toContain('Kapil');
    expect(result.current.progress).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('captures a thrown error as an ApiError', async () => {
    recognizeMock.mockRejectedValue(new Error('worker died'));
    const { result } = renderHook(() => useOCR());

    await act(async () => {
      await result.current.recognize(new Blob(['x']));
    });

    await waitFor(() => expect(result.current.error?.code).toBe('ocr_failed'));
    expect(result.current.isRunning).toBe(false);
    expect(result.current.result).toBeNull();
  });
});
