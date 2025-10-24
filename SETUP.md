# Double Good Design System Chat — Setup Guide

This chatbot answers Double Good design-system questions by combining the Vercel AI SDK, OpenRouter, and the Figma Desktop MCP server.

## Prerequisites

1. **OpenRouter account with active credits** – requests fail with `402 Insufficient credits` if the balance is empty.
2. **Figma Desktop** with MCP enabled (`http://127.0.0.1:3845/mcp`) and the relevant files open.
3. **Figma personal access token** – required when the REST fallback is used.
4. **PostgreSQL database** – local instance, Neon, or Vercel Postgres.
5. **Redis** *(optional)* – caches REST responses for the aggregator tool.
6. **Node.js 20+** and **pnpm 9+**.

## Step-by-Step Setup

### 1. Prepare OpenRouter

1. Sign in at [openrouter.ai](https://openrouter.ai).
2. Create an API key dedicated to this project.
3. Confirm the key belongs to an account or organisation with credits.
4. Store the key securely (do not commit it).

> 💡 Claude 3.5 Sonnet currently costs roughly $3 / million input tokens and $15 / million output tokens (check OpenRouter for the latest pricing).

### 2. Generate a Figma Personal Access Token

1. Visit [figma.com/settings](https://www.figma.com/settings).
2. Under **Personal access tokens**, generate a token.
3. Copy it immediately—Figma will not display it again.

### 3. Collect Figma File IDs

Pull the `FILE_ID` segment from each design file URL (`https://www.figma.com/file/FILE_ID/...`). Required files:
- Native Components
- Web Components
- Native Master
- Web Master
- Product Tokens
- Brand Tokens

### 4. Create `.env.local`

Add an `.env.local` file (ignored by git) with placeholders until you can populate the real secrets:

```bash
# Authentication
AUTH_SECRET=<generate_with_openssl>
OPENROUTER_API_KEY=<your_openrouter_api_key>

# Figma configuration
FIGMA_MCP_SERVER_URL=http://127.0.0.1:3845/mcp
FIGMA_ACCESS_TOKEN=<your_figma_pat>
FIGMA_NATIVE_COMPONENTS_FILE_ID=<figma_file_id>
FIGMA_WEB_COMPONENTS_FILE_ID=<figma_file_id>
FIGMA_NATIVE_MASTER_FILE_ID=<figma_file_id>
FIGMA_WEB_MASTER_FILE_ID=<figma_file_id>
FIGMA_PRODUCT_TOKENS_FILE_ID=<figma_file_id>
FIGMA_BRAND_TOKENS_FILE_ID=<figma_file_id>

# Database / caching
POSTGRES_URL=<postgres_connection_string>
REDIS_URL=<optional_redis_connection>
```

> ⚠️ Treat all secrets as sensitive. Keep them in a password manager or environment manager—never commit them to the repository.

### 5. Install Dependencies & Migrate the Database

```bash
pnpm install
pnpm db:migrate
# Optional: inspect the schema with Drizzle Studio
pnpm db:studio
```

### 6. Launch the App Locally

```bash
pnpm dev
```

- The dev server runs on the first available port (default `3000`).
- Authenticate via the UI or hit `/api/auth/guest` to seed a guest session.
- Ensure Figma Desktop is running with the appropriate file open before issuing MCP tool calls.

### 7. Verify OpenRouter Access

Before using the UI, confirm the key works:

```bash
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"anthropic/claude-3.5-sonnet","messages":[{"role":"user","content":"ping"}]}'
```

If you receive `402 Insufficient credits`, top up the account and retry.

## Architecture Overview

### Model Configuration

All chat roles reuse **Claude 3.5 Sonnet** via OpenRouter:
- `chat-model` – standard chat sessions.
- `chat-model-reasoning` – the same model wrapped with the SDK’s reasoning middleware (emits `<think>` tags).
- `title-model` and `artifact-model` – reuse Sonnet for consistent summaries and artifacts.

### Tooling

Primary MCP tools live in `/lib/mcp/tools/`:
- `getDesignContext` – implementation snippets for the selected node.
- `getVariableDefs` – variable definitions tied to the node.
- `getMetadata` – hierarchical file overview to discover node IDs.
- `getScreenshot` – captures a snapshot of the current node.
- `getCodeConnectMap` – locates Code Connect mappings.
- `listFileVariables` – aggregates MCP discovery with Figma REST calls (when a `fileId` is provided) to enumerate tokens, variables, and components without manual selection.

Legacy REST helpers (`queryFigmaComponents`, `getDesignTokensTool`) remain for reference but are deprecated.

### Caching Strategy

- Redis (or Vercel KV) is optional but recommended when using `listFileVariables`, reducing repeated REST calls.
- MCP calls always run through the local Figma Desktop session and are not cached by the app.

## Troubleshooting

### "FIGMA_ACCESS_TOKEN is not configured"
- Confirm `.env.local` exists.
- Ensure the token starts with `figd_` and restart the dev server after editing.

### "No components found"
- Verify the correct Figma file is open in Figma Desktop before the MCP call.
- Double-check file IDs and personal access token scopes.
- Use `listFileVariables` with a `fileId` if you need a complete listing without manual selection.

### OpenRouter errors / "We’re having trouble sending your message"
- Most often caused by `402 Insufficient credits` – add credits or switch to test mode.
- Verify the API key is still valid and regenerate if necessary.
- Check the OpenRouter dashboard for additional error details.

## Deployment to Vercel

1. Push your code to GitHub.
2. Connect the repository to Vercel (or your hosting provider of choice).
3. Configure **all** environment variables in the hosting dashboard.
4. Ensure the production OpenRouter key has credits and your domain is whitelisted in the OpenRouter settings.

For production deployments also consider:
- Managed Postgres (Vercel Postgres, Neon, etc.).
- Managed Redis (Vercel KV, Upstash) for REST caching.
- Mapping a remote MCP server or alternative fallback if Figma Desktop cannot run alongside the deployment.

## Cost Optimization Tips

1. Add Redis caching to avoid repeated REST requests when enumerating tokens/components.
2. Monitor OpenRouter usage and configure alerts for low balances.
3. Trim tool outputs before sending them back through the LLM to reduce token usage.
4. Consider downgrading specific flows (e.g., title generation) to a cheaper model if consistent behaviour is not required.

## Next Steps

Once running, consider:
- [ ] Adding semantic search or vector recall for node discovery.
- [ ] Implementing automated sanity checks that verify Figma MCP availability.
- [ ] Expanding MCP tooling (e.g., view diffs between nodes, export assets).
- [ ] Wiring up analytics to identify the most common questions.

## Support

For issues:
1. Check the browser console for errors
2. Check the terminal/server logs
3. Review Figma API logs
4. Check OpenRouter dashboard for API errors

Need help? Review the code in:
- `lib/mcp/` – MCP client and tooling wrappers.
- `lib/ai/providers.ts` – Model configuration and OpenRouter bindings.
- `lib/ai/prompts.ts` – Prompt templates and tool guidance.
- `lib/ai/tools/` – Legacy REST helpers kept for reference.
