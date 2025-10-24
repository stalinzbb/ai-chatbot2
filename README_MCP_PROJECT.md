# AI Chatbot with Figma MCP Integration

## 🎯 Project Goal

Build an AI-powered chatbot that helps users query the **Double Good Design System** by accessing Figma design files through **Model Context Protocol (MCP)** instead of the traditional Figma REST API.

---

## 🚨 Current Status: BLOCKED

**Status:** 🔴 Not Functional
**Blocker:** OpenRouter account has no credits (requests return 402)
**Last Updated:** 2025-10-24

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
- MCP client connects to Figma Desktop (`http://127.0.0.1:3845/mcp`).
- Database setup and authentication (NextAuth + PostgreSQL).
- OpenRouter wiring for Claude 3.5 Sonnet across chat, reasoning, and title roles.
- MCP tooling (`get_design_context`, `get_variable_defs`, `get_metadata`, `get_screenshot`, `get_code_connect_map`) plus the `list_file_variables` aggregator (MCP + REST hybrid).

### What's Broken ❌
- **Critical:** Chat responses fail because OpenRouter returns `402 Insufficient credits`.
- **Minor:** React hydration warning in the chat header.

### The Issue
```
OpenRouter Error 402:
"Insufficient credits. This account never purchased credits."
```

---

## 🏗️ Architecture

```
User Question
    ↓
AI Chatbot (Next.js + Vercel AI SDK)
    ↓
OpenRouter API (Claude 3.5 Sonnet)
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
- **LLM Provider:** OpenRouter (Claude 3.5 Sonnet)
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
└── tools/                 # MCP tools and aggregators
    ├── get-design-context.ts
    ├── get-variable-defs.ts
    ├── get-metadata.ts
    ├── get-screenshot.ts
    ├── get-code-connect-map.ts
    └── list-file-variables.ts
├── utils.ts
```

### Chat API
```
/app/(chat)/api/chat/route.ts  # Main chat endpoint (tool registration + billing errors)
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

**Current Issue:** Messages fail with "We’re having trouble sending" until OpenRouter credits are restored.

---

## 🔧 Temporary Workaround

To test the UI without incurring costs, switch to the SDK’s test provider or mock responses:

```typescript
const provider = isTestEnvironment ? testProvider : openrouterProvider;
```

This bypasses OpenRouter billing while keeping MCP tooling wired up.

---

## 📊 Implementation Progress

| Feature | Status | Notes |
|---------|--------|-------|
| MCP Client | ✅ Done | Connects to Figma Desktop |
| MCP Tools | ✅ Created | MCP wrappers + `list_file_variables` aggregator |
| Database | ✅ Done | PostgreSQL + migrations |
| Auth | ✅ Done | NextAuth login/register |
| OpenRouter | ⚠️ Needs credits | Configuration ready; account unfunded |
| Chat Streaming | ❌ Blocked | OpenRouter returns 402 |
| UI | ⚠️ Works | Minor hydration warning |

**Overall:** ~80% complete, blocked by OpenRouter billing

---

## 🎯 Next Steps

### Immediate (To Unblock)
1. Add credits to the configured OpenRouter account (or swap in a funded key).
2. Confirm `/api/chat` streams successfully once credits are active.

### After Unblocking
1. Test MCP tools end-to-end, including `list_file_variables` REST fallback.
2. Fix the hydration warning in `components/chat-header.tsx`.
3. Improve error handling so billing failures surface in the UI.

### Future Enhancements
1. Hybrid approach (REST API + MCP)
2. Remote MCP server for Vercel deployment
3. Better Figma file context management

---

## 💡 Key Insights

1. **MCP Integration Works** – The MCP client successfully connects and calls tools.
2. **Billing is a Hard Stop** – OpenRouter returns 402 immediately when credits are exhausted.
3. **Hybrid Approach Helps** – `list_file_variables` bridges MCP discovery and REST enumeration.
4. **Local-Only for Now** – MCP still requires Figma Desktop running locally.

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
