/**
 * CORS headers for the standalone Eardium Web edge functions. GET is needed
 * by the feed and waitlist-confirmation endpoints.
 */
export const webCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function webCorsResponse() {
  return new Response('ok', { headers: webCorsHeaders });
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...webCorsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
    },
  });
}
