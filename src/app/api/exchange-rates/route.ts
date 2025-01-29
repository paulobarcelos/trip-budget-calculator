import { NextResponse } from 'next/server';

const OPEN_EXCHANGE_RATES_API = 'https://open.exchangerate-api.com/v6/latest';

export async function GET() {
  try {
    const response = await fetch(OPEN_EXCHANGE_RATES_API);
    const data = await response.json();

    // Cache the response for 1 hour
    return NextResponse.json(
      { rates: data.rates },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    
    // Return hardcoded rates as fallback
    return NextResponse.json(
      {
        rates: {
          USD: 1.0,
          EUR: 0.92,
          GBP: 0.79,
          JPY: 148.0,
          AUD: 1.52,
          CAD: 1.35,
          CHF: 0.87,
          CNY: 7.19,
          BRL: 5.0,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  }
}