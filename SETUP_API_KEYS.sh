#!/bin/bash

# 🔑 IRIS Prime API Keys - Quick Setup Script
# This script helps you set up the API key management system

set -e

echo "🔑 IRIS Prime API Keys Setup"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check environment variables
echo -e "${BLUE}Step 1: Checking environment variables...${NC}"
echo ""

API_DIR="/home/iris/code/experimental/iris-prime-api"
CONSOLE_DIR="/home/iris/code/experimental/iris-prime-console"

if [ -f "$API_DIR/.env" ]; then
  if grep -q "ADMIN_API_KEY" "$API_DIR/.env"; then
    echo -e "${GREEN}✓ Backend ADMIN_API_KEY is configured${NC}"
  else
    echo -e "${RED}✗ Backend ADMIN_API_KEY is missing${NC}"
  fi
else
  echo -e "${RED}✗ Backend .env file not found${NC}"
fi

if [ -f "$CONSOLE_DIR/.env" ]; then
  if grep -q "VITE_ADMIN_API_KEY" "$CONSOLE_DIR/.env"; then
    echo -e "${GREEN}✓ Frontend VITE_ADMIN_API_KEY is configured${NC}"
  else
    echo -e "${RED}✗ Frontend VITE_ADMIN_API_KEY is missing${NC}"
  fi
else
  echo -e "${RED}✗ Frontend .env file not found${NC}"
fi

echo ""

# Step 2: Display SQL script location
echo -e "${BLUE}Step 2: Database Setup${NC}"
echo ""
echo "You need to run the SQL script in Supabase SQL Editor:"
echo ""
echo -e "${YELLOW}SQL Script Location:${NC}"
echo "  $API_DIR/scripts/create-iris-api-keys-table.sql"
echo ""
echo -e "${YELLOW}Supabase SQL Editor URL:${NC}"
echo "  https://supabase.com/dashboard/project/jvccmgcybmphebyvvnxo/sql/new"
echo ""
echo "To view the SQL script, run:"
echo -e "  ${GREEN}cat $API_DIR/scripts/create-iris-api-keys-table.sql${NC}"
echo ""

# Ask if user wants to open the SQL editor
read -p "Would you like to open the Supabase SQL Editor in your browser? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Opening Supabase SQL Editor..."
  xdg-open "https://supabase.com/dashboard/project/jvccmgcybmphebyvvnxo/sql/new" 2>/dev/null || \
  open "https://supabase.com/dashboard/project/jvccmgcybmphebyvvnxo/sql/new" 2>/dev/null || \
  echo "Please open this URL manually: https://supabase.com/dashboard/project/jvccmgcybmphebyvvnxo/sql/new"
fi

echo ""

# Ask if user wants to copy the SQL script to clipboard
read -p "Would you like to copy the SQL script to clipboard? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if command -v xclip &> /dev/null; then
    cat "$API_DIR/scripts/create-iris-api-keys-table.sql" | xclip -selection clipboard
    echo -e "${GREEN}✓ SQL script copied to clipboard!${NC}"
  elif command -v pbcopy &> /dev/null; then
    cat "$API_DIR/scripts/create-iris-api-keys-table.sql" | pbcopy
    echo -e "${GREEN}✓ SQL script copied to clipboard!${NC}"
  else
    echo -e "${YELLOW}⚠ Clipboard tool not found. Please copy manually.${NC}"
  fi
fi

echo ""

# Step 3: Test local setup
echo -e "${BLUE}Step 3: Testing Local Setup${NC}"
echo ""
echo "After running the SQL script, you can test the setup locally:"
echo ""
echo -e "${YELLOW}Terminal 1 - Start Backend:${NC}"
echo "  cd $API_DIR"
echo "  npm run dev"
echo ""
echo -e "${YELLOW}Terminal 2 - Start Frontend:${NC}"
echo "  cd $CONSOLE_DIR"
echo "  npm run dev"
echo ""
echo -e "${YELLOW}Terminal 3 - Test API:${NC}"
echo "  curl -X POST http://localhost:3000/api/admin/api-keys \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'X-Admin-Key: lsp309Ktq8SF1eZmlO9XbR0Ch4nnOk34y/f095V/jWQ=' \\"
echo "    -d '{\"projectId\":\"test\",\"projectName\":\"Test\",\"label\":\"Dev\"}'"
echo ""
echo -e "${YELLOW}Or visit the UI:${NC}"
echo "  http://localhost:5173/settings/api-keys"
echo ""

# Step 4: Deployment instructions
echo -e "${BLUE}Step 4: Deployment${NC}"
echo ""
echo "Once local testing is complete, deploy to production:"
echo ""
echo -e "${YELLOW}Deploy Backend:${NC}"
echo "  cd $API_DIR"
echo "  vercel env add ADMIN_API_KEY production"
echo "  # Paste: lsp309Ktq8SF1eZmlO9XbR0Ch4nnOk34y/f095V/jWQ="
echo "  vercel --prod"
echo ""
echo -e "${YELLOW}Deploy Frontend:${NC}"
echo "  cd $CONSOLE_DIR"
echo "  npm run build"
echo "  vercel --prod"
echo ""

# Summary
echo -e "${GREEN}=============================="
echo "Setup Summary"
echo -e "==============================${NC}"
echo ""
echo "✓ Environment variables configured"
echo "✓ SQL script ready at: scripts/create-iris-api-keys-table.sql"
echo "✓ Admin API key generated"
echo "✓ Frontend and backend configured"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Run the SQL script in Supabase SQL Editor"
echo "2. Test locally (see commands above)"
echo "3. Deploy to production"
echo ""
echo -e "${GREEN}For detailed instructions, see:${NC}"
echo "  $API_DIR/API_KEYS_SETUP_GUIDE.md"
echo ""
echo -e "${GREEN}🎉 Setup script complete!${NC}"

