import './polyfills';
import { handlers } from './handlers';

const { setupServer } = await import('msw/node');

export const server = setupServer(...handlers);
