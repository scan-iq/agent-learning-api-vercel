# IRIS API Keys System - Setup Guide

## Overview

The IRIS API now supports secure API key authentication with the following features:

- **Multiple keys per project** - Create separate keys for different environments (production, staging, CI/CD)
- **Usage tracking** - Track usage count and last access time for each key
- **Secure storage** - Keys are hashed using SHA-256 before storage
- **Key rotation** - Easily rotate keys without downtime
- **Admin management** - Full CRUD operations via admin API

## Architecture

```
┌─────────────────────────────────────┐
│ Client (Project)                     │
│   - Has API Key: sk_live_xxx         │
└───────────────┬─────────────────────┘
                │ Authorization: Bearer sk_live_xxx
                ↓
┌───────────────▼─────────────────────┐
│ IRIS API Routes                      │
│   - /api/iris/telemetry              │
│   - /api/iris/evaluate               │
│   - /api/iris/execute                │
│   - Uses: withIrisAuth()             │
└───────────────┬─────────────────────┘
                │
                ↓
┌───────────────▼─────────────────────┐
│ lib/auth.ts                          │
│   - authenticateIrisRequest()        │
│   - Validates API key                │
│   - Returns project info             │
└───────────────┬─────────────────────┘
                │
                ↓
┌───────────────▼─────────────────────┐
│ lib/apiKeys.ts                       │
│   - findProjectByApiKey()            │
│   - touchApiKeyUsage()               │
└───────────────┬─────────────────────┘
                │
                ↓
┌───────────────▼─────────────────────┐
│ Supabase: iris_api_keys table        │
│   - Stores hashed keys               │
│   - Tracks usage                     │
└──────────────────────────────────────┘
```

## Setup Instructions

### 1. Create Supabase Table

Run the SQL script to create the `iris_api_keys` table:

```bash
cd /home/iris/code/experimental/iris-prime-api
```

Then in your Supabase SQL editor, run:

```sql
-- Copy and paste the contents of:
scripts/create-iris-api-keys-table.sql
```

This creates:
- `iris_api_keys` table with proper indexes
- `increment_usage_count()` function for atomic updates
- Triggers for `updated_at` timestamps

### 2. Set Environment Variables

#### For iris-prime-api (Backend)

Add to `.env`:

```bash
# Supabase credentials (for API key validation)
SUPABASE_URL=https://jvccmgcybmphebyvvnxo.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Admin API key (for managing API keys via admin endpoints)
ADMIN_API_KEY=your-secure-admin-key-here
```

Generate a secure admin key:
```bash
openssl rand -base64 32
```

#### For iris-prime-console (Frontend)

Add to `.env`:

```bash
# Backend API URL
VITE_API_BASE=https://your-iris-prime-api.vercel.app

# Admin API key (same as backend)
VITE_ADMIN_API_KEY=your-secure-admin-key-here
```

### 3. Deploy Backend Changes

```bash
cd /home/iris/code/experimental/iris-prime-api
npm run build
vercel --prod
```

### 4. Update Client Projects

Projects using IRIS need to update their integration:

**Before (Direct Supabase):**
```typescript
// Required 5+ environment variables
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**After (HTTP API Gateway):**
```typescript
// Required only 2 environment variables
IRIS_API_URL=https://your-iris-prime-api.vercel.app
IRIS_API_KEY=sk_live_AbCdEf123456...
```

**Example API Call:**
```typescript
// Send telemetry
await fetch(`${process.env.IRIS_API_URL}/api/iris/telemetry`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.IRIS_API_KEY}`,
  },
  body: JSON.stringify({
    expertId: 'my-expert',
    confidence: 0.95,
    latencyMs: 150,
    outcome: 'success',
  }),
});
```

## API Reference

### Admin Endpoints (iris-prime-api)

All admin endpoints require the `X-Admin-Key` header.

#### List API Keys
```http
GET /api/admin/api-keys?projectId=my-project
X-Admin-Key: your-admin-key
```

Response:
```json
{
  "projectId": "my-project",
  "keys": [
    {
      "id": "uuid",
      "projectId": "my-project",
      "projectName": "My Project",
      "prefix": "sk_live_AbCd...",
      "label": "Production",
      "lastUsedAt": "2025-11-18T12:00:00Z",
      "usageCount": 1234,
      "isActive": true,
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ]
}
```

#### Create API Key
```http
POST /api/admin/api-keys
X-Admin-Key: your-admin-key
Content-Type: application/json

{
  "projectId": "my-project",
  "projectName": "My Project",
  "label": "Production"
}
```

