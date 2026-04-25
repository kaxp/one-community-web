import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// PRD §13 G11 — regression test that grep-checks every source file under
// `src/features/profile-viewers/` for forbidden PII reads. If any future
// edit lands `viewer.email` / `viewer.phone` access in this feature, this
// test fails and the lint / test gate blocks the merge.
//
// Two layers of defence (also documented in `README.md`):
//   1. Zod schema strips extra keys at parse time (`schemas.ts`).
//   2. This source-grep test catches anyone who tries to add the read
//      regardless.

const FEATURE_ROOT = join(process.cwd(), 'src', 'features', 'profile-viewers');
const FORBIDDEN_PATTERNS = [/viewer\.email\b/, /viewer\.phone\b/];

// Files allowed to MENTION the forbidden tokens (this test, the README, the
// schema's banner comment, and the MSW fixture which deliberately injects
// the rogue payload to prove the firewall). Everything else is real source.
const ALLOWED_FILES = new Set<string>([
  join(FEATURE_ROOT, 'pii-discipline.test.ts'),
  join(FEATURE_ROOT, 'README.md'),
]);

function walkSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkSourceFiles(full, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

// Strip /* */ block comments and `//` line comments so the rule's own
// banner comments don't trip the grep.
function stripComments(source: string): string {
  const noBlocks = source.replace(/\/\*[\s\S]*?\*\//g, '');
  return noBlocks
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

describe('profile-viewers — PII discipline (PRD §13 G11)', () => {
  it('no source file reads viewer.email / viewer.phone', () => {
    const files = walkSourceFiles(FEATURE_ROOT).filter((p) => !ALLOWED_FILES.has(p));
    const offenders: { file: string; line: number; text: string }[] = [];
    for (const file of files) {
      const cleaned = stripComments(readFileSync(file, 'utf8'));
      const lines = cleaned.split(/\r?\n/);
      lines.forEach((line, idx) => {
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            offenders.push({
              file: relative(process.cwd(), file),
              line: idx + 1,
              text: line.trim(),
            });
          }
        }
      });
    }
    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });
});
