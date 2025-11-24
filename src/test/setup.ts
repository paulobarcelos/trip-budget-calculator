import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';
import { cleanup } from '@testing-library/react';
import 'whatwg-fetch';

// Avoid Node's built-in storage file DB locking by defaulting to in-memory storage when the
// --localstorage-file flag is present without a path. This keeps CI runs noise-free.
if (process.env.NODE_OPTIONS?.includes('--localstorage-file') && !process.env.LOCALSTORAGE_FILE_PATH) {
  process.env.LOCALSTORAGE_FILE_PATH = 'memory';
}

// Suppress noisy Node warning emitted when --localstorage-file lacks a path.
const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const message = typeof warning === 'string' ? warning : warning?.message;
  if (
    typeof message === 'string' &&
    message.includes('--localstorage-file') &&
    message.includes('valid path')
  ) {
    return;
  }
  // @ts-expect-error passthrough
  return originalEmitWarning(warning, ...rest);
}) as typeof process.emitWarning;

// Polyfill ResizeObserver for cmdk
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

// Polyfill scrollIntoView for cmdk
Element.prototype.scrollIntoView = () => { };

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
