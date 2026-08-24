import { describe, expect, it } from 'vitest';
import API_URL from './config';

describe('config', () => {
  it('defaults to the local API origin', () => {
    expect(API_URL).toBe('http://localhost:5000');
  });
});
