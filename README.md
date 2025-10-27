<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Double Good Design System Chat</h1>
</a>

<p align="center">
    An AI-powered chatbot specialized in answering questions about the Double Good Design System, built with Next.js, the Vercel AI SDK, and Figma MCP integration.
</p>

<p align="center">
  <a href="SETUP.md"><strong>📖 Setup Guide</strong></a> ·
  <a href="docs/PROJECT_STATUS.md"><strong>📊 Project Status</strong></a>
</p>
<br/>

## 🎯 What This Does

This chatbot helps your team understand and use the Double Good Design System by:
- 🔍 Running MCP tool calls against the currently open Figma file (via Figma Desktop)
- 📐 Listing tokens, variables, and styles from Figma using the combined MCP + REST aggregator tool
- 🔗 Providing direct Figma links to components and variable collections
- 💬 Answering questions about component usage and specifications
- ⚡ Comparing native vs web implementations

### Example Queries:
- *"Show me all button components in the native design system"*
- *"What is the 2X border radius token value?"*
- *"How does the navbar component differ between web and native?"*

---

<p align="center">
  <a href="https://sdk.vercel.ai/"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Implementation Highlights

- **OpenRouter integration** with GPT-4o Mini across chat, reasoning, and title flows (see `lib/ai/providers.ts`, `lib/ai/models.ts`).
- **Figma MCP tooling** (`lib/mcp/tools/*`) plus the `listFileVariables` aggregator that blends MCP discovery with REST enrichment.
- **Chat pipeline updates** in `app/(chat)/api/chat/route.ts`, including guest entitlements and billing-aware error handling.
- **UI improvements** such as generic `tool-*` renderers in `components/message.tsx`.
- **Request timeout handling** (30s) prevents the chat UI from getting stuck when requests fail or hang.

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports OpenRouter-backed Anthropic models with streaming responses
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This chatbot uses [OpenRouter](https://openrouter.ai) to access multiple AI models:

- **GPT-4o Mini** – Main chat model (general responses and artifacts) with excellent function calling
- **GPT-4o Mini (reasoning wrapper)** – Same base model wrapped with the SDK's reasoning middleware for "think" tags
- **GPT-4o Mini** – Also reused for title and artifact generation to keep behavior consistent

### Figma Integration

The chatbot connects directly to your Figma files through the [Figma Desktop MCP server](https://modelcontextprotocol.io/) and an aggregate tool that can fall back to the REST API when the file ID is provided:
- Interactive MCP tools (`getDesignContext`, `getVariableDefs`, `getMetadata`, `getScreenshot`, `getCodeConnectMap`)
- `listFileVariables` aggregator combines MCP discovery with REST calls to enumerate tokens, variables, and components
- Optional Redis caching (if configured) keeps REST lookups within rate limits
- Direct Figma links are returned for fast navigation

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/templates/next.js/nextjs-ai-chatbot)

## Running Locally

### Prerequisites:
- OpenRouter API key **with active credits**
- Figma Desktop with MCP enabled (and access to the Double Good files)
- Figma Personal Access Token (only needed for REST aggregation)
- Figma file IDs (Native/Web components, master files, and tokens)
- Postgres database (local or Vercel)
- Redis (optional but recommended for caching REST results)

### Quick Setup:

Follow these steps to get running quickly:

1. **Configure environment variables** (create `.env.local`):
   ```bash
   # Authentication / secrets
   AUTH_SECRET=<generate_with_openssl>
   OPENROUTER_API_KEY=<your_openrouter_api_key>

   # Figma integration
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

2. **Setup database:**
   ```bash
   pnpm install
   pnpm db:migrate
   ```

3. **Run the app:**
   ```bash
   pnpm dev
   ```

4. **Ensure billing** – confirm the configured OpenRouter key has credits (test with `curl` as described in `SETUP.md`).
5. **Open** [localhost:3000](http://localhost:3000) and authenticate (guest or account).

For deeper setup details (database, MCP prerequisites, troubleshooting), see **[SETUP.md](SETUP.md)** and **[docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)**.
