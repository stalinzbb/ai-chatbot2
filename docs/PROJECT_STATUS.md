# Project Status & Issues - AI Chatbot with Figma MCP Integration

**Date:** 2025-10-24
**Status:** 🟡 Partially implemented — requires OpenRouter credits to complete end-to-end chat

---

## 📋 Project Requirements

### Primary Goal
Build an AI chatbot that helps users query the Double Good Design System by accessing Figma design files through MCP (Model Context Protocol) instead of the Figma REST API.

### Key Requirements

#### 1. **Chatbot Functionality**
- **Local Deployment:** Run on `localhost:3000` using Next.js 15
- **LLM Provider:** OpenRouter API with GLM-4.6
- **Authentication:** User login/registration via NextAuth.js
- **Database:** PostgreSQL for storing chats, messages, and user data
- **Real-time Streaming:** Stream AI responses to the UI

#### 2. **Figma MCP Integration**
- **Replace Figma REST API** with Figma Desktop MCP server
- **MCP Server URL:** `http://127.0.0.1:3845/mcp`
- **Available MCP Tools:**
  - `get_design_context` - Get UI code for components
  - `get_variable_defs` - Get design tokens/variables
  - `get_metadata` - Get file/page structure
  - `get_screenshot` - Get component screenshots
  - `get_code_connect_map` - Get code implementation mappings

#### 3. **User Workflow**
User should be able to ask questions like:
- "Where is Button/Primary used in the Web Master file?"
- "What's the value of the 2X border radius token?"
- "Show me the code for the Navigation component"
- "What design tokens are available?"

And the chatbot should:
1. Understand the question
2. Call appropriate MCP tools to fetch Figma data
3. Use the LLM to reason over the data
4. Return a natural-language answer

---

## ✅ What Was Successfully Implemented

### 1. **MCP Client Module** (`/lib/mcp/`)
**Status:** ✅ Working

- Created singleton MCP client manager
- Implements connection to Figma Desktop MCP server
- Added connection timeout (5 seconds)
- Added tool call timeout (10 seconds)
- Proper error handling and cleanup

**Files Created:**
- `/lib/mcp/client.ts` - MCP client singleton
- `/lib/mcp/tools/get-design-context.ts`
- `/lib/mcp/tools/get-variable-defs.ts`
- `/lib/mcp/tools/get-metadata.ts`
- `/lib/mcp/tools/get-screenshot.ts`
- `/lib/mcp/tools/get-code-connect-map.ts`
- `/lib/mcp/tools/index.ts`

**Test Results:**
```bash
✅ MCP connection: Working
✅ Tool discovery: 7 tools found
✅ Tool execution: Working (tested with get_variable_defs, get_metadata)
```

### 2. **Tool Integration**
**Status:** ✅ Integrated

- Replaced old Figma REST API tools in chat API route
- Added 5 MCP tools to Vercel AI SDK
- Updated system prompts to guide LLM on MCP tool usage
- Deprecated old Figma REST API tools with clear migration notes

**Files Modified:**
- `/app/(chat)/api/chat/route.ts` - Added MCP tools, removed old Figma tools
- `/lib/ai/prompts.ts` - Updated system prompt with MCP guidance
- `/lib/ai/tools/query-figma-components.ts` - Marked as deprecated
- `/lib/ai/tools/get-design-tokens.ts` - Marked as deprecated

### 3. **Environment Configuration**
**Status:** ✅ Complete

- All sensitive values now live in `.env.local` (see `SETUP.md` for the full key list and placeholders).
- OpenRouter requires an API key tied to an account with credits.
- Figma MCP server URL defaults to `http://127.0.0.1:3845/mcp` while running the desktop app.

### 4. **Database Setup**
**Status:** ✅ Migrations Run

- PostgreSQL database initialized
- Drizzle ORM migrations completed
- Tables created: `User`, `Chat`, `Message_v2`, `Document`, `Vote_v2`

### 5. **Model Configuration**
**Status:** ✅ Fixed

- All chat roles now point to `z-ai/glm-4.6` via OpenRouter.
- Reasoning responses use the SDK middleware instead of a separate model.
- Title/artifact generation reuses GLM-4.6 for consistent behaviour.

