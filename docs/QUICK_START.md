# Quick Start Guide - AI Chatbot with Figma MCP

## 🚨 Current Status: NOT WORKING

The chatbot is currently **not functional** due to tool schema validation errors with OpenRouter. See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for full details.

---

## 📋 What You Need

1. **Figma Desktop** running with MCP server enabled (`http://127.0.0.1:3845/mcp`)
2. **PostgreSQL** database (already configured in `.env.local`)
3. **OpenRouter API Key** (already in `.env.local`)
4. **Node.js** v24.7.0
5. **pnpm** 9.12.3

---

## 🚀 How to Run (When Fixed)

```bash
# 1. Install dependencies
pnpm install

# 2. Run database migrations
pnpm db:migrate

# 3. Start dev server
pnpm dev

# 4. Open browser
# Go to http://localhost:3000

# 5. Login/Register
# Create an account or login

# 6. Ask questions
# Type: "Hello" or "What can you help with?"
```

---

## 🐛 Current Blocking Issue

**Error:**
```
Provider returned error: Invalid schema for function 'getWeather'
```

**What's happening:**
- User sends message
- Chat shows "thinking..."
- Message vanishes
- No response appears
- Must reload page

**Why:**
OpenRouter rejects the tool schemas being sent by the Vercel AI SDK.

---

## 🔧 Quick Workaround (To Test Basic Chat)

**Disable all tools temporarily:**

Edit `/app/(chat)/api/chat/route.ts`:

```typescript
// Line ~194-204
experimental_activeTools: [],  // ← Empty array
tools: {},                     // ← Empty object
```

Restart server:
```bash
pnpm dev
```

Now basic chat should work (without tool calling).

---

## 📚 Full Documentation

- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Complete project overview, issues, and solutions
- **[MCP_INTEGRATION.md](./MCP_INTEGRATION.md)** - MCP integration guide
- **[figma-mcp-tools.md](./figma-mcp-tools.md)** - MCP tools documentation

---

## 🆘 Need Help?

1. Read [PROJECT_STATUS.md](./PROJECT_STATUS.md) first
2. Check terminal logs when sending messages
3. Check browser console (F12) for errors
4. Check Network tab for API responses

---

## ✅ What's Working

- ✅ MCP client connection to Figma Desktop
- ✅ Database and authentication
- ✅ OpenRouter API connection
- ✅ Project structure

## ❌ What's Broken

- ❌ Chat responses (tool schema error)
- ⚠️ React hydration warning (non-critical)

---

**Next Steps:** See "Priority 1: Fix Tool Schema Issue" in [PROJECT_STATUS.md](./PROJECT_STATUS.md)
