# Figma MCP Integration - Complete Guide

## 🎉 Overview

Your AI chatbot now uses **Figma Desktop's MCP (Model Context Protocol) server** instead of the Figma REST API to access design system information. This provides more powerful capabilities like code generation, screenshots, and Code Connect mappings.

## ✅ What Was Implemented

### 1. MCP Client Module (`/lib/mcp/`)

- **`client.ts`**: Singleton MCP client that manages connection to Figma Desktop
- **`tools/`**: 5 MCP tool wrappers for Vercel AI SDK
  - `get-design-context.ts` - Get UI code for components
  - `get-variable-defs.ts` - Get design tokens/variables
  - `get-metadata.ts` - Get file/page structure
  - `get-screenshot.ts` - Get component screenshots
  - `get-code-connect-map.ts` - Get code implementation mappings

### 2. Integration Points

- **Chat API Route** (`/app/(chat)/api/chat/route.ts`): Replaced old Figma REST API tools with 5 new MCP tools
- **System Prompts** (`/lib/ai/prompts.ts`): Updated to guide LLM on how to use MCP tools
- **Environment Variables** (`.env.local`): Added `FIGMA_MCP_SERVER_URL=http://127.0.0.1:3845/mcp`

### 3. Deprecated Files

Old Figma REST API tools are marked as deprecated but kept for reference:
- `/lib/ai/tools/query-figma-components.ts` - Deprecated
- `/lib/ai/tools/get-design-tokens.ts` - Deprecated

## 🔧 Configuration

### Environment Variables

Your `.env.local` now includes:

```bash
# Figma MCP Server URL - For local Figma Desktop MCP server
FIGMA_MCP_SERVER_URL=http://127.0.0.1:3845/mcp
```

### Prerequisites

1. **Figma Desktop** must be running
2. **MCP server** must be enabled in Figma Desktop
3. A **Figma file must be open** in Figma Desktop

## 📋 Available MCP Tools

### 1. `getMetadata`

**Purpose**: Get structural overview of Figma files

**When to use**:
- User asks about file/page structure
- Need to find node IDs for specific components
- Exploring what's in a Figma file

**Parameters**:
- `nodeId` (optional): Page ID like "0:1" or component node ID like "123:456"
- If not provided: Uses currently selected node in Figma Desktop

**Example Usage**:
```typescript
// User: "What components are in the Web Master file?"
await getMetadata({ nodeId: "0:1" }); // Page-level metadata
```

---

### 2. `getDesignContext`

**Purpose**: Get UI code and implementation details for components

**When to use**:
- User wants to see code for a component
- User asks "how is X implemented"
- Need detailed component information

**Parameters**:
- `nodeId` (optional): Component node ID like "123:456"
- `clientLanguages`: "react,typescript" (default)
- `clientFrameworks`: "react" (default)
- `forceCode`: Force code return even if large

**Example Usage**:
```typescript
// User: "Show me code for the Button/Primary component"
await getDesignContext({ nodeId: "456:789" });
```

---

### 3. `getVariableDefs`

**Purpose**: Get design token/variable definitions

**When to use**:
- User asks about colors, spacing, typography, etc.
- User wants design token values
- Need design system primitive values

**Parameters**:
- `nodeId` (optional): Node ID
- `clientLanguages`: "react,typescript" (default)
- `clientFrameworks`: "react" (default)

**Example Usage**:
```typescript
// User: "What's the primary color token?"
await getVariableDefs({ nodeId: "123:456" });
```

**Returns**:
```json
{
  "icon/default/secondary": "#949494",
  "spacing/2x": "16px",
  "font/heading/large": "32px"
}
```

---

### 4. `getScreenshot`

**Purpose**: Generate screenshots of components

**When to use**:
- User wants to see visual representation
- User asks "show me what X looks like"
- Need component images

**Parameters**:
- `nodeId` (optional): Component node ID
- `clientLanguages`: "react,typescript" (default)
- `clientFrameworks`: "react" (default)

---

### 5. `getCodeConnectMap`

**Purpose**: Find where components are used in the codebase

**When to use**:
- User asks "where is component X used in the code"
- Need to find code implementation location
- Looking for GitHub/codebase links

**Parameters**:
- `nodeId` (optional): Component node ID
- `clientLanguages`: "react,typescript" (default)
- `clientFrameworks`: "react" (default)

**Returns**:
```json
{
  "1:2": {
    "codeConnectSrc": "https://github.com/foo/components/Button.tsx",
    "codeConnectName": "Button"
  }
}
```

## 🔍 How to Use

### Getting Node IDs

**Method 1: From Figma URL**

Figma URLs contain node IDs:
```
https://figma.com/design/:fileKey/:fileName?node-id=1-2
                                                      ^^^^
                                                    Extract this!
```

The node ID is `1:2` (convert hyphens to colons).

**Method 2: Use `getMetadata`**

First call `getMetadata` to get an XML structure with all node IDs, then use those IDs in other tools.

**Method 3: Currently Selected Node**

If user has the right Figma file open and a component selected, tools will automatically use the selected node when `nodeId` is not provided.

### Workflow Examples

#### Example 1: "Where is Button/Primary used in the Web Master file?"

```typescript
// Step 1: Get file structure to find Button/Primary node ID
await getMetadata({ nodeId: "0:1" }); // Page-level

// Step 2: Parse XML to find node ID for "Button/Primary"
// Let's say we found nodeId: "456:789"

// Step 3: Get code implementation location
await getCodeConnectMap({ nodeId: "456:789" });
```