### 6. **Testing Scripts**
**Status:** ✅ Created

**Scripts Created:**
- `/scripts/discover-mcp-tools.ts` - Discover MCP server tools
- `/scripts/test-mcp-integration.ts` - Test MCP connection and tools
- `/scripts/test-chat-api.ts` - Test chat API endpoint

### 7. **Hybrid Variable Aggregation**
**Status:** ✅ Implemented

- Added `listFileVariables` MCP wrapper to combine metadata discovery with Figma REST endpoints for variables/components when a `fileId` is provided.
- Introduced `cloneMCPContent` helper (`lib/mcp/utils.ts`) to safely clone MCP responses.
- Updated prompts, tool registration, and UI rendering to handle generic `tool-*` responses.

---

## ❌ Critical Issues (Blocking)

### Issue 1: **OpenRouter Requests Failing (402)**
**Severity:** 🔴 Critical
**Status:** Unresolved until credits are added

**Symptoms:**
- User sees “We’re having trouble sending your message.”
- Terminal logs show `AI_APICallError` from `https://openrouter.ai/api/v1/chat/completions`.
- Response payload contains `{ "error": { "message": "Insufficient credits. This account never purchased credits." } }` with HTTP status `402`.

**Root Cause:**
The configured OpenRouter API key belongs to an account with no credits. OpenRouter immediately rejects every request, preventing the chat stream from returning data to the UI.

**Attempted Fixes:**
1. 🔁 Retried with the same key — still 402.
2. ✅ Verified the key is otherwise valid (authentication succeeds before billing check).

**Resolution Options:**
- Add credits to the OpenRouter account or switch to a key linked to an account with existing balance.
- For local development, temporarily switch to the SDK’s `test` provider (mock responses) to run the UI without incurring costs.

---

### Issue 2: **Chat API 400 Bad Request Error**
**Severity:** 🟡 Medium
**Status:** Documented

**What it means:**
A `POST /api/chat 400` error occurs when the frontend sends a request that fails validation against the API schema defined in `app/(chat)/api/chat/schema.ts`.

**Common Causes:**

1. **Invalid UUIDs** - `id` or `message.id` not properly formatted UUID strings
2. **Text too long** - Message text exceeds the character limit (default: 2000 characters)
3. **Missing required fields** - Missing `id`, `message`, `selectedChatModel`, or `selectedVisibilityType`
4. **Invalid enum values** - Wrong model name or visibility type
5. **Invalid file format** - Only `image/jpeg` and `image/png` are supported

**Required Request Format:**
```json
{
  "id": "uuid-string",
  "message": {
    "id": "uuid-string",
    "role": "user",
    "parts": [
      { "type": "text", "text": "Your message here (max 2000 chars)" }
    ]
  },
  "selectedChatModel": "chat-model" | "chat-model-reasoning",
  "selectedVisibilityType": "public" | "private"
}
```

**How to Debug:**
1. Open browser DevTools → Network tab
2. Find the failed `/api/chat` request
3. Check the **Request Payload** to see what was sent
4. Compare against the schema requirements above
5. Check browser console for validation error details

**Resolution:**
- Ensure frontend sends properly formatted UUIDs
- Keep message text within character limits (increased to 10,000 characters)
- Use valid model and visibility enum values
- Check that all required fields are present

**Recent Improvements:**
- ✅ Text length limit increased from 2,000 to 10,000 characters
- ✅ Enhanced error messages now include specific validation failure details
- ✅ Server logs validation errors for debugging

---

### Issue 3: **React Hydration Error**
**Severity:** 🟡 Medium
**Status:** Unresolved (Non-blocking but indicates issues)

**Error Message:**
```
Error: Hydration failed because the server rendered text didn't match the client.
```

**Details:**
```
Expected button className: "inline-flex items-center justify-center..."
Received button className: "items-center justify-center..."

Expected text: "New Chat"
Received text: "Private"

Expected SVG path: "M 8.75,1 H7.25 V7.25..."
Received SVG path: "M10 4.5V6H6V4.5C6..."
```

**Location:** `components/chat-header.tsx` - Visibility selector button

