# ✅ IRIS API Keys - Setup Complete!

## 🎉 What's Been Done

### ✓ Environment Variables Configured

**Backend** (`iris-prime-api/.env`):
- ✅ `SUPABASE_URL` - Already set
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Already set
- ✅ `ADMIN_API_KEY` - **NEW!** Generated and added

**Frontend** (`iris-prime-console/.env`):
- ✅ `VITE_API_BASE` - Already set
- ✅ `VITE_ADMIN_API_KEY` - **NEW!** Added (matches backend)
- ✅ `VITE_SUPABASE_URL` - Already set
- ✅ `VITE_SUPABASE_ANON_KEY` - Already set

### ✓ Admin API Key Generated

```
lsp309Ktq8SF1eZmlO9XbR0Ch4nnOk34y/f095V/jWQ=
```

**⚠️ IMPORTANT:** This key is already configured in both `.env` files. Keep it secure!

### ✓ Code Already Implemented

All the code is ready to use:

**Backend:**
- ✅ `lib/apiKeys.ts` - API key management functions
- ✅ `api/admin/api-keys.ts` - Admin API endpoints
- ✅ `scripts/create-iris-api-keys-table.sql` - Database schema

**Frontend:**
- ✅ `src/pages/ApiKeysPage.tsx` - API keys management UI
- ✅ Route configured: `/settings/api-keys`

### ✓ Documentation Created

- ✅ `API_KEYS_SETUP_GUIDE.md` - Comprehensive setup guide
- ✅ `QUICK_START.md` - Quick reference
- ✅ `SETUP_API_KEYS.sh` - Interactive setup script
- ✅ `SETUP_COMPLETE.md` - This file!

---

## 🚨 ONE STEP REMAINING

### Run the SQL Script in Supabase

**I've opened the Supabase SQL Editor for you!**

1. **Copy the SQL script:**
   ```bash
   cat /home/iris/code/experimental/iris-prime-api/scripts/create-iris-api-keys-table.sql
   ```

2. **Paste it into the SQL Editor** (already open in your browser)

3. **Click "Run"**

4. **Verify:** You should see "Success. No rows returned" or similar

That's it! The table will be created with:
- `iris_api_keys` table
- Indexes for fast lookups
- `increment_usage_count()` function
- Auto-update triggers

---

## 🧪 Test It Out

### Option 1: Use the UI (Recommended)

```bash
# Terminal 1 - Backend
cd /home/iris/code/experimental/iris-prime-api
npm run dev

# Terminal 2 - Frontend
cd /home/iris/code/experimental/iris-prime-console
npm run dev
```

Then visit: **http://localhost:5173/settings/api-keys**

### Option 2: Use curl

```bash
# Create a test API key
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

---

## 🚀 Deploy to Production

Once local testing is successful:

### Deploy Backend

```bash
cd /home/iris/code/experimental/iris-prime-api

# Add admin key to Vercel
vercel env add ADMIN_API_KEY production
# When prompted, paste: lsp309Ktq8SF1eZmlO9XbR0Ch4nnOk34y/f095V/jWQ=

# Deploy
vercel --prod
```

### Deploy Frontend

```bash
cd /home/iris/code/experimental/iris-prime-console

# Build
npm run build

# Deploy
vercel --prod
```

---

## 📊 What You Get

### Multiple Keys Per Project
Create separate keys for:
- 🟢 Production
- 🟡 Staging
- 🔵 Development
- 🟣 CI/CD

### Usage Tracking
- See how many times each key has been used
- Track last usage timestamp
- Monitor key activity

### Security Features
- SHA-256 hashed storage (keys never stored in plain text)
- One-time display (keys shown only once after creation)
- Easy rotation (create new key, revoke old one)
- Soft delete (revoked keys kept for audit trail)

### Beautiful Admin UI
- Create keys with a few clicks
- View all keys for a project
- Revoke keys instantly
- Copy keys to clipboard
- See usage statistics

---

## 🔒 Security Best Practices

1. **Never commit keys to git**
   - `.env` files are already in `.gitignore`

2. **Rotate keys regularly**
   - Use the rotation endpoint
   - Especially after team member changes

3. **Use different keys per environment**
   - Separate prod/staging/dev keys
   - Use labels to identify them

4. **Monitor usage**
   - Check `usage_count` regularly
   - Revoke unused keys

5. **Keep admin key secure**
   - Only share with trusted team members
   - Store in password manager
   - Rotate if compromised

---

## 📞 Need Help?

### Common Issues

**"Table does not exist"**
- Run the SQL script in Supabase (see above)

**"Unauthorized" when calling admin endpoints**
- Check `ADMIN_API_KEY` in backend `.env`
- Verify `X-Admin-Key` header matches

**Frontend can't connect to backend**
- Check `VITE_API_BASE` in frontend `.env`
- For local: `http://localhost:3000`
- For prod: `https://iris-prime-api.vercel.app`

**"Admin API key not configured" in UI**
- Check `VITE_ADMIN_API_KEY` in frontend `.env`

### Documentation

- **Quick Start:** `QUICK_START.md`
- **Full Guide:** `API_KEYS_SETUP_GUIDE.md`
- **Interactive Setup:** Run `./SETUP_API_KEYS.sh`

---

## 🎯 Summary

✅ **Environment variables configured** in both repos  
✅ **Admin API key generated** and added to .env files  
✅ **All code implemented** and ready to use  
✅ **Documentation created** for reference  
✅ **SQL script ready** to run in Supabase  
✅ **Supabase SQL Editor opened** in your browser  

**Next Step:** Run the SQL script in Supabase, then test locally!

---

**🎉 You're almost there! Just run that SQL script and you're good to go!**