#### Example 2: "What's the value of the 2X border radius token?"

```typescript
// Option A: If user has tokens file open and selected
await getVariableDefs(); // No nodeId needed

// Option B: With specific node ID
await getVariableDefs({ nodeId: "123:456" });
```

#### Example 3: "Show me the code for the Web Navigation component"

```typescript
// Step 1: Find the component node ID
await getMetadata({ nodeId: "0:1" });

// Step 2: Get the code
await getDesignContext({ nodeId: "789:012" });
```

## 🚀 Running Locally

### Start the Chatbot

```bash
pnpm dev
```

The chatbot will be available at `http://localhost:3000`

### Requirements

1. **Figma Desktop running** with MCP server enabled
2. **Relevant Figma file open** in Figma Desktop
3. **Environment variables configured** in `.env.local`

### Testing MCP Connection

Run the discovery script:

```bash
npx tsx scripts/discover-mcp-tools.ts
```

Run the integration test:

```bash
npx tsx scripts/test-mcp-integration.ts
```

## ⚠️ Important Limitations

### 1. Local-Only (Currently)

- MCP server runs at `http://127.0.0.1:3845/mcp`
- **Only works locally** - won't work when deployed to Vercel
- **Future solution**: Set up remote MCP server or use tunneling

### 2. Requires Open File in Figma Desktop

- MCP tools work with the **currently open file** in Figma Desktop
- Users need to have the right file open
- Or provide Figma URLs with node IDs

### 3. Node ID-Based (Not Name-Based)

- Tools work with **node IDs**, not component names
- Can't directly search "find all Button components"
- Must use `getMetadata` first to find node IDs

### 4. No Cross-File Search

Unlike REST API which could search across multiple files, MCP works with one file at a time (the one open in Figma Desktop).

## 🔄 Comparison: MCP vs REST API

| Feature | Figma REST API | Figma MCP Server |
|---------|----------------|------------------|
| Search by component name | ✅ Yes | ❌ No (need node ID) |
| Search across multiple files | ✅ Yes | ❌ No (one file at a time) |
| Get design tokens | ✅ Yes | ✅ Yes |
| Get file structure | ✅ Yes | ✅ Yes |
| Generate code | ❌ No | ✅ Yes |
| Get screenshots | ✅ Yes (limited) | ✅ Yes (better) |
| Code Connect mappings | ❌ No | ✅ Yes |
| Works remotely | ✅ Yes | ❌ No (local only) |
| Requires Figma Desktop | ❌ No | ✅ Yes |

## 📚 File Structure

```
/lib/mcp/
├── client.ts                        # MCP client singleton
└── tools/
    ├── index.ts                     # Export all tools
    ├── get-design-context.ts        # UI code generation
    ├── get-variable-defs.ts         # Design tokens
    ├── get-metadata.ts              # File structure
    ├── get-screenshot.ts            # Screenshots
    └── get-code-connect-map.ts      # Code mappings

/scripts/
├── discover-mcp-tools.ts            # Discover available MCP tools
└── test-mcp-integration.ts          # Test MCP integration

/docs/
├── figma-mcp-tools.md               # Detailed tool documentation
└── MCP_INTEGRATION.md               # This file
```

## 🐛 Troubleshooting

### "Failed to connect to Figma Desktop MCP server"

**Solution**:
1. Make sure Figma Desktop is running
2. Check that MCP server is enabled in Figma Desktop preferences
3. Verify the server is running on `http://127.0.0.1:3845/mcp`

### "Nothing is selected"

**Solution**:
1. Open the relevant Figma file in Figma Desktop
2. Select a component/frame
3. OR provide a `nodeId` parameter explicitly

### Tools returning errors

**Solution**:
1. Ensure you have the correct Figma file open
2. Verify the node ID exists in the open file
3. Check Figma Desktop console for errors

### "SSE error: Non-200 status code"

**Solution**:
- This usually means the MCP server isn't properly initialized
- Restart Figma Desktop
- Check MCP server settings in Figma Desktop

## 🚀 Future Enhancements

### Option B: Hybrid Approach

Combine MCP + REST API:
- Use **REST API** for search/discovery (finding components by name)
- Use **MCP** for detailed queries (code, screenshots, Code Connect)

### Option C: Workarounds

- Accept Figma URLs from users (extract node IDs automatically)
- Guide users to open the right file in Figma Desktop
- Cache node ID mappings for common components

### Remote Deployment

To make this work on Vercel:
1. Set up a remote MCP server on a cloud VM
2. Or use tunneling services (ngrok, cloudflare tunnel)
3. Update `FIGMA_MCP_SERVER_URL` to point to remote server

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review `/docs/figma-mcp-tools.md` for detailed tool documentation
3. Run test scripts to verify connection
4. Check Figma Desktop and MCP server logs

## ✨ Summary

Your chatbot now uses Figma Desktop's MCP server for enhanced capabilities:

✅ **What's Working**:
- MCP client connection
- 5 MCP tools integrated
- Enhanced capabilities (code generation, Code Connect)
- Local development ready

⚠️ **Limitations**:
- Local-only (not deployed to Vercel yet)
- Requires Figma Desktop running
- Works with node IDs (not component names)
- One file at a time

🎯 **Next Steps**:
- Test with real user queries
- Consider hybrid approach (Option B)
- Plan for remote deployment
- Gather user feedback

Congratulations! Your AI chatbot is now powered by Figma MCP! 🎉
