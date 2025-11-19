/**
 * Example: Basic API route with authentication and validation
 * 
 * This example shows how to create a secure API endpoint for telemetry events
 */

import {
  requireAuth,
  rateLimitCombined,
  validateTelemetryEvent,
  parseJsonBody,
  errorToResponse,
  getRateLimitStatus,
} from '@iris-prime/api';

/**
 * POST /api/telemetry
 * 
 * Accepts telemetry events from authenticated clients
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Extract client IP (varies by platform)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // 2. Authenticate and get project ID
    const projectId = await requireAuth(request);
    console.log(`Authenticated request from project: ${projectId}`);

    // 3. Apply rate limiting (dual-layer protection)
    rateLimitCombined(
      ip,
      projectId,
      { maxRequests: 100, windowMs: 60_000 },   // 100 requests/min per IP
      { maxRequests: 1000, windowMs: 60_000 }   // 1000 requests/min per API key
    );

    // 4. Parse and validate request body
    const event = await parseJsonBody(request, validateTelemetryEvent);
    
    // Ensure projectId from auth matches projectId in payload
    if (event.projectId !== projectId) {
      throw new Error('Project ID mismatch');
    }

    // 5. Store event in database (example)
    // await supabase.from('global_metrics_supabase').insert(event);
    console.log('Telemetry event:', event);

    // 6. Get rate limit status for response headers
    const rateLimitStatus = getRateLimitStatus(`apikey:${projectId}`, 1000);

    // 7. Return success response with rate limit headers
    return new Response(JSON.stringify({
      success: true,
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': rateLimitStatus.limit.toString(),
        'X-RateLimit-Remaining': rateLimitStatus.remaining.toString(),
        'X-RateLimit-Reset': rateLimitStatus.reset || '',
      },
    });
  } catch (error) {
    // Automatic error handling with proper status codes
    return errorToResponse(error, '/api/telemetry');
  }
}

/**
 * GET /api/telemetry
 * 
 * Health check endpoint
 */
export async function GET(_request: Request): Promise<Response> {
  return new Response(JSON.stringify({
    service: 'iris-prime-api',
    endpoint: 'telemetry',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
