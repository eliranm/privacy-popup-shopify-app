#!/bin/bash

# Privacy Popup Shopify App - Vercel Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Privacy Popup - Vercel Deployment Setup${NC}"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Check if Vercel CLI is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ Error: npx not found. Please install Node.js.${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Checking Vercel authentication...${NC}"

# Check if already logged in to Vercel
if npx vercel whoami &> /dev/null; then
    VERCEL_USER=$(npx vercel whoami)
    echo -e "${GREEN}✓ Already logged in as: $VERCEL_USER${NC}"
else
    echo -e "${YELLOW}⚠️  Not logged in to Vercel. Please authenticate:${NC}"
    echo "Run: npx vercel login"
    echo "Then run this script again."
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Building the application...${NC}"

# Install dependencies
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Build the application
echo "Building Next.js application..."
npm run build

echo -e "${GREEN}✓ Build completed successfully${NC}"
echo ""

echo -e "${BLUE}Step 3: Deploying to Vercel...${NC}"

# Deploy to Vercel
echo "Deploying to production..."
DEPLOYMENT_URL=$(npx vercel --prod --yes)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment successful!${NC}"
    echo -e "${GREEN}🌐 Your app is live at: $DEPLOYMENT_URL${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 4: Post-deployment setup${NC}"

# Get project info
PROJECT_NAME=$(npx vercel inspect $DEPLOYMENT_URL --scope team 2>/dev/null | grep "name" | head -1 | cut -d'"' -f4 || echo "privacy-popup-shopify-app")

echo -e "${YELLOW}📋 Next Steps (Manual Configuration Required):${NC}"
echo ""
echo "1. 🗄️  Set up Database:"
echo "   • Go to: https://vercel.com/dashboard"
echo "   • Select project: $PROJECT_NAME"
echo "   • Go to Storage → Create Database → PostgreSQL"
echo "   • Name: privacy-popup-db"
echo ""

echo "2. 🔐 Configure Environment Variables:"
echo "   • Go to: https://vercel.com/dashboard"
echo "   • Select project: $PROJECT_NAME"
echo "   • Go to Settings → Environment Variables"
echo "   • Add these variables for Production, Preview, Development:"
echo ""
echo "   SHOPIFY_API_KEY=your_api_key_here"
echo "   SHOPIFY_API_SECRET=your_api_secret_here"
echo "   SCOPES=write_themes,read_themes,write_own_subscription_contracts"
echo "   SHOPIFY_APP_URL=$DEPLOYMENT_URL"
echo "   DATABASE_URL=postgresql://username:password@host:port/database"
echo "   ENCRYPTION_KEY=your_32_character_encryption_key_here"
echo "   WEBHOOK_SECRET=your_webhook_secret_here"
echo "   CRON_SECRET=your_cron_secret_here"
echo "   NODE_ENV=production"
echo ""

echo "3. 🏪 Update Shopify Partner App:"
echo "   • App URL: $DEPLOYMENT_URL"
echo "   • Redirect URLs:"
echo "     - $DEPLOYMENT_URL/api/auth"
echo "     - $DEPLOYMENT_URL/api/auth/callback"
echo "   • Webhooks:"
echo "     - $DEPLOYMENT_URL/api/webhooks/app/uninstalled"
echo "     - $DEPLOYMENT_URL/api/webhooks/shop/update"
echo "     - $DEPLOYMENT_URL/api/webhooks/themes/publish"
echo "     - $DEPLOYMENT_URL/api/webhooks/app_subscriptions/update"
echo ""

echo "4. 🗄️  Run Database Migrations:"
echo "   After setting up DATABASE_URL, run:"
echo "   npx prisma db push"
echo "   npx prisma db seed"
echo ""

echo "5. 🧪 Test Your Deployment:"
echo "   • Health check: $DEPLOYMENT_URL/health"
echo "   • Install on dev store from Shopify Partner dashboard"
echo ""

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📚 Additional Resources:${NC}"
echo "• Vercel Dashboard: https://vercel.com/dashboard"
echo "• Shopify Partner Dashboard: https://partners.shopify.com/"
echo "• Documentation: Check README.md for detailed setup"
echo ""

# Create environment template for easy copying
cat > .env.production.example << EOF
# Copy these to Vercel Environment Variables
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SCOPES=write_themes,read_themes,write_own_subscription_contracts
SHOPIFY_APP_URL=$DEPLOYMENT_URL
DATABASE_URL=postgresql://username:password@host:port/database
ENCRYPTION_KEY=your_32_character_encryption_key_here
WEBHOOK_SECRET=your_webhook_secret_here
CRON_SECRET=your_cron_secret_here
NODE_ENV=production
EOF

echo -e "${GREEN}✓ Created .env.production.example with your deployment URL${NC}"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "1. Set up environment variables in Vercel dashboard"
echo "2. Configure your Shopify Partner app with the new URLs"
echo "3. Set up the database and run migrations"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
