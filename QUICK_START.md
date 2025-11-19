# 🚀 IRIS Prime API Keys - Quick Start

## ⚡ 3-Step Setup

### 1️⃣ Run SQL Script in Supabase

**Open:** https://supabase.com/dashboard/project/jvccmgcybmphebyvvnxo/sql/new

**Copy & Paste:**
```bash
cat /home/iris/code/experimental/iris-prime-api/scripts/create-iris-api-keys-table.sql
```

**Click:** "Run" button

### 2️⃣ Test Locally

```bash
# Terminal 1 - Backend
cd /home/iris/code/experimental/iris-prime-api
npm run dev

# Terminal 2 - Frontend
cd /home/iris/code/experimental/iris-prime-console
npm run dev

# Terminal 3 - Test
curl -X POST http://localhost:3000/api/admin/api-keys \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: lsp309Ktq8SF1eZmlO9XbR0Ch4nnOk34y/f095V/jWQ=" \
  -d '{"projectId":"test","projectName":"Test Project","label":"Development"}'
```

**Or visit:** http://localhost:5173/settings/api-keys

### 3️⃣ Deploy

```bash
# Backend
cd /home/iris/code/experimental/iris-prime-api
vercel env add ADMIN_API_KEY production
# Paste: lsp309Ktq8SF1eZmlO9XbR0Ch4nnOk34y/f095V/jWQ=
vercel --prod

# Frontend
cd /home/iris/code/experimental/iris-prime-console
npm run build
vercel --prod
```

---

## 🔑 Environment Variables (Already Configured)

### Backend (.env)
```bash
SUPABASE_URL=https://jvccmgcybmphebyvvnxo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_API_KEY=lsp309Ktq8SF1eZmlO9XbR0Ch4nnOk34y/f095V/jWQ=
```

### Frontend (.env)
```bash
VITE_API_BASE=https://iris-prime-api.vercel.app
VITE_ADMIN_API_KEY=lsp309Ktq8SF1eZmlO9XbR0Ch4nnOk34y/f095V/jWQ=
VITE_SUPABASE_URL=https://jvccmgcybmphebyvvnxo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📚 API Endpoints

### Create API Key
```bash
POST /api/admin/api-keys
Headers: X-Admin-Key: <admin-key>
Body: {"projectId":"proj","projectName":"Name","label":"Production"}
```

### List API Keys
```bash
GET /api/admin/api-keys?projectId=proj
Headers: X-Admin-Key: <admin-key>
```

### Revoke API Key
```bash
DELETE /api/admin/api-keys
Headers: X-Admin-Key: <admin-key>
Body: {"keyId":"uuid"}
```

### Rotate API Key
```bash
PUT /api/admin/api-keys
Headers: X-Admin-Key: <admin-key>
Body: {"keyId":"uuid"}
```

---

## 🎯 Key Features

✅ Multiple keys per project  
✅ SHA-256 hashed storage  
✅ Usage tracking  
✅ Easy rotation  
✅ Admin dashboard UI  
✅ One-time key display  
✅ Automatic usage stats  

---

## 🐛 Troubleshooting

**"Table does not exist"**  
→ Run SQL script in Supabase (Step 1)

**"Unauthorized"**  
→ Check ADMIN_API_KEY in .env files

**Frontend can't connect**  
→ Verify VITE_API_BASE points to backend

---

## 📖 Full Documentation

See: `API_KEYS_SETUP_GUIDE.md` for detailed instructions

---

**That's it! Just run the SQL script and you're ready to go! 🎉**

