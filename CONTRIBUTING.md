# Contributing to Privacy Popup

Thank you for your interest in contributing to Privacy Popup! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Release Process](#release-process)

## 🤝 Code of Conduct

This project adheres to a code of conduct that ensures a welcoming environment for all contributors. By participating, you agree to uphold this code.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- PostgreSQL (for local development)
- Shopify Partner account
- Basic knowledge of React, Next.js, and TypeScript

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/privacy-popup.git
   cd privacy-popup
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env.local
   # Fill in your environment variables
   ```

4. **Database Setup**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

## 🔄 Development Workflow

### Branch Naming

Use descriptive branch names following this pattern:

- `feature/add-new-popup-position` - New features
- `fix/billing-subscription-error` - Bug fixes
- `docs/update-readme` - Documentation updates
- `refactor/database-queries` - Code refactoring
- `test/add-e2e-billing-tests` - Test additions

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description

[optional body]

[optional footer]
```

#### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

#### Examples
```bash
feat(popup): add left and right positioning options
fix(billing): resolve subscription cancellation webhook handling
docs(readme): update installation instructions
test(api): add unit tests for settings endpoints
```

### Development Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following our coding standards
   - Add/update tests as needed
   - Update documentation if required

3. **Test Your Changes**
   ```bash
   npm run lint
   npm run type-check
   npm test
   npm run test:e2e
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): your descriptive message"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 Coding Standards

### TypeScript Guidelines

- Use strict TypeScript configuration
- Define proper types for all functions and components
- Avoid `any` type unless absolutely necessary
- Use type guards for runtime type checking

```typescript
// Good
interface PopupSettings {
  message: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  dismissible: boolean;
}

// Avoid
const settings: any = { ... };
```

### React/Next.js Guidelines

- Use functional components with hooks
- Prefer server components when possible
- Use proper error boundaries
- Implement loading states

```tsx
// Good
export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Component logic
}
```

### API Route Guidelines

- Validate input with Zod schemas
- Handle errors gracefully
- Return consistent response format
- Use proper HTTP status codes

```typescript
// Good
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = schema.parse(body);
    
    // Process request
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
```

### Database Guidelines

- Use Prisma for all database operations
- Write efficient queries with proper indexes
- Handle database errors appropriately
- Use transactions for multi-step operations

### CSS/Styling Guidelines

- Use Polaris components when possible
- Follow BEM methodology for custom CSS
- Use CSS custom properties for theming
- Ensure responsive design

## 🧪 Testing Guidelines

### Unit Tests

- Test all utility functions
- Test API routes with mocked dependencies
- Test React components with user interactions
- Maintain >80% code coverage

```typescript
// Example unit test
describe('db.findShopByDomain', () => {
  it('should return shop with subscriptions', async () => {
    const mockShop = { id: '1', domain: 'test.myshopify.com' };
    mockPrisma.shop.findUnique.mockResolvedValue(mockShop);
    
    const result = await db.findShopByDomain('test.myshopify.com');
    
    expect(result).toEqual(mockShop);
  });
});
```

### E2E Tests

- Test critical user flows
- Test accessibility compliance
- Test across different browsers
- Include mobile testing

```typescript
// Example E2E test
test('should complete billing subscription flow', async ({ page }) => {
  await page.goto('/billing');
  await page.click('[data-testid="subscribe-button"]');
  await expect(page).toHaveURL(/confirmation/);
});
```

### Testing Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- settings.test.ts

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm test -- --coverage
```

## 🔍 Pull Request Process

### Before Submitting

1. **Ensure CI Passes**
   - All tests pass
   - Linting passes
   - Type checking passes
   - Build succeeds

2. **Update Documentation**
   - Update README if needed
   - Add/update code comments
   - Update CHANGELOG.md

3. **Self Review**
   - Review your own changes
   - Check for console.log statements
   - Verify error handling

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
```

### Review Process

1. **Automated Checks**
   - CI pipeline must pass
   - All tests must pass
   - Code coverage maintained

2. **Code Review**
   - At least one reviewer approval required
   - Address all review comments
   - Maintain conversation history

3. **Merge Requirements**
   - Up-to-date with main branch
   - All conversations resolved
   - CI passing

## 🐛 Issue Guidelines

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
A clear description of the bug

**To Reproduce**
Steps to reproduce the behavior

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment:**
- OS: [e.g. iOS]
- Browser: [e.g. chrome, safari]
- Version: [e.g. 22]

**Additional context**
Any other context about the problem
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem?**
A clear description of the problem

**Describe the solution you'd like**
A clear description of what you want to happen

**Describe alternatives you've considered**
Alternative solutions or features considered

**Additional context**
Any other context about the feature request
```

## 🚢 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Prepare Release**
   - Update CHANGELOG.md
   - Ensure all tests pass
   - Update documentation

2. **Create Release**
   - Tag version: `git tag v1.2.3`
   - Push tags: `git push --tags`
   - GitHub Actions will handle the rest

3. **Post-Release**
   - Monitor deployment
   - Update documentation
   - Announce release

## 🆘 Getting Help

### Documentation

- [README.md](README.md) - Setup and usage
- [API Documentation](docs/api.md) - API reference
- [Architecture](docs/architecture.md) - System design

### Community

- **GitHub Discussions** - General questions and ideas
- **GitHub Issues** - Bug reports and feature requests
- **Email** - support@example.com for private inquiries

### Development Support

- **Code Questions** - Use GitHub Discussions
- **Bug Reports** - Create GitHub Issue
- **Feature Ideas** - Use GitHub Discussions or Issues

## 📚 Additional Resources

### Shopify Development

- [Shopify App Development](https://shopify.dev/docs/apps)
- [Theme App Extensions](https://shopify.dev/docs/apps/online-store/theme-app-extensions)
- [Shopify Polaris](https://polaris.shopify.com/)

### Technical Stack

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)

## 🙏 Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes
- README.md acknowledgments
- Project documentation

Thank you for contributing to Privacy Popup! 🎉
