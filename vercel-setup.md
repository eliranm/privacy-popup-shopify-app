# 🚀 Vercel Deployment Setup Guide

## Step 1: Authentication

Run this command and follow the prompts:

```bash
npx vercel login
```

This will:
1. Open your browser to authenticate with Vercel
2. Ask you to confirm the login in terminal
3. Store your authentication token locally

## Step 2: Deploy Your App

Once authenticated, deploy your app:

```bash
npx vercel --prod
```

This will:
1. Analyze your project and detect it's a Next.js app
2. Ask for project settings (use the defaults)
3. Deploy to production
4. Give you a live URL

## Step 3: Environment Variables

After deployment, you need to configure environment variables in the Vercel dashboard:

### Required Environment Variables:

```env
# Shopify App Configuration
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SCOPES=write_themes,read_themes,write_own_subscription_contracts
SHOPIFY_APP_URL=https://your-app.vercel.app

# Database (Vercel Postgres)
DATABASE_URL=postgresql://username:password@host:port/database

# Security
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Webhooks
WEBHOOK_SECRET=your_webhook_secret_here
CRON_SECRET=your_cron_secret_here

# Node Environment
NODE_ENV=production
```

### How to Add Environment Variables:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `privacy-popup-shopify-app`
3. Go to Settings → Environment Variables
4. Add each variable for Production, Preview, and Development

## Step 4: Database Setup (Vercel Postgres)

### Option A: Vercel Postgres (Recommended)

1. In your Vercel project dashboard
2. Go to Storage → Create Database
3. Select PostgreSQL
4. Name it `privacy-popup-db`
5. Copy the connection string to `DATABASE_URL`

### Option B: External Database

Use any PostgreSQL provider:
- Railway
- PlanetScale
- Supabase
- AWS RDS
- Google Cloud SQL

## Step 5: Run Database Migrations

After setting up the database, run migrations:

```bash
# Install dependencies locally
npm install

# Generate Prisma client
npx prisma generate

# Push schema to production database
npx prisma db push

# Optional: Seed the database
npx prisma db seed
```

## Step 6: Configure Shopify App

Update your Shopify Partner app settings:

1. **App URL**: `https://your-app.vercel.app`
2. **Allowed redirection URLs**:
   - `https://your-app.vercel.app/api/auth`
   - `https://your-app.vercel.app/api/auth/callback`
3. **Webhook endpoints**:
   - `https://your-app.vercel.app/api/webhooks/app/uninstalled`
   - `https://your-app.vercel.app/api/webhooks/shop/update`
   - `https://your-app.vercel.app/api/webhooks/themes/publish`
   - `https://your-app.vercel.app/api/webhooks/app_subscriptions/update`

## Step 7: Test Your Deployment

1. **Health Check**: Visit `https://your-app.vercel.app/health`
2. **Install App**: Visit your Shopify Partner dashboard and install on a dev store
3. **Test Features**:
   - Authentication flow
   - Settings page
   - Billing subscription
   - Theme extension

## Automated Deployment Commands

I'll create a script to automate most of this:
