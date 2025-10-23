# Double Good Design System Chat - Setup Guide

This chatbot is configured to support the Double Good Design System by answering questions about components, design tokens, and implementation details from your Figma files.

## Prerequisites

1. **OpenRouter Account** - For LLM access
2. **Figma Account** - With access to Double Good Design System files
3. **Database** - Postgres (Vercel Postgres or local)
4. **Redis** (Optional but recommended) - For caching Figma API responses

## Step-by-Step Setup

### 1. Get OpenRouter API Key

1. Go to [https://openrouter.ai](https://openrouter.ai)
2. Sign up or log in
3. Navigate to "Keys" section
4. Create a new API key
5. Copy the key for later use

**Cost Estimates:**
- Claude 3.5 Sonnet: ~$3 per million input tokens, ~$15 per million output tokens
- GPT-4o-mini (for titles): ~$0.15 per million input tokens

### 2. Get Figma Personal Access Token

1. Go to [https://www.figma.com/settings](https://www.figma.com/settings)
2. Scroll to "Personal Access Tokens"
3. Click "Generate new token"
4. Name it (e.g., "Design System Chat")
5. Copy the token immediately (you won't see it again!)

### 3. Get Figma File IDs

For each of your 6 Figma files, get the file ID from the URL:

```
https://www.figma.com/file/FILE_ID_HERE/file-name
                              ^^^^^^^^^^^
                              This is the file ID
```

You need IDs for:
- ✅ Native Components
- ✅ Web Components
- ✅ Native Master
- ✅ Web Master
- ✅ Product Tokens
- ✅ Brand Tokens

### 4. Configure Environment Variables

Copy `.env.local` and fill in your actual values:

```bash
# Required: Generate with `openssl rand -base64 32`
AUTH_SECRET=your-generated-secret-here

# Required: OpenRouter API Key
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Required: Figma Personal Access Token
FIGMA_ACCESS_TOKEN=figd_xxxxx

# Required: Figma File IDs
FIGMA_NATIVE_COMPONENTS_FILE_ID=abc123...
FIGMA_WEB_COMPONENTS_FILE_ID=def456...
FIGMA_NATIVE_MASTER_FILE_ID=ghi789...
FIGMA_WEB_MASTER_FILE_ID=jkl012...
FIGMA_PRODUCT_TOKENS_FILE_ID=mno345...
FIGMA_BRAND_TOKENS_FILE_ID=pqr678...

# Required: Database
POSTGRES_URL=postgres://postgres.qbwqsyfohqkpfggvxzno:0Nn2oy1oVFmDikOV@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x

# Optional but recommended: For caching Figma responses
REDIS_URL=redis://default:password@host:6379

# Optional: Vercel Blob for file storage
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
```

### 5. Set Up Database

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Optional: Open database studio to verify
pnpm db:studio
```

### 6. Run the Application

```bash
# Development mode
pnpm dev

# The app will be available at http://localhost:3000
```

### 7. Test the Integration

Try these example queries in the chat:

1. **Component Query:**
   ```
   "Show me all button components in the native design system"
   ```

2. **Token Query:**
   ```
   "What is the border radius for 2X spacing?"
   ```

3. **Platform Comparison:**
   ```
   "Compare the navbar component between native and web"
   ```

## Architecture Overview

### Model Configuration

The chatbot uses OpenRouter to access:
- **Claude 3.5 Sonnet** - Main chat model (best for Design System understanding)
- **Claude 3 Opus** - Reasoning model (for complex queries)
- **GPT-4o-mini** - Title generation (cost-effective)

### Custom Tools

Two specialized AI tools access your Figma files:

1. **queryFigmaComponents** - Searches for UI components
   - Supports platform filtering (native/web/both)
   - Returns component details with Figma links
   - Cached for performance

2. **getDesignTokensTool** - Retrieves design tokens
   - Searches colors, spacing, typography, borders, shadows
   - Returns token values and definitions
   - Cached for performance

### Caching Strategy

- **Redis caching** (if configured): 1 hour TTL
- **No Redis**: Direct API calls (slower, may hit rate limits)

## Troubleshooting

### "FIGMA_ACCESS_TOKEN is not configured"
- Check that your `.env.local` file exists
- Verify the token is correctly copied (starts with `figd_`)
- Restart the dev server after adding variables

### "No components found"
- Verify Figma file IDs are correct
- Check that your Figma token has access to these files
- Try searching with different keywords

### "Rate limit exceeded"
- Figma API has rate limits (check their docs)
- Set up Redis for caching to reduce API calls
- Wait a few minutes before retrying

### OpenRouter errors
- Verify your API key is active
- Check you have credits/payment method set up
- Review OpenRouter dashboard for usage/errors

## Deployment to Vercel

1. Push your code to GitHub
2. Connect to Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy!

For production, consider:
- Setting up Vercel Postgres
- Setting up Vercel KV (Redis)
- Adding OpenRouter site URL in headers

## Cost Optimization Tips

1. **Use Redis caching** - Dramatically reduces Figma API calls
2. **Monitor OpenRouter usage** - Set up usage alerts
3. **Consider cheaper models** - For simple queries, you could use GPT-4o-mini
4. **Limit context** - The tools return only relevant data to reduce token usage

## Next Steps

Once running, consider:
- [ ] Adding more specialized tools (e.g., component comparison)
- [ ] Implementing semantic search for better component discovery
- [ ] Adding screenshot capabilities for visual component references
- [ ] Creating custom UI for component previews
- [ ] Adding analytics to track common queries

## Support

For issues:
1. Check the browser console for errors
2. Check the terminal/server logs
3. Review Figma API logs
4. Check OpenRouter dashboard for API errors

Need help? Review the code in:
- `lib/figma/` - Figma integration
- `lib/ai/tools/` - AI tool definitions
- `lib/ai/providers.ts` - Model configuration
- `lib/ai/prompts.ts` - System prompts
