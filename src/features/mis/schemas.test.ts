import { describe, expect, it } from 'vitest';
import { PERIOD_REGEX, buildMISFormData, validateMISFile, MAX_MIS_FILE_BYTES } from './schemas';

describe('MIS schemas — file upload redesign (decisions.md [P-23])', () => {
  describe('PERIOD_REGEX', () => {
    it('matches valid YYYY-MM', () => {
      expect(PERIOD_REGEX.test('2026-04')).toBe(true);
      expect(PERIOD_REGEX.test('2026-12')).toBe(true);
      expect(PERIOD_REGEX.test('2026-01')).toBe(true);
    });

    it('rejects invalid months', () => {
      expect(PERIOD_REGEX.test('2026-13')).toBe(false);
      expect(PERIOD_REGEX.test('2026-00')).toBe(false);
      expect(PERIOD_REGEX.test('2026-1')).toBe(false);
    });

    it('rejects non-YYYY-MM shapes', () => {
      expect(PERIOD_REGEX.test('26-04')).toBe(false);
      expect(PERIOD_REGEX.test('2026/04')).toBe(false);
      expect(PERIOD_REGEX.test('2026-04-23')).toBe(false);
    });
  });

  describe('validateMISFile', () => {
    const makeFile = (name: string, type: string, sizeBytes: number) =>
      new File([new Uint8Array(sizeBytes)], name, { type });

    it('accepts Excel files', () => {
      const f = makeFile(
        'MIS.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        1024,
      );
      expect(validateMISFile(f)).toBeNull();
    });

    it('accepts CSV files', () => {
      expect(validateMISFile(makeFile('MIS.csv', 'text/csv', 512))).toBeNull();
    });

    it('accepts PDF files', () => {
      expect(validateMISFile(makeFile('MIS.pdf', 'application/pdf', 2048))).toBeNull();
    });

    it('accepts generic octet-stream (Tally exports)', () => {
      expect(validateMISFile(makeFile('MIS.tally', 'application/octet-stream', 4096))).toBeNull();
    });

    it('rejects image files', () => {
      const err = validateMISFile(makeFile('chart.png', 'image/png', 512));
      expect(err).toContain('Unsupported file type');
    });

    it('rejects files over 20 MB', () => {
      const tooBig = makeFile('huge.xlsx', 'text/csv', MAX_MIS_FILE_BYTES + 1);
      const err = validateMISFile(tooBig);
      expect(err).toContain('too large');
    });
  });

  describe('buildMISFormData', () => {
    it('appends file, period, and comment', () => {
      const file = new File(['data'], 'MIS.xlsx', { type: 'text/csv' });
      const fd = buildMISFormData({ period: '2026-04', comment: 'Note' }, file);
      expect(fd.get('period')).toBe('2026-04');
      expect(fd.get('comment')).toBe('Note');
      // FormData.get returns an equivalent File object; use name+size to verify identity
      const gotFile = fd.get('file') as File;
      expect(gotFile.name).toBe('MIS.xlsx');
      expect(gotFile.size).toBe(file.size);
    });

    it('omits comment when not provided', () => {
      const file = new File(['data'], 'MIS.xlsx', { type: 'text/csv' });
      const fd = buildMISFormData({ period: '2026-04' }, file);
      expect(fd.get('comment')).toBeNull();
    });
  });
});
