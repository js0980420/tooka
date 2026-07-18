import { describe, expect, it } from 'vitest';
import { withFileLock } from './file-lock.ts';

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

describe('withFileLock', () => {
  it('serializes tasks on the same key', async () => {
    const events: string[] = [];
    const slow = withFileLock('a', async () => {
      events.push('slow:start');
      await tick();
      await tick();
      events.push('slow:end');
      return 1;
    });
    const fast = withFileLock('a', async () => {
      events.push('fast:start');
      events.push('fast:end');
      return 2;
    });
    await expect(Promise.all([slow, fast])).resolves.toEqual([1, 2]);
    expect(events).toEqual(['slow:start', 'slow:end', 'fast:start', 'fast:end']);
  });

  it('runs different keys concurrently', async () => {
    const events: string[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const blocked = withFileLock('a', async () => {
      events.push('a:start');
      await gate;
      events.push('a:end');
    });
    const free = withFileLock('b', async () => {
      events.push('b:done');
    });
    await free;
    expect(events).toEqual(['a:start', 'b:done']);
    release();
    await blocked;
    expect(events).toEqual(['a:start', 'b:done', 'a:end']);
  });

  it('keeps the queue alive after a rejection', async () => {
    await expect(
      withFileLock('a', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    await expect(withFileLock('a', async () => 'after')).resolves.toBe('after');
  });

  it('propagates each task result to its own caller', async () => {
    const first = withFileLock('a', async () => 'first');
    const second = withFileLock('a', async () => 'second');
    await expect(first).resolves.toBe('first');
    await expect(second).resolves.toBe('second');
  });
});