**Root Cause:**
Server-side rendering producing different output than client-side hydration. Likely caused by:
- Dynamic className generation
- Component state initialization differences
- Random IDs or dynamic content

**Impact:**
- Warning in console (doesn't break functionality)
- May cause UI flicker on initial load
- Indicates potential SSR/CSR mismatch

---

### Issue 3: **Tool Schema Compatibility**
**Severity:** 🟢 Resolved
**Status:** Fixed (migrated to `inputSchema`)

**Summary:**
All MCP tool wrappers now define `inputSchema` objects (per OpenRouter function-call requirements) instead of using the deprecated `parameters` field. The deprecated `getWeather` tool was removed, eliminating the invalid schema entirely.

**Verification:**
- Local linting and type-checks confirm the schema conversions compile.
- Stream requests now fail solely because of billing (see Issue 1), not schema validation.

---

## 🔍 Debugging Steps Taken

### 1. MCP Connection Testing
```bash
✅ npx tsx scripts/discover-mcp-tools.ts
Result: Successfully discovered 7 tools

✅ npx tsx scripts/test-mcp-integration.ts
Result: Connection and tool calls working
```

### 2. OpenRouter API Testing
- Verified basic requests against `https://openrouter.ai/api/v1/chat/completions` using a local REST client.
- Confirmed the key is structurally valid (authentication succeeds prior to the billing check).

### 3. Database Testing
```bash
✅ pnpm db:migrate
Result: Migrations completed successfully
```

### 4. Network Inspection
- Browser DevTools → Network tab
- Observed: `/api/chat` returns 200 status
- Observed: Response body shows "Failed to load response data"
- Conclusion: Streaming response not being consumed by client

### 5. Terminal Logging Added
Added extensive logging in `/app/(chat)/api/chat/route.ts`:
- `[Chat API] Starting stream...` ✅
- `[Chat API] Executing streamText...` ✅
- `[openrouter] request ...` ✅
- `[Error [AI_APICallError]: Provider returned error]` ❌

---

## 🧩 Technical Architecture

### Request Flow

```
User Types Message
    ↓
Frontend (components/chat.tsx)
    ↓ POST /api/chat
Backend API Route (app/(chat)/api/chat/route.ts)
    ↓ Auth Check (NextAuth)
    ↓ Rate Limit Check
    ↓ Save Message to DB
    ↓ Create Stream
    ↓
streamText() - Vercel AI SDK
    ↓
OpenRouter API (GLM-4.6)
    ↓ Tool Calls (if needed)
MCP Client → Figma Desktop MCP Server
    ↓ Tool Results
Back to OpenRouter
    ↓ Response Stream
Back to Client (SSE)
    ↓
UI Updates with Response
```

### Where It's Failing

```
streamText() - Vercel AI SDK
    ↓
❌ OpenRouter API (GLM-4.6)
    ↓ Returns 400 Error
    ↓ "Invalid schema for function 'getWeather'"
    ↓
Error Handler in createUIMessageStream
    ↓
onError: (error) => {
  console.error("[Chat API] Stream error:", error);
  return `Error: ${error.message}`;
}
    ↓
But error message not reaching UI
```

---

## 🎯 What Should Happen vs What Is Happening

### Expected Behavior

```
User: "Hello"
    ↓
LLM: Responds with greeting (no tools needed)
    ↓
UI: Shows response immediately
```

```
User: "What design tokens are available?"
    ↓
LLM: Decides to call getVariableDefs tool
    ↓
MCP: Fetches variables from Figma Desktop
    ↓
LLM: Receives data, formats response
    ↓
UI: Shows formatted token list
```

### Actual Behavior

```
User: "Hello"
    ↓
LLM: Request sent to OpenRouter (with valid tool schemas)
    ↓
OpenRouter: Immediately returns 402 (insufficient credits)
    ↓
Error Handler: Captures AI_APICallError and logs the billing message
    ↓
UI: ❌ Shows "We’re having trouble sending your message" toast
    ↓ Message remains unsent until credits are added
```

---

## 📦 Dependencies & Versions

**Key Packages:**
```json
{
  "next": "15.3.0-canary.31",
  "ai": "5.0.26",
  "@ai-sdk/openai": "^2.0.53",
  "@ai-sdk/react": "2.0.26",
  "@modelcontextprotocol/sdk": "1.20.1",
  "next-auth": "5.0.0-beta.25",
  "drizzle-orm": "^0.34.0",
  "zod": "^3.25.76"
}
```

**Node Version:** v24.7.0
**Package Manager:** pnpm@9.12.3

---

## 🔧 Files Modified During Implementation

### Created Files
```
/lib/mcp/client.ts
/lib/mcp/tools/get-design-context.ts
/lib/mcp/tools/get-variable-defs.ts
/lib/mcp/tools/get-metadata.ts
/lib/mcp/tools/get-screenshot.ts
/lib/mcp/tools/get-code-connect-map.ts
/lib/mcp/tools/list-file-variables.ts
/lib/mcp/tools/index.ts
/lib/mcp/utils.ts
/scripts/discover-mcp-tools.ts
/scripts/test-mcp-integration.ts
/scripts/test-chat-api.ts
/docs/figma-mcp-tools.md
/docs/MCP_INTEGRATION.md
/docs/PROJECT_STATUS.md (this file)
```

### Modified Files
```
/app/(chat)/api/chat/route.ts
  - Registers MCP tools plus the `listFileVariables` aggregator
  - Adds billing-aware error handling and guest entitlements

/lib/ai/providers.ts
  - Updated to use GLM-4.6 model slugs

/lib/ai/models.ts
- Model mapping updated to use GLM-4.6 across all roles

/lib/ai/prompts.ts
  - Updated tool list, including guidance for `listFileVariables`

/lib/ai/entitlements.ts
  - Increased guest daily message limit to 200

/components/message.tsx
  - Added generic `tool-*` rendering fallback

/lib/ai/tools/query-figma-components.ts
  - Marked deprecated; lint fixes applied

/lib/ai/tools/get-design-tokens.ts
  - Added deprecation notice

/.gitignore
  - Expanded to cover env files, caches, and build artifacts

/.env.local
  - Added OPENROUTER_SITE_URL
  - Added FIGMA_MCP_SERVER_URL

/package.json
  - No changes (dependencies already present)
```

---

## 🚀 Next Steps to Resolve Issues

### Priority 1: Restore OpenRouter Service

1. **Fund the OpenRouter account** – add credits or attach a payment method.
2. **Alternatively, swap to a test provider** while developing locally to bypass billing.
3. **Re-run the chat flow** after credits are visible on the dashboard; confirm responses stream.

### Priority 2: Address UI Hydration Warning (Medium)

1. Investigate the visibility selector in `components/chat-header.tsx`.
2. Ensure server/client render paths use identical className strings.
3. Move dynamic calculations into `useEffect` or mark the button as client-only.

### Priority 3: Error Transparency Improvements (Nice-to-have)

1. Surface OpenRouter error messages (e.g., 402) directly in the UI toast.
2. Record billing-related failures in analytics/telemetry for easier diagnosis.

**Current Problem:** Errors not shown to user

**Fix:**
1. Ensure `onError` handler in `createUIMessageStream` returns visible error
2. Add UI toast/notification for API errors
3. Show error message in chat instead of message disappearing

---

## 🎓 Lessons Learned

### 1. **Provider Billing Stops Everything**
- OpenRouter immediately rejects requests when credits are exhausted.
- Always verify billing status before debugging higher-level failures.
- Surface billing issues prominently to avoid misdiagnosis.

### 2. **MCP Integration Works**
- MCP client successfully connects to Figma Desktop.
- Tools can be called and return data when the user has the right file open.
- The hybrid `listFileVariables` tool bridges MCP and REST effectively.

### 3. **Debugging Streaming Responses Needs Better Surfacing**
- Streaming SSE responses are opaque without server-side logging.
- Billing errors should propagate to the client instead of silently failing.
- Observability should include provider error codes.

### 4. **Environment Configuration Matters**
- Missing `OPENROUTER_SITE_URL` can cause issues.
- Database must be migrated before testing.
- MCP server must be running locally with the target file open.

---

## 📝 Recommendations

### Short Term (Fix Blocking Issues)

1. **Restore OpenRouter Service**
   - Add credits or switch to a funded API key.
   - Confirm the dashboard shows an available balance before retrying.

2. **Expose Provider Errors in UI**
   - Display OpenRouter status codes/messages in the toast.
   - Persist failures to logs/analytics for support.

3. **Regression Pass After Funding**
   - Re-run integration and Playwright tests once responses stream again.
   - Validate MCP tool calls (`listFileVariables`, etc.) end-to-end.

### Medium Term (Once Working)

1. **Improve MCP Integration**
   - Detect whether Figma Desktop is reachable and surface guidance.
   - Cache REST responses when `listFileVariables` is heavily used.

2. **Better User Experience**
   - Show loading states and active tools during long operations.
   - Surface the current Figma file/context in the UI.

3. **Testing & Monitoring**
   - Add integration tests that mock OpenRouter responses.
   - Monitor OpenRouter credit usage and alert on low balances.

### Long Term (Future Enhancements)

1. **Hybrid Approach (Option B)**
   - Use Figma REST API for search/discovery
   - Use MCP for detailed component queries
   - Best of both worlds

2. **Remote Deployment**
   - Set up remote MCP server for Vercel deployment
   - Or use tunneling for local MCP access
   - Enable production usage

3. **Enhanced Features**
   - Component comparison across files
   - Design token diff/changelog
   - Export design system documentation
   - Screenshot gallery generation

---

## 🆘 Known Workarounds

### If Chat Doesn't Work at All

**Temporary Fix:** Switch to test provider

```typescript
// In /app/(chat)/api/chat/route.ts
const provider = isTestEnvironment ? testProvider : openrouterProvider;
```

This bypasses OpenRouter billing and returns mock responses while you fund the account.

### If MCP Tools Fail

**Checklist:**
- Ensure Figma Desktop is running and the target file is open.
- Call `listFileVariables` with a `fileId` to warm up REST fallbacks.
- Verify the MCP server URL in `.env.local`.

### If Database Issues Occur

**Reset Database:**
```bash
pnpm db:push  # May fail with existing data
# OR
pnpm db:migrate  # Run migrations
```

---

## 📚 Relevant Documentation

### Internal Documentation
- `/docs/MCP_INTEGRATION.md` - Complete MCP integration guide
- `/docs/figma-mcp-tools.md` - Detailed MCP tool documentation
- `/docs/PROJECT_STATUS.md` - This file

### External Resources
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs)
- [Model Context Protocol Spec](https://modelcontextprotocol.io)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)

---

## 🏁 Current Status Summary

**What Works:**
- ✅ MCP client connection to Figma Desktop
- ✅ MCP tool discovery and execution
- ✅ Database setup and migrations
- ✅ User authentication (NextAuth)
- ✅ OpenRouter API key validation
- ✅ Environment configuration
- ✅ Project structure and organization

**What's Broken:**
- ❌ Chat streaming responses (blocked by OpenRouter 402)
- ⚠️ React hydration mismatch (visibility selector)

**Blocker:**
OpenRouter rejects every request with `402 Insufficient credits`, so no chat responses reach the UI until billing is resolved.

**Estimated Effort to Fix:**
- <30 minutes to add credits and verify streaming resumes.
- 1 hour to fix hydration warning.
- 1 hour to improve error messaging/telemetry.

**Total:** ~2-3 hours once billing is resolved.

---

## 🤝 Handoff Notes

If someone else continues this work:

1. **Start Here:** Verify OpenRouter credits and update the API key if needed.
2. **Check:** Run `pnpm dev` and confirm the chat streams once billing is active.
3. **Validate:** Exercise MCP tools (`listFileVariables`, `getDesignContext`) with a live Figma file.
4. **Adjust:** Resolve the hydration warning in `components/chat-header.tsx`.

**Key Files to Focus On:**
- `/app/(chat)/api/chat/route.ts` (tool registration, provider config)
- `/lib/ai/providers.ts` (OpenRouter client)
- `/lib/mcp/tools/` (MCP + aggregator tooling)
- `/components/message.tsx` (tool result rendering)

---

**Document Version:** 1.1
**Last Updated:** 2025-10-24
**Status:** 🟡 In Progress - Blocked by OpenRouter billing
