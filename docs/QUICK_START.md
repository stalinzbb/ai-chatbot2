# Quick Start Guide - AI Chatbot with Figma MCP

## 🚨 Current Status: BLOCKED

The chatbot is currently **not functional** because the configured OpenRouter account has **no credits**. Every chat request returns HTTP 402 until credits are added. See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for full details.

---

## 📋 What You Need

1. **Figma Desktop** running with MCP server enabled (`http://127.0.0.1:3845/mcp`)
2. **PostgreSQL** database (already configured in `.env.local`)
3. **OpenRouter API Key** (must belong to an account with credits)
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
Provider returned error: Insufficient credits. This account never purchased credits.
```

**What's happening:**
- User sends a message.
- Chat shows "We’re having trouble sending your message."
- Terminal logs show `AI_APICallError` with status 402.
- Response does not stream back until the account is funded.

**Why:**
OpenRouter rejects requests from accounts without credits, even if authentication succeeds.

---

## 🔧 Quick Workaround (To Test Basic Chat)

**Use the SDK test provider:**

Edit `/app/(chat)/api/chat/route.ts`:

```typescript
const provider = isTestEnvironment ? testProvider : openrouterProvider;
```

Set `NODE_ENV=test` or adjust `isTestEnvironment` to `true` while developing. This returns mock responses without hitting OpenRouter until credits are available.

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
- ✅ OpenRouter client configuration (requires credits)
- ✅ Project structure

## ❌ What's Broken

- ❌ Chat responses (OpenRouter 402)
- ⚠️ React hydration warning (non-critical)

---

**Next Steps:** See "Priority 1: Restore OpenRouter Service" in [PROJECT_STATUS.md](./PROJECT_STATUS.md)
