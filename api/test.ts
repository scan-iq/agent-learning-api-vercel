/**
 * Simple test endpoint to verify Vercel deployment
 */
export default async function handler(_req: Request) {
  return new Response(
    JSON.stringify({
      success: true,
      message: "Vercel serverless function is working!",
      timestamp: new Date().toISOString(),
      env: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasAdminKey: !!process.env.ADMIN_API_KEY,
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
