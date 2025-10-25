# Figma MCP Tools & Aggregators

This note documents the Figma Desktop MCP tools we wrap inside the chatbot (running at `http://127.0.0.1:3845/mcp`). These wrappers convert MCP responses into the Vercel AI SDK `inputSchema` format and add a hybrid aggregator to fill coverage gaps that MCP alone cannot provide.

---

## Core MCP Tools

All core tools accept the same optional parameters:
- `nodeId?: string` — Figma node identifier (`123:456`). If omitted, the currently selected node in Figma Desktop is used.
- `clientLanguages?: string` — Comma-separated hints for code generation (defaults to `react,typescript`).
- `clientFrameworks?: string` — Comma-separated framework hints (defaults to `react`).
- `forceCode?: boolean` — Supported by `get_design_context` only; forces code output even when large.

| Tool | Purpose | Typical Usage |
| --- | --- | --- |
| `get_design_context` | Returns implementation details and generated UI code for a component node. | “Show the code for the primary button.” |
| `get_variable_defs` | Fetches design variables/tokens associated with a node or page. | “List the tokens applied to this component.” |
| `get_metadata` | Produces XML describing the current page/node hierarchy. | “What components exist in the Web Master file?” |
| `get_screenshot` | Captures a PNG screenshot of the node. | “Show me what the checkout header looks like.” |
| `get_code_connect_map` | Surfaces Code Connect mappings for the node. | “Where is this component implemented in code?” |

> 📌 **Node IDs**: Extract them from the Figma URL (`…?node-id=1-2` ⇒ `1:2`), from `get_metadata`, or by selecting the node directly in Figma Desktop before invoking the tool.

---

## Hybrid Aggregator (`list_file_variables`)

Location: `lib/mcp/tools/list-file-variables.ts`

The aggregator orchestrates both MCP and REST endpoints to generate richer listings when a `fileId` is available:

1. Calls `get_metadata` via MCP to understand the file structure and derive relevant node IDs.
2. Invokes MCP variable/details tools for context.
3. Supplements the result with REST calls (`getFileVariables`, `getFileComponents`, `getFileStyles`) to enumerate tokens, variables, and component summaries without requiring manual node selection.

**Inputs:**
- `fileId` (optional but recommended): Enables REST enrichment when provided.
- `pageNameFilter`, `includeComponents`, `includeVariables`, etc. — fine-grained filters (see source for complete schema).

**Outputs:**
- Structured JSON grouping variables, styles, and components by collection/page.
- Diagnostic metadata explaining which sources (MCP vs REST) contributed to the payload.

> ℹ️ When `fileId` is omitted, the tool still returns MCP-derived information but cannot fall back to REST enrichment.

---

## Operational Checklist

1. **Figma Desktop Running** – The relevant design file must be open when you call MCP tools; otherwise responses are empty.
2. **MCP Server Enabled** – Ensure the “Model Context Protocol” option is enabled inside Figma Desktop (Settings → Advanced).
3. **Node Selection** – For node-specific calls, select the layer in Figma or pass a `nodeId` explicitly.
4. **OpenRouter Credits** – The chatbot relies on OpenRouter; make sure the configured API key belongs to an account with available credits to avoid 402 errors.

---

## Example Flows

### A. “Where is Button/Primary used in the Web Master file?”
1. `get_metadata({ nodeId: "0:1" })` → Inspect XML and locate the `Button/Primary` node ID.
2. `get_code_connect_map({ nodeId: "456:789" })` → Returns Code Connect mappings.
3. (Optional) `get_design_context({ nodeId: "456:789" })` → Retrieves detailed implementation guidance.

### B. “List every token in the Product Tokens file.”
1. `list_file_variables({ fileId: FIGMA_PRODUCT_TOKENS_FILE_ID, includeVariables: true })` → Returns combined MCP + REST dataset.
2. If the file is not open locally, prompt the user to open it in Figma Desktop or retry once it is active.

### C. “Capture a screenshot of the native checkout header.”
1. `get_screenshot({ nodeId: "321:654" })` → Streams a base64 PNG for display inside the chat UI.

---

## Integration Notes

- MCP wrappers live in `lib/mcp/tools/` and are exported via `lib/mcp/tools/index.ts`.
- The chat API (`app/(chat)/api/chat/route.ts`) registers these tools and exposes them through the Vercel AI SDK.
- Prompt guidance in `lib/ai/prompts.ts` teaches the model when to call each tool (including the aggregator).
- `lib/mcp/utils.ts` contains helpers (`cloneMCPContent`, XML parsers) used by the wrappers to normalize responses before they reach the model.

For additional architecture context, refer to `SETUP.md` (environment setup) and `docs/PROJECT_STATUS.md` (current operational status).
