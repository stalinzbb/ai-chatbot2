# Project Status & Issues - AI Chatbot with Figma MCP Integration

**Date:** 2025-01-24
**Status:** 🟡 Partially Implemented - Critical Issues Remain

---

## 📋 Project Requirements

### Primary Goal
Build an AI chatbot that helps users query the Double Good Design System by accessing Figma design files through MCP (Model Context Protocol) instead of the Figma REST API.

### Key Requirements

#### 1. **Chatbot Functionality**
- **Local Deployment:** Run on `localhost:3000` using Next.js 15
- **LLM Provider:** OpenRouter API with GPT-4o-mini model
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

**`.env.local` Configuration:**
```bash
AUTH_SECRET=<your_auth_secret_here>
OPENROUTER_API_KEY=<your_openrouter_api_key>
OPENROUTER_SITE_URL=http://localhost:3000
FIGMA_ACCESS_TOKEN=<your_figma_token>
FIGMA_MCP_SERVER_URL=http://127.0.0.1:3845/mcp
POSTGRES_URL=<your_postgres_url>...
```

### 4. **Database Setup**
**Status:** ✅ Migrations Run

- PostgreSQL database initialized
- Drizzle ORM migrations completed
- Tables created: `User`, `Chat`, `Message_v2`, `Document`, `Vote_v2`

### 5. **Model Configuration**
**Status:** ✅ Fixed

- Updated UI to show "GPT-4o Mini" instead of "Claude 3.5 Sonnet"
- Configured OpenRouter provider correctly
- Model IDs properly mapped

### 6. **Testing Scripts**
**Status:** ✅ Created

**Scripts Created:**
- `/scripts/discover-mcp-tools.ts` - Discover MCP server tools
- `/scripts/test-mcp-integration.ts` - Test MCP connection and tools
- `/scripts/test-chat-api.ts` - Test chat API endpoint

---

## ❌ Critical Issues (Blocking)

### Issue 1: **Chat Streaming Broken**
**Severity:** 🔴 Critical
**Status:** Unresolved

**Symptoms:**
- User types message and sends
- Message shows "thinking..." indicator
- Response never appears
- Message vanishes
- Must reload page to try again

**Network Observation:**
```
GET /api/chat - Status: 200 ✅
Time: 1.66s
Response: Empty or not being consumed properly
```

**Terminal Error Log:**
```
[Error [AI_APICallError]: Provider returned error]
cause: undefined
url: 'https://openrouter.ai/api/v1/chat/completions'
statusCode: 400
responseBody: {
  "error": {
    "message": "Invalid schema for function 'getWeather':
                schema must be a JSON Schema of 'type: \"object\"',
                got 'type: \"None\"'.",
    "type": "invalid_request_error",
    "param": "tools[0].function.parameters",
    "code": "invalid_function_parameters"
  }
}
```

**Root Cause:**
OpenRouter/OpenAI is rejecting the tool schemas sent by the chatbot. Despite multiple fixes to `getWeather` and MCP tool schemas, the issue persists.

**Attempted Fixes:**
1. ✅ Fixed `getWeather` tool from `z.union()` to single `z.object()` with optional fields
2. ✅ Simplified all MCP tool descriptions (removed multi-line descriptions)
3. ✅ Added extensive logging to track API calls
4. ❌ Still failing with 400 error

**Possible Remaining Issues:**
- Tool schema serialization to JSON Schema may still be incorrect
- OpenRouter might be stricter than expected with schema validation
- There might be other tools with invalid schemas not yet identified
- The Vercel AI SDK might be generating incorrect OpenAI function schemas

---

### Issue 2: **React Hydration Error**
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
**Severity:** 🔴 Critical
**Status:** Partially Resolved

**Problem:**
OpenRouter expects strict OpenAI-compatible function schemas. The Vercel AI SDK's tool schema conversion may not be fully compatible.

**Schema Issues Found:**

1. **`getWeather` tool:**
   - Original: Used `z.union()` for multiple input types
   - Fix Applied: Changed to single `z.object()` with optional fields
   - Status: Fixed but still causing errors

2. **MCP Tools:**
   - Original: Empty `parameters: { properties: {}, additionalProperties: false }`
   - This appears in the logs as `"type: \"None\""`
   - Fix Attempted: Added proper parameters with optional fields
   - Status: Unknown if resolved

**Expected Schema Format (OpenAI):**
```json
{
  "type": "function",
  "function": {
    "name": "getWeather",
    "description": "Get weather at a location",
    "parameters": {
      "type": "object",
      "properties": {
        "city": {
          "type": "string",
          "description": "City name"
        }
      },
      "required": []
    }
  }
}
```

**What's Being Sent (Before Fix):**
```json
{
  "type": "function",
  "function": {
    "name": "getWeather",
    "parameters": {
      "anyOf": [...]  // ❌ Not supported
    }
  }
}
```

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
```bash
✅ curl -X POST https://openrouter.ai/api/v1/chat/completions
Result: API key valid, simple requests work
```

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
OpenRouter API (GPT-4o-mini)
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
❌ OpenRouter API (GPT-4o-mini)
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
LLM: Attempts to initialize with tools
    ↓
OpenRouter: Rejects request - Invalid tool schema
    ↓
Error Handler: Catches error
    ↓
UI: ❌ Shows "thinking..." forever
    ↓ Message disappears
    ↓ No error shown to user
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
/lib/mcp/tools/index.ts
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
  - Replaced Figma REST API tools with MCP tools
  - Added logging for debugging
  - Added better error handling

/lib/ai/providers.ts
  - Verified OpenRouter configuration

/lib/ai/models.ts
  - Changed model names from "Claude" to "GPT-4o Mini"