Response:
```json
{
  "success": true,
  "apiKey": "sk_live_AbCdEfGh1234567890-_xxxxx",
  "key": {
    "id": "uuid",
    "projectId": "my-project",
    "label": "Production"
  },
  "warning": "Save this API key now - it will not be shown again!"
}
```

#### Revoke API Key
```http
DELETE /api/admin/api-keys
X-Admin-Key: your-admin-key
Content-Type: application/json

{
  "keyId": "uuid-of-key-to-revoke"
}
```

#### Rotate API Key
```http
PUT /api/admin/api-keys
X-Admin-Key: your-admin-key
Content-Type: application/json

{
  "keyId": "uuid-of-key-to-rotate"
}
```

### IRIS API Endpoints (Authenticated)

All IRIS endpoints now require API key authentication.

#### Send Telemetry
```http
POST /api/iris/telemetry
Authorization: Bearer sk_live_xxx
Content-Type: application/json

{
  "expertId": "my-expert",
  "confidence": 0.95,
  "latencyMs": 150,
  "outcome": "success"
}
```

## Frontend Console Usage

### Access API Keys Page

1. Navigate to IRIS Console: `http://localhost:5173`
2. Click **"API Keys"** button in the header
3. Or directly: `http://localhost:5173/settings/api-keys`

### Create New API Key

1. Click **"Create New Key"** button
2. Fill in:
   - **Project ID**: Unique identifier for your project
   - **Project Name**: Human-readable project name
   - **Label**: Purpose (e.g., "Production", "Staging", "CI/CD")
3. Click **"Create API Key"**
4. **IMPORTANT**: Copy the API key immediately - it won't be shown again!

### Manage API Keys

- **View Usage**: See usage count and last used timestamp
- **Revoke Keys**: Click trash icon to revoke (soft delete)
- **Status**: Active keys show green, revoked show red

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for API keys
3. **Rotate keys regularly** (e.g., every 90 days)
4. **Use different keys** for different environments
5. **Revoke keys** when team members leave or keys are compromised
6. **Monitor usage** to detect unauthorized access

## Migration from Direct Supabase Mode

### For Existing Projects

1. **Create API key** for your project via the console
2. **Update environment variables**:
   ```bash
   # Remove old Supabase vars
   # VITE_SUPABASE_URL=...
   # VITE_SUPABASE_ANON_KEY=...

   # Add new API gateway vars
   IRIS_API_URL=https://your-iris-prime-api.vercel.app
   IRIS_API_KEY=sk_live_xxx
   ```
3. **Update code** to use HTTP endpoints instead of direct Supabase calls
4. **Test thoroughly** in staging before deploying to production

### Compatibility

Both modes can coexist:
- **Old projects**: Continue using direct Supabase (Architecture A)
- **New projects**: Use HTTP API gateway (Architecture B)

## Troubleshooting

### "Admin API key not configured"

Add `VITE_ADMIN_API_KEY` to your console `.env` file.

### "Failed to fetch API keys"

1. Check `VITE_API_BASE` is set correctly
2. Ensure backend is deployed and running
3. Verify `ADMIN_API_KEY` matches between frontend and backend

### "Invalid or inactive API key"

1. Check the API key is correct
2. Verify the key hasn't been revoked
3. Ensure you're using the correct environment (production vs staging)

### "Authorization header is required"

Add the `Authorization` header to your requests:
```typescript
headers: {
  'Authorization': `Bearer ${apiKey}`,
}
```

## Files Created/Modified

### iris-prime-api
- ✅ `scripts/create-iris-api-keys-table.sql` - Database schema
- ✅ `lib/apiKeys.ts` - API key management functions
- ✅ `lib/auth.ts` - Updated with `authenticateIrisRequest()`
- ✅ `api/admin/api-keys.ts` - Admin API routes
- ✅ `api/iris/telemetry.ts` - Updated to use authentication

### iris-prime-console
- ✅ `src/pages/ApiKeysPage.tsx` - API keys management UI
- ✅ `src/App.tsx` - Added `/settings/api-keys` route
- ✅ `src/pages/Index.tsx` - Added navigation button

## Next Steps

1. **Run the SQL script** to create the database table
2. **Set environment variables** in both repos
3. **Deploy the backend** to Vercel
4. **Test the console** by creating an API key
5. **Update client projects** to use the new authentication system
6. **Monitor usage** via the console dashboard

---

For questions or issues, check the logs in:
- Backend: Vercel dashboard
- Frontend: Browser console
- Database: Supabase logs
