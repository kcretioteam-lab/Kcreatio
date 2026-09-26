import { describe, it, expect, beforeEach } from 'vitest';
import api from './api';
import { getPending } from './apiActivity';

// Fake transport: answer each request with the status in its `fake` config, checking the
// in-flight count while the request is "on the wire".
let seenWhileInFlight = [];
beforeEach(() => {
  seenWhileInFlight = [];
  api.defaults.adapter = async (config) => {
    seenWhileInFlight.push(getPending());
    const status = config.fake ?? 200;
    const res = { data: {}, status, statusText: '', headers: {}, config };
    if (status >= 400) {
      const err = new Error(`Request failed with status ${status}`);
      err.config = config;
      err.response = res;
      throw err;
    }
    return res;
  };
});

describe('API activity counter', () => {
  it('counts a request while it runs and releases it on success', async () => {
    await api.get('/x');
    expect(seenWhileInFlight).toEqual([1]);
    expect(getPending()).toBe(0);
  });

  it('releases the request when it fails', async () => {
    await expect(api.get('/x', { fake: 500 })).rejects.toThrow();
    expect(getPending()).toBe(0);
  });

  it('does not count silent requests', async () => {
    await api.get('/x', { silent: true });
    expect(seenWhileInFlight).toEqual([0]);
    expect(getPending()).toBe(0);
  });

  it('counts parallel requests together', async () => {
    await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);
    expect(Math.max(...seenWhileInFlight)).toBeGreaterThan(1);
    expect(getPending()).toBe(0);
  });

  it('stays balanced through a 401 → refresh → retry', async () => {
    let calls = 0;
    api.defaults.adapter = async (config) => {
      calls += 1;
      const status = calls === 1 ? 401 : 200; // first call expired, refresh + retry succeed
      const res = { data: {}, status, statusText: '', headers: {}, config };
      if (status >= 400) { const e = new Error('401'); e.config = config; e.response = res; throw e; }
      return res;
    };
    await api.get('/invoices');
    expect(calls).toBe(3);
    expect(getPending()).toBe(0);
  });
});
