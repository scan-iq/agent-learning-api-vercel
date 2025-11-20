# 🔑 IRIS API Keys Setup Guide

Complete guide to set up the API key management system across all three repositories.

## 📋 Prerequisites

- Access to Supabase project: `jvccmgcybmphebyvvnxo` (RuvFox org)
- Node.js installed
- Both repositories cloned:
  - `/home/iris/code/experimental/iris-prime-api`
  - `/home/iris/code/experimental/iris-prime-console`

## 🚀 Step 1: Create Database Table

### Option A: Using Supabase SQL Editor (Recommended)

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/jvccmgcybmphebyvvnxo/sql/new
   ```

2. **Copy and paste the SQL script:**
   ```bash
   cat /home/iris/code/experimental/iris-prime-api/scripts/create-iris-api-keys-table.sql
   ```

3. **Click "Run" to execute the script**

4. **Verify the table was created:**
   - Go to Table Editor
   - Look for `iris_api_keys` table
   - Should have columns: id, project_id, project_name, api_key_hash, api_key_prefix, label, etc.

### Option B: Using psql (Alternative)

```bash
# Get your database connection string from Supabase dashboard
psql "postgresql://postgres:[YOUR-PASSWORD]@db.jvccmgcybmphebyvvnxo.supabase.co:5432/postgres" \
  -f /home/iris/code/experimental/iris-prime-api/scripts/create-iris-api-keys-table.sql
```

## ✅ Step 2: Verify Environment Variables

The environment variables have been configured automatically:

### Backend (.env in iris-prime-api):
```bash
SUPABASE_URL=https://jvccmgcybmphebyvvnxo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_API_KEY=lsp309Ktq8SF1eZmlO9XbR0Ch4nnOk34y/f095V/jWQ=
```

### Frontend (.env in iris-prime-console):
```bash
VITE_API_BASE=https://iris-prime-api.vercel.app
VITE_ADMIN_API_KEY=lsp309Ktq8SF1eZmlO9XbR0Ch4nnOk34y/f095V/jWQ=
VITE_SUPABASE_URL=https://jvccmgcybmphebyvvnxo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🧪 Step 3: Test Locally

### Terminal 1 - Start Backend API

```bash
cd /home/iris/code/experimental/iris-prime-api
npm install  # If not already done
npm run dev
```

Expected output:
```
> iris-prime-api@1.0.0 dev
> tsx watch lib/index.ts

Server running on http://localhost:3000
```

### Terminal 2 - Start Frontend Console

```bash
cd /home/iris/code/experimental/iris-prime-console
npm install  # If not already done
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

### Terminal 3 - Test API Key Creation

```bash
# Test creating an API key via the admin endpoint
curl -X POST http://localhost:3000/api/admin/api-keys \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: lsp309Ktq8SF1eZmlO9XbR0Ch4nnOk34y/f095V/jWQ=" \
  -d '{
    "projectId": "test-project",
    "projectName": "Test Project",
    "label": "Development"
  }'
```

Expected response:
```json
{
  "success": true,
  "apiKey": "sk_live_AbCdEfGh1234567890...",
  "key": {
    "id": "uuid-here",
    "projectId": "test-project",
    "projectName": "Test Project",
    "prefix": "sk_live_AbCd...",
    "label": "Development",
    "createdAt": "2025-11-18T..."
  },
  "warning": "Save this API key now - it will not be shown again!"
}
```

### Test in Browser

1. Open http://localhost:5173/settings/api-keys
2. You should see the API Keys management interface
3. Try creating a new API key through the UI

## 📊 Step 4: Verify Database

Check that the API key was stored correctly:

```sql
-- Run in Supabase SQL Editor
SELECT 
  id,
  project_id,
  project_name,
  api_key_prefix,
  label,
  usage_count,
  is_active,
  created_at
FROM iris_api_keys
ORDER BY created_at DESC;
```

## 🚀 Step 5: Deploy to Production

### Deploy Backend

```bash
cd /home/iris/code/experimental/iris-prime-api

# Make sure environment variables are set in Vercel
vercel env add ADMIN_API_KEY production
# Paste: lsp309Ktq8SF1eZmlO9XbR0Ch4nnOk34y/f095V/jWQ=

# Deploy
vercel --prod
```

### Deploy Frontend

```bash
cd /home/iris/code/experimental/iris-prime-console

# Build the frontend
npm run build

# Deploy to Vercel (or your hosting provider)
vercel --prod

# Or deploy to Netlify, etc.
```

## 📚 API Endpoints Reference

### Admin Endpoints (Require X-Admin-Key header)

#### List API Keys
```bash
GET /api/admin/api-keys?projectId=your-project-id
Headers: X-Admin-Key: <your-admin-key>
```

#### Create API Key
```bash
POST /api/admin/api-keys
Headers: 
  Content-Type: application/json
  X-Admin-Key: <your-admin-key>
Body:
{
  "projectId": "your-project",
  "projectName": "Your Project Name",
  "label": "Production"
}
```

#### Revoke API Key
```bash
DELETE /api/admin/api-keys
Headers:
  Content-Type: application/json
  X-Admin-Key: <your-admin-key>
Body:
{
  "keyId": "uuid-of-key-to-revoke"
}
```

#### Rotate API Key
```bash
PUT /api/admin/api-keys
Headers:
  Content-Type: application/json
  X-Admin-Key: <your-admin-key>
Body:
{
  "keyId": "uuid-of-key-to-rotate"
}
```

## 🔒 Security Best Practices

1. **Never commit API keys to git**
   - The `.env` files are already in `.gitignore`
   - Always use environment variables

2. **Rotate keys regularly**
   - Use the rotation endpoint to create new keys
   - Revoke old keys after migration

3. **Monitor usage**
   - Check `usage_count` and `last_used_at` regularly
   - Revoke unused keys

4. **Separate keys per environment**
   - Create different keys for: Production, Staging, Development, CI/CD
   - Use the `label` field to identify them

## 🎯 Key Features

✅ **Multiple keys per project** - Separate keys for prod/staging/dev  
✅ **Secure storage** - SHA-256 hashed keys in database  
✅ **Usage tracking** - See how often each key is used  
✅ **Easy rotation** - Rotate compromised keys without downtime  
✅ **Admin dashboard** - Beautiful UI for managing keys  
✅ **One-time display** - Keys shown only once for security  
✅ **Automatic tracking** - Usage stats updated on each API call  

## 🐛 Troubleshooting

### "Table iris_api_keys does not exist"
- Run the SQL script in Supabase SQL Editor (Step 1)

### "Unauthorized" when calling admin endpoints
- Check that `ADMIN_API_KEY` is set in backend `.env`
- Verify the `X-Admin-Key` header matches the env variable

### "Failed to create API key: unique constraint violation"
- A key with that label already exists for this project
- Use a different label or revoke the existing key first

### Frontend can't connect to backend
- Check that `VITE_API_BASE` points to the correct backend URL
- For local dev: `http://localhost:3000`
- For production: `https://iris-prime-api.vercel.app`

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Check the backend logs: `vercel logs` or local terminal
3. Verify database connection in Supabase dashboard
4. Check that all environment variables are set correctly

---

**All the code is ready to use - just run the SQL script and you're good to go!** 🎉

