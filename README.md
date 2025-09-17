# Privacy Popup - Shopify App

A production-ready Shopify app that adds customizable privacy popups to storefronts with advanced styling options, subscription billing, and comprehensive admin interface.

## 🚀 Features

### Core Features
- **Theme App Extension**: App Embed Block for easy theme integration
- **Customizable Popup**: Message, position, styling, and behavior options
- **Subscription Billing**: Shopify Billing API integration with trial periods
- **Admin Dashboard**: Polaris-based UI with real-time status monitoring
- **Webhook Handling**: App lifecycle and billing event management
- **Audit Logging**: Complete activity tracking and monitoring

### Technical Features
- **Next.js 14+** with App Router
- **TypeScript** with strict mode
- **Shopify Polaris 13+** UI components
- **Prisma** ORM with PostgreSQL
- **Comprehensive Testing** (Unit + E2E)
- **CI/CD Pipeline** with GitHub Actions
- **Vercel Deployment** with edge optimization
- **Accessibility Compliant** (WCAG 2.1 AA)

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database
- Shopify Partner account
- Vercel account (for deployment)

## 🛠️ Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd privacy-popup
npm install
```

### 2. Environment Variables

Copy the environment template:

```bash
cp env.example .env.local
```

Configure your environment variables:

```env
# Shopify App Configuration
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SCOPES=write_themes,read_themes,write_own_subscription_contracts
SHOPIFY_APP_URL=https://your-app.ngrok.io

# Development Store
DEV_STORE_URL=https://your-dev-store.myshopify.com

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/privacy_popup_dev

# Security
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Webhooks
WEBHOOK_SECRET=your_webhook_secret_here
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database (optional)
npm run db:seed
```

### 4. Start Development Server

```bash
# Start with Shopify CLI
npm run dev

# Or start Next.js directly
npm run build && npm start
```

## 🏪 Shopify Partner Setup

### 1. Create Shopify App

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Create new app → Custom app
3. Set app URL to your ngrok/development URL
4. Configure OAuth redirect URLs:
   - `https://your-app.ngrok.io/api/auth`
   - `https://your-app.ngrok.io/api/auth/callback`

### 2. Configure App Settings

- **App setup**: Add required scopes
- **App distribution**: Set to public when ready
- **Webhooks**: Configure mandatory webhooks
- **Billing**: Set up subscription plans

### 3. Install on Development Store

```bash
# Use Shopify CLI to install
shopify app install --store=your-dev-store.myshopify.com
```

## 🎨 Theme Integration

### Enable App Embed

1. Go to your store's theme editor
2. Navigate to "App embeds" in the sidebar
3. Find "Privacy Popup" and toggle it on
4. Customize settings as needed
5. Save changes

### Theme Settings

The app embed provides these customization options:

- **Message**: Privacy notice text
- **Link URL**: Privacy policy page URL
- **Position**: top, bottom, left, right
- **Styling**: Colors, dimensions, padding
- **Behavior**: Dismissible, z-index

## 💳 Billing Integration

### Subscription Plans

- **Basic Plan**: $4.99/month, 7-day trial
  - Customizable popup
  - Position options
  - Basic styling

- **Premium Plan**: $9.99/month, 7-day trial
  - All Basic features
  - Custom colors
  - Advanced styling
  - Priority support

### Testing Billing

