import { describe, it, expect } from 'vitest';
import { extractTargetItemId } from '../../src/server/menus.ts';

// extractTargetItemId is intentionally defensive about field naming because Devvit's
// menu-action payload shape isn't pinned across versions. Verify common shapes.

describe('extractTargetItemId', () => {
  it('finds t3_ id under targetId', () => {
    expect(extractTargetItemId({ targetId: 't3_abc' })).toBe('t3_abc');
  });
  it('finds t1_ id under commentId', () => {
    expect(extractTargetItemId({ commentId: 't1_xyz' })).toBe('t1_xyz');
  });
  it('finds id under target.id', () => {
    expect(extractTargetItemId({ target: { id: 't3_qqq' } })).toBe('t3_qqq');
  });
  it('finds id under post.id / comment.id', () => {
    expect(extractTargetItemId({ post: { id: 't3_p' } })).toBe('t3_p');
    expect(extractTargetItemId({ comment: { id: 't1_c' } })).toBe('t1_c');
  });
  it('finds id under location.postId / location.commentId', () => {
    expect(extractTargetItemId({ location: { postId: 't3_loc' } })).toBe('t3_loc');
    expect(extractTargetItemId({ location: { commentId: 't1_loc' } })).toBe('t1_loc');
  });
  it('rejects non-t1/t3 strings (e.g. subreddit ids)', () => {
    expect(extractTargetItemId({ targetId: 't5_subreddit' })).toBeUndefined();
    expect(extractTargetItemId({ targetId: 'foo' })).toBeUndefined();
  });
  it('returns undefined when nothing matches', () => {
    expect(extractTargetItemId({})).toBeUndefined();
    expect(extractTargetItemId({ random: 'data' })).toBeUndefined();
  });
});
