# Quick Start Guide - Design System Chatbot

## 🚀 Get Started in 5 Minutes

### Step 1: Get Your API Keys (5 min)

**OpenRouter (for LLMs):**
1. Visit https://openrouter.ai/keys
2. Create account if needed
3. Generate API key
4. Copy it (starts with `sk-or-v1-`)

**Figma (for design files):**
1. Visit https://www.figma.com/settings
2. Scroll to "Personal Access Tokens"
3. Generate new token
4. Copy it (starts with `figd_`)

### Step 2: Get Figma File IDs (2 min)

For each Figma file, copy the ID from the URL:
```
https://www.figma.com/file/ABC123DEF456/File-Name
                              ^^^^^^^^^^^^
                              This is the file ID
```

You need IDs for these 6 files:
- [ ] Native Components
- [ ] Web Components
- [ ] Native Master
- [ ] Web Master
- [ ] Product Tokens
- [ ] Brand Tokens

### Step 3: Configure Environment (2 min)

Edit `.env.local` file and replace the values:

```bash
# Generate with: openssl rand -base64 32
AUTH_SECRET=paste-generated-secret-here

# From OpenRouter
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# From Figma
FIGMA_ACCESS_TOKEN=figd_your-token-here

# Your 6 Figma file IDs
FIGMA_NATIVE_COMPONENTS_FILE_ID=paste-file-id-here
FIGMA_WEB_COMPONENTS_FILE_ID=paste-file-id-here
FIGMA_NATIVE_MASTER_FILE_ID=paste-file-id-here
FIGMA_WEB_MASTER_FILE_ID=paste-file-id-here
FIGMA_PRODUCT_TOKENS_FILE_ID=paste-file-id-here
FIGMA_BRAND_TOKENS_FILE_ID=paste-file-id-here

# Database (use Vercel Postgres or local)
POSTGRES_URL=your-database-url-here
```

### Step 4: Setup Database (1 min)

```bash
pnpm install
pnpm db:migrate
```

### Step 5: Run It! (30 seconds)

```bash
pnpm dev
```

Open http://localhost:3000

### Step 6: Test It (1 min)

1. Register an account
2. Start a new chat
3. Try these queries:

```
"Show me button components in the native design system"
"What is the 2X border radius token?"
"Compare web and native navbar components"
```

## ✅ Success Checklist

- [ ] OpenRouter API key added
- [ ] Figma access token added
- [ ] All 6 Figma file IDs configured
- [ ] Database set up and migrated
- [ ] App runs without errors
- [ ] Can register/login
- [ ] Chatbot responds to component queries
- [ ] Chatbot responds to token queries
- [ ] Figma links work

## 🎯 Example Queries

**Components:**
- "What button components do we have?"
- "Show me all native navigation components"
- "List web form components"

**Tokens:**
- "What's our spacing scale?"
- "Show me color tokens"
- "What border radius values are available?"

**Comparisons:**
- "How does the button differ between web and native?"
- "Compare list item components"

## 🔧 Optional: Add Redis Caching

Significantly improves performance!

**Vercel KV (recommended for production):**
1. Go to Vercel dashboard
2. Add KV store to your project
3. Copy the REDIS_URL
4. Add to `.env.local`

**Upstash (alternative):**
1. Visit https://upstash.com
2. Create Redis database
3. Copy connection URL
4. Add to `.env.local` as `REDIS_URL`

## 🐛 Troubleshooting

**"FIGMA_ACCESS_TOKEN is not configured"**
- Check `.env.local` file exists in root
- Verify token starts with `figd_`
- Restart dev server: stop with Ctrl+C, then `pnpm dev`

**"No components found"**
- Verify Figma file IDs are correct
- Check your token has access to those files
- Try different search terms

**"Rate limit exceeded"**
- Setup Redis caching (see above)
- Wait a few minutes
- Check Figma API limits

**OpenRouter errors**
- Verify API key is active
- Check you have credits in account
- Visit OpenRouter dashboard for details

## 📚 More Help

- **Full Setup:** See `SETUP.md`
- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`
- **Code Structure:** Browse `lib/figma/` and `lib/ai/tools/`

## 💰 Cost Estimate

Very affordable for internal use:
- ~$0.20 - $0.60 per 1000 messages
- First $1 covers ~2000-5000 messages
- Can set spending limits in OpenRouter

## 🎉 You're All Set!

Your Design System chatbot is now ready to help your team understand and use the Double Good Design System!