```bash
# Test subscription creation
curl -X POST "http://localhost:3000/api/billing/subscribe?shop=test-shop.myshopify.com" \
  -H "Content-Type: application/json" \
  -d '{"planId": "basic", "test": true}'

# Test subscription cancellation
curl -X POST "http://localhost:3000/api/billing/cancel?shop=test-shop.myshopify.com"
```

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### E2E Tests

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e:headed
```

### Test Coverage

The project maintains high test coverage:

- **Unit Tests**: Database utilities, API routes, components
- **E2E Tests**: Authentication flow, popup functionality, accessibility
- **Integration Tests**: Shopify API integration, billing flows

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**
   ```bash
   vercel --prod
   ```

2. **Configure Environment Variables**
   - Add all production environment variables in Vercel dashboard
   - Set up database connection string
   - Configure Shopify app credentials

3. **Set up Database**
   ```bash
   # Run migrations in production
   npx prisma migrate deploy
   ```

4. **Update Shopify App URLs**
   - Update app URL in Partner dashboard
   - Update OAuth redirect URLs
   - Update webhook endpoints

### Environment-Specific Configuration

#### Development
- Uses SQLite for local development
- Ngrok for tunnel
- Test mode for billing

#### Production
- PostgreSQL database (Vercel Postgres)
- Production Shopify app credentials
- Live billing integration

## 📊 Monitoring

### Health Checks

```bash
# Check app health
curl https://your-app.vercel.app/health
```

### Audit Logs

The app logs all important activities:

- App installations/uninstallations
- Settings changes
- Subscription events
- Authentication attempts
- Error occurrences

Access logs through the admin interface at `/logs`.

### Performance Monitoring

- **Lighthouse CI**: Automated performance testing
- **Core Web Vitals**: Tracked in production
- **Error Tracking**: Console errors logged
- **Database Performance**: Query monitoring

## 🔧 API Reference

### Authentication

All API routes require valid Shopify session:

```typescript
GET /api/auth?shop=store.myshopify.com
POST /api/auth/callback
```

### Settings

```typescript
GET /api/settings?shop=store.myshopify.com
POST /api/settings?shop=store.myshopify.com
```

### Billing

```typescript
GET /api/billing/cancel?shop=store.myshopify.com
POST /api/billing/subscribe?shop=store.myshopify.com
POST /api/billing/cancel?shop=store.myshopify.com
```

### Webhooks

```typescript
POST /api/webhooks/app/uninstalled
POST /api/webhooks/shop/update
POST /api/webhooks/themes/publish
POST /api/webhooks/app_subscriptions/update
```

## 🎯 Best Practices

### Code Quality

- **TypeScript**: Strict mode enabled
- **ESLint**: Comprehensive rule set
- **Prettier**: Consistent formatting
- **Husky**: Pre-commit hooks
- **Conventional Commits**: Semantic versioning

### Security

- **HMAC Verification**: All webhooks verified
- **CSRF Protection**: Built-in Next.js protection
- **Input Validation**: Zod schema validation
- **Rate Limiting**: API route protection
- **Secure Headers**: Security headers configured

### Performance

- **Edge Functions**: Vercel edge deployment
- **Database Optimization**: Indexed queries
- **Caching**: Strategic caching implementation
- **Bundle Optimization**: Tree shaking enabled
- **Image Optimization**: Next.js image optimization

## 🐛 Troubleshooting

### Common Issues

#### App Installation Fails

```bash
# Check ngrok tunnel
curl https://your-app.ngrok.io/health

# Verify environment variables
echo $SHOPIFY_API_KEY
echo $SHOPIFY_API_SECRET

# Check database connection
npm run db:generate && npm run db:push
```

#### Popup Not Showing

1. Verify app embed is enabled in theme editor
2. Check browser console for JavaScript errors
3. Verify popup hasn't been dismissed (check localStorage)
4. Check theme compatibility

#### Billing Issues

1. Verify subscription API scopes
2. Check test vs production mode
3. Validate webhook endpoints
4. Review Shopify Partner dashboard logs

#### Database Connection Issues

```bash
# Test database connection
npx prisma db pull

# Reset database
npm run db:reset

# Check migrations
npx prisma migrate status
```

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
DEBUG=shopify:*
```

### Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issue with reproduction steps
- **Email**: support@example.com
- **Shopify Community**: Post in Shopify Partners community

## 📚 Additional Resources

### Shopify Documentation

- [Shopify App Development](https://shopify.dev/docs/apps)
- [Theme App Extensions](https://shopify.dev/docs/apps/online-store/theme-app-extensions)
- [Subscription Billing API](https://shopify.dev/docs/apps/billing)
- [Webhooks](https://shopify.dev/docs/apps/webhooks)

### Technical Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Shopify Polaris](https://polaris.shopify.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Playwright Testing](https://playwright.dev/)

## 📝 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📋 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.

---

Built with ❤️ for the Shopify ecosystem
