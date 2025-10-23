<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Double Good Design System Chat</h1>
</a>

<p align="center">
    An AI-powered chatbot specialized in answering questions about the Double Good Design System, built with Next.js, AI SDK, and Figma API integration.
</p>

<p align="center">
  <a href="QUICK_START.md"><strong>🚀 Quick Start</strong></a> ·
  <a href="SETUP.md"><strong>📖 Setup Guide</strong></a> ·
  <a href="IMPLEMENTATION_SUMMARY.md"><strong>📋 Implementation Details</strong></a>
</p>
<br/>

## 🎯 What This Does

This chatbot helps your team understand and use the Double Good Design System by:
- 🔍 Searching through Figma components (Native & Web)
- 📐 Looking up design tokens (colors, spacing, typography, etc.)
- 🔗 Providing direct Figma links to components
- 💬 Answering questions about component usage and specifications
- ⚡ Comparing native vs web implementations

### Example Queries:
- *"Show me all button components in the native design system"*
- *"What is the 2X border radius token value?"*
- *"How does the navbar component differ between web and native?"*

---

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://ai-sdk.dev/docs/introduction)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
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

- **Claude 3.5 Sonnet** - Main chat model (excellent for Design System understanding)
- **Claude 3 Opus** - Reasoning model (for complex architectural questions)
- **GPT-4o-mini** - Title generation (cost-effective)

### Figma Integration

The chatbot connects directly to your Figma files via the [Figma REST API](https://www.figma.com/developers/api):
- Searches components across 6 design system files
- Retrieves design tokens and variables
- Caches responses with Redis for performance
- Returns direct Figma links for easy navigation

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/templates/next.js/nextjs-ai-chatbot)

## Running Locally

### Prerequisites:
- OpenRouter API key
- Figma Personal Access Token
- 6 Figma file IDs (Native/Web Components, Masters, and Token files)
- Postgres database (local or Vercel)
- Redis (optional but recommended)

### Quick Setup:

See **[QUICK_START.md](QUICK_START.md)** for a step-by-step guide (5 minutes)

Or follow these steps:

1. **Configure environment variables** (edit `.env.local`):
   ```bash
   OPENROUTER_API_KEY=your-key-here
   FIGMA_ACCESS_TOKEN=your-token-here
   FIGMA_NATIVE_COMPONENTS_FILE_ID=file-id
   FIGMA_WEB_COMPONENTS_FILE_ID=file-id
   # ... (see .env.local for all variables)
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

4. **Open** [localhost:3000](http://localhost:3000)

For detailed setup instructions, see **[SETUP.md](SETUP.md)**