/lib/ai/prompts.ts
  - Updated system prompt with MCP tool guidance

/lib/ai/tools/get-weather.ts
  - Fixed schema from z.union() to z.object()

/lib/ai/tools/query-figma-components.ts
  - Added deprecation notice

/lib/ai/tools/get-design-tokens.ts
  - Added deprecation notice

/.env.local
  - Added OPENROUTER_SITE_URL
  - Added FIGMA_MCP_SERVER_URL

/package.json
  - No changes (dependencies already present)
```

---

## 🚀 Next Steps to Resolve Issues

### Priority 1: Fix Tool Schema Issue

**Option A: Debug Tool Schema Serialization**
1. Add logging to see exact JSON being sent to OpenRouter
2. Compare with OpenAI's expected function schema format
3. Check if Vercel AI SDK is converting Zod schemas correctly
4. Potentially file bug report with Vercel AI SDK

**Option B: Remove All Tools Temporarily**
1. Test chatbot with NO tools enabled
2. If it works, add tools back one by one
3. Identify which tool is causing the issue
4. Fix or remove problematic tool

**Option C: Switch to Simpler Tool Format**
1. Instead of using Vercel AI SDK's `tool()` function
2. Manually define OpenAI function schemas
3. Convert manually in the API route
4. More verbose but more control

### Priority 2: Fix Hydration Error

**Steps:**
1. Identify component causing mismatch (chat-header visibility selector)
2. Ensure consistent rendering between server/client
3. Use `useEffect` or `useState` for client-only logic
4. Add `suppressHydrationWarning` if necessary

### Priority 3: Improve Error Display

**Current Problem:** Errors not shown to user

**Fix:**
1. Ensure `onError` handler in `createUIMessageStream` returns visible error
2. Add UI toast/notification for API errors
3. Show error message in chat instead of message disappearing

---

## 🎓 Lessons Learned

### 1. **Tool Schema Compatibility is Critical**
- Different LLM providers have different schema requirements
- OpenRouter/OpenAI are strict about function schemas
- Vercel AI SDK's Zod → JSON Schema conversion may have limitations
- Always test with minimal schemas first

### 2. **MCP Integration Works**
- MCP client successfully connects to Figma Desktop
- Tools can be called and return data
- The issue is not with MCP itself, but with how tools are exposed to the LLM

### 3. **Debugging Streaming Responses is Hard**
- Streaming SSE responses don't show in browser network tab properly
- Need extensive server-side logging
- Client-side error handling needs improvement

### 4. **Environment Configuration Matters**
- Missing `OPENROUTER_SITE_URL` can cause issues
- Database must be migrated before testing
- MCP server must be running locally

---

## 📝 Recommendations

### Short Term (Fix Blocking Issues)

1. **Simplify Tool Schemas**
   - Remove all optional parameters
   - Use only required, simple types (string, number, boolean)
   - Test with single tool first

2. **Add Better Error Handling**
   - Show errors in UI instead of silent failures
   - Add error boundaries
   - Improve logging

3. **Test Without Tools**
   - Verify basic chat works without any tools
   - Then add tools incrementally

### Medium Term (Once Working)

1. **Improve MCP Integration**
   - Add better caching for MCP responses
   - Handle Figma Desktop not running gracefully
   - Guide users to open correct Figma files

2. **Better User Experience**
   - Show loading states for tool calls
   - Display which tools are being used
   - Show Figma file context in UI

3. **Testing & Monitoring**
   - Add unit tests for tool schemas
   - Add integration tests for MCP calls
   - Monitor OpenRouter API usage

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

**Temporary Fix:** Remove all tools and test basic chat

```typescript
// In /app/(chat)/api/chat/route.ts
experimental_activeTools: [],  // Empty array
tools: {},                      // Empty object
```

This should allow basic chat to work without tool calling.

### If MCP Tools Fail

**Fallback:** Use old Figma REST API tools temporarily

```typescript
// In /app/(chat)/api/chat/route.ts
import { queryFigmaComponents } from "@/lib/ai/tools/query-figma-components";
import { getDesignTokensTool } from "@/lib/ai/tools/get-design-tokens";

experimental_activeTools: [
  "queryFigmaComponents",
  "getDesignTokensTool",
],
tools: {
  queryFigmaComponents,
  getDesignTokensTool,
},
```

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
- ❌ Chat streaming responses (critical)
- ❌ Tool schema validation by OpenRouter
- ⚠️ React hydration mismatch (non-critical)

**Blocker:**
The chatbot cannot respond to any messages due to OpenRouter rejecting the tool schemas. Until this is resolved, the chatbot is non-functional despite all infrastructure being in place.

**Estimated Effort to Fix:**
- 2-4 hours to debug and fix tool schema issue
- 1 hour to fix hydration error
- 1 hour to improve error handling

**Total:** ~4-6 hours of focused debugging and fixes needed.

---

## 🤝 Handoff Notes

If someone else continues this work:

1. **Start Here:** Test with NO tools enabled first
2. **Check:** Look at the exact JSON being sent to OpenRouter
3. **Reference:** Compare with OpenAI function calling examples
4. **Test:** Add one tool at a time to isolate the problematic schema
5. **Consider:** May need to manually define schemas instead of using Vercel AI SDK's auto-conversion

**Key Files to Focus On:**
- `/app/(chat)/api/chat/route.ts` (main chat endpoint)
- `/lib/ai/tools/get-weather.ts` (problematic tool)
- `/lib/mcp/tools/*.ts` (all MCP tool schemas)
- Browser Network tab + Terminal logs for debugging

---

**Document Version:** 1.0
**Last Updated:** 2025-01-24
**Status:** 🟡 In Progress - Blocked by Tool Schema Issue
