import { describe, it, expect } from 'vitest';
import { ApiError } from './api-error';

describe('ApiError', () => {
  it('creates an error with status and message', () => {
    const error = new ApiError(404, 'Not found');
    expect(error.status).toBe(404);
    expect(error.message).toBe('Not found');
    expect(error.name).toBe('ApiError');
  });
});
