# AI Chatbot with Figma MCP Integration

## 🎯 Project Goal

Build an AI-powered chatbot that helps users query the **Double Good Design System** by accessing Figma design files through **Model Context Protocol (MCP)** instead of the traditional Figma REST API.

---

## 🚨 Current Status: BLOCKED

**Status:** 🔴 Not Functional
**Blocker:** OpenRouter rejects tool schemas - chat responses fail
**Last Updated:** 2025-01-24

---

## 📚 Documentation

All comprehensive documentation is in the `/docs` folder:

### Start Here
1. **[QUICK_START.md](./docs/QUICK_START.md)** - Quick overview and how to run
2. **[PROJECT_STATUS.md](./docs/PROJECT_STATUS.md)** - Complete requirements, implementation, and issues

### Reference
3. **[MCP_INTEGRATION.md](./docs/MCP_INTEGRATION.md)** - Full MCP integration guide
4. **[figma-mcp-tools.md](./docs/figma-mcp-tools.md)** - MCP tools reference

---

## ⚡ Quick Overview

### What Works ✅
- MCP client connects to Figma Desktop (`http://127.0.0.1:3845/mcp`)
- Database setup and authentication (NextAuth + PostgreSQL)
- OpenRouter API integration (GPT-4o-mini)
- 5 MCP tools implemented and ready

### What's Broken ❌
- **Critical:** Chat responses fail due to tool schema errors
- **Minor:** React hydration warning in UI

### The Issue
```
OpenRouter Error 400:
"Invalid schema for function 'getWeather':
 schema must be a JSON Schema of 'type: \"object\"',
 got 'type: \"None\"'."
```

---

## 🏗️ Architecture

```
User Question
    ↓
AI Chatbot (Next.js + Vercel AI SDK)
    ↓
OpenRouter API (GPT-4o-mini)
    ↓ [Tool Calls]
MCP Client → Figma Desktop MCP Server
    ↓ [Design Data]
Back to AI → Formatted Response
    ↓
User sees answer
```

**Currently failing at:** OpenRouter rejects tool schemas

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15.3
- **LLM SDK:** Vercel AI SDK 5.0.26
- **LLM Provider:** OpenRouter (GPT-4o-mini)
- **MCP SDK:** @modelcontextprotocol/sdk 1.20.1
- **Auth:** NextAuth.js 5.0
- **Database:** PostgreSQL + Drizzle ORM
- **Runtime:** Node.js 24.7.0

---

## 📦 Key Files

### MCP Integration
```
/lib/mcp/
├── client.ts              # MCP client singleton
└── tools/                 # 5 MCP tools
    ├── get-design-context.ts
    ├── get-variable-defs.ts
    ├── get-metadata.ts
    ├── get-screenshot.ts
    └── get-code-connect-map.ts
```

### Chat API
```
/app/(chat)/api/chat/route.ts  # Main chat endpoint (has issues)
```

### Configuration
```
/.env.local                     # Environment variables
/lib/ai/providers.ts           # OpenRouter config
/lib/ai/models.ts              # Model definitions
```

---

## 🚀 How to Run (When Fixed)

```bash
# Install
pnpm install

# Setup database
pnpm db:migrate

# Start server
pnpm dev

# Open http://localhost:3000
```

**Current Issue:** Messages will show "thinking..." then disappear.

---

## 🔧 Temporary Workaround

To test basic chat without tools:

**Edit `/app/(chat)/api/chat/route.ts`:**
```typescript
experimental_activeTools: [],  // Empty
tools: {},                     // Empty
```

This disables tool calling, allowing basic conversation.

---

## 📊 Implementation Progress

| Feature | Status | Notes |
|---------|--------|-------|
| MCP Client | ✅ Done | Connects to Figma Desktop |
| MCP Tools | ✅ Created | 5 tools ready |
| Database | ✅ Done | PostgreSQL + migrations |
| Auth | ✅ Done | NextAuth login/register |
| OpenRouter | ✅ Done | API key working |
| Tool Schemas | ❌ Broken | OpenRouter rejects schemas |
| Chat Streaming | ❌ Broken | Dependent on tool schemas |
| UI | ⚠️ Works | Minor hydration warning |

**Overall:** ~80% complete, blocked by tool schema issue

---

## 🎯 Next Steps

### Immediate (To Unblock)
1. Debug tool schema serialization
2. Test with zero tools → add incrementally
3. Manually define OpenAI function schemas
4. OR switch LLM provider temporarily

### After Unblocking
1. Test MCP tools end-to-end
2. Fix hydration error
3. Improve error handling
4. Add loading states

### Future Enhancements
1. Hybrid approach (REST API + MCP)
2. Remote MCP server for Vercel deployment
3. Better Figma file context management

---

## 💡 Key Insights

1. **MCP Integration Works** - The MCP client successfully connects and calls tools
2. **Schema Validation is Critical** - OpenRouter is strict about function schemas
3. **Vercel AI SDK Limitations** - Zod → JSON Schema conversion may have issues
4. **Local-Only for Now** - MCP requires Figma Desktop running locally

---

## 🆘 Getting Help

1. **Read:** [PROJECT_STATUS.md](./docs/PROJECT_STATUS.md) - Most comprehensive
2. **Quick Reference:** [QUICK_START.md](./docs/QUICK_START.md)
3. **Check Logs:** Terminal output when sending messages
4. **Network Tab:** Browser DevTools → Network → `/api/chat`

---

## 📝 Scripts

```bash
# Test MCP connection
npx tsx scripts/test-mcp-integration.ts

# Discover MCP tools
npx tsx scripts/discover-mcp-tools.ts

# Test chat API (requires auth)
npx tsx scripts/test-chat-api.ts

# Database
pnpm db:migrate     # Run migrations
pnpm db:push        # Push schema (may fail)
```

---

## 🔗 Related Links

- [OpenRouter Docs](https://openrouter.ai/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [MCP Specification](https://modelcontextprotocol.io)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)

---

## 📅 Timeline

- **2025-01-24:** MCP integration implemented, tool schema issue discovered
- **Status:** Blocked, awaiting schema fix

---

## 👥 Contributors

- Initial MCP integration and implementation
- Current status: Pending resolution of tool schema compatibility

---

**For complete details, see [PROJECT_STATUS.md](./docs/PROJECT_STATUS.md)**
