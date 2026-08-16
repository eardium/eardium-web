/**
 * Standardized error handling for edge functions.
 */

import { webCorsHeaders } from './cors-web.ts';
import { AuthError } from './auth.ts';

export function errorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status, headers: { ...webCorsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...webCorsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (error instanceof QuotaError) {
    return new Response(
      JSON.stringify({ error: error.message, quota_exceeded: true }),
      { status: 429, headers: { ...webCorsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Unexpected errors — log details server-side, return generic message to client
  console.error('Unhandled error:', error);
  return new Response(
    JSON.stringify({ error: 'Internal server error' }),
    { status: 500, headers: { ...webCorsHeaders, 'Content-Type': 'application/json' } },
  );
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaError';
  }
}
