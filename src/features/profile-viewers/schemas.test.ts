import { describe, expect, it } from 'vitest';
import { zProfileViewerItem, zProfileViewersResponse, zViewerProfile } from './schemas';

describe('profile-viewers schemas', () => {
  it('parses a populated viewer item', () => {
    const row = zProfileViewerItem.parse({
      viewer: {
        user_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12',
        name: 'Kapil Sahu',
        role: 'lp',
        organisation: 'Warmup Ventures',
        avatar_url: null,
      },
      viewed_at: '2026-04-25T14:00:10.000Z',
    });
    expect(row.viewer.role).toBe('lp');
  });

  it('strips backend-leaked email / phone at parse time (PRD §13 G11)', () => {
    const parsed = zViewerProfile.parse({
      user_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12',
      name: 'Kapil Sahu',
      role: 'lp',
      organisation: 'Warmup Ventures',
      avatar_url: null,
      email: 'should-not-render@example.com',
      phone: '+919999999999',
    } as Record<string, unknown>);
    expect(Object.keys(parsed)).toEqual(
      expect.arrayContaining(['user_id', 'name', 'role', 'organisation', 'avatar_url']),
    );
    expect(Object.keys(parsed)).not.toContain('email');
    expect(Object.keys(parsed)).not.toContain('phone');
  });

  it('accepts an empty paginated response', () => {
    const empty = zProfileViewersResponse.parse({ items: [], next_cursor: null });
    expect(empty.items).toEqual([]);
    expect(empty.next_cursor).toBeNull();
  });

  it('rejects an item missing viewer.role', () => {
    expect(() =>
      zProfileViewerItem.parse({
        viewer: {
          user_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12',
          name: 'No Role',
          organisation: null,
          avatar_url: null,
        },
        viewed_at: '2026-04-25T14:00:10.000Z',
      }),
    ).toThrow();
  });
});
