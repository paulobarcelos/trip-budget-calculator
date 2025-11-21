import './polyfills';
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/exchange-rates', () =>
    HttpResponse.json({
      base: 'USD',
      rates: {
        USD: 1,
        EUR: 0.9,
        GBP: 0.8,
      },
      updatedAt: '2024-01-01',
    }),
  ),
];
