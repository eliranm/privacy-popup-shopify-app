#!/bin/bash

# Privacy Popup Shopify App - GitHub Setup Script
# This script will create a GitHub repository and push your code

set -e

echo "🚀 Setting up GitHub repository for Privacy Popup Shopify App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Repository details
REPO_NAME="privacy-popup-shopify-app"
DESCRIPTION="A production-ready Shopify app that adds customizable privacy popups to storefronts with subscription billing and admin interface"

echo -e "${BLUE}Repository Name:${NC} $REPO_NAME"
echo -e "${BLUE}Description:${NC} $DESCRIPTION"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}GitHub CLI not found. Installing...${NC}"
    
    # Try to install via Homebrew
    if command -v brew &> /dev/null; then
        echo "Installing via Homebrew..."
        brew install gh
    else
        echo -e "${RED}Homebrew not found. Please install GitHub CLI manually:${NC}"
        echo "Visit: https://cli.github.com/"
        echo ""
        echo "Or run: curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg"
        exit 1
    fi
fi

# Check if user is logged in to GitHub CLI
echo -e "${BLUE}Checking GitHub authentication...${NC}"
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}Not logged in to GitHub. Please authenticate:${NC}"
    gh auth login
fi

# Get GitHub username
GITHUB_USER=$(gh api user --jq .login)
echo -e "${GREEN}✓ Authenticated as: $GITHUB_USER${NC}"

# Check if repository already exists
if gh repo view "$GITHUB_USER/$REPO_NAME" &> /dev/null; then
    echo -e "${YELLOW}Repository $REPO_NAME already exists!${NC}"
    read -p "Do you want to use the existing repository? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting..."
        exit 1
    fi
else
    # Create the repository
    echo -e "${BLUE}Creating GitHub repository...${NC}"
    gh repo create "$REPO_NAME" \
        --description "$DESCRIPTION" \
        --public \
        --add-readme=false \
        --clone=false
    
    echo -e "${GREEN}✓ Repository created: https://github.com/$GITHUB_USER/$REPO_NAME${NC}"
fi

# Add remote origin if it doesn't exist
if ! git remote get-url origin &> /dev/null; then
    echo -e "${BLUE}Adding remote origin...${NC}"
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
    echo -e "${GREEN}✓ Remote origin added${NC}"
else
    echo -e "${YELLOW}Remote origin already exists${NC}"
fi

# Push to GitHub
echo -e "${BLUE}Pushing code to GitHub...${NC}"
git push -u origin main

echo -e "${GREEN}✓ Code pushed to GitHub successfully!${NC}"

# Set up repository settings
echo -e "${BLUE}Configuring repository settings...${NC}"

# Enable issues and wiki
gh repo edit "$GITHUB_USER/$REPO_NAME" \
    --enable-issues \
    --enable-wiki \
    --enable-projects

# Add topics
gh repo edit "$GITHUB_USER/$REPO_NAME" \
    --add-topic shopify \
    --add-topic shopify-app \
    --add-topic nextjs \
    --add-topic typescript \
    --add-topic privacy \
    --add-topic popup \
    --add-topic ecommerce \
    --add-topic polaris

echo -e "${GREEN}✓ Repository settings configured${NC}"

# Create branch protection rules
echo -e "${BLUE}Setting up branch protection...${NC}"
gh api repos/"$GITHUB_USER"/"$REPO_NAME"/branches/main/protection \
    --method PUT \
    --field required_status_checks='{"strict":true,"contexts":["ci"]}' \
    --field enforce_admins=false \
    --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
    --field restrictions=null \
    --field allow_force_pushes=false \
    --field allow_deletions=false 2>/dev/null || echo -e "${YELLOW}Note: Branch protection requires admin access${NC}"

# Set up GitHub Pages (for documentation)
echo -e "${BLUE}Configuring GitHub Pages...${NC}"
gh api repos/"$GITHUB_USER"/"$REPO_NAME"/pages \
    --method POST \
    --field source='{"branch":"main","path":"/"}' 2>/dev/null || echo -e "${YELLOW}Note: GitHub Pages setup skipped${NC}"

# Create initial issue templates
echo -e "${BLUE}Creating issue templates...${NC}"
mkdir -p .github/ISSUE_TEMPLATE

cat > .github/ISSUE_TEMPLATE/bug_report.yml << 'EOF'
name: Bug Report
description: File a bug report
title: "[Bug]: "
labels: ["bug", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!
  - type: input
    id: contact
    attributes:
      label: Contact Details
      description: How can we get in touch with you if we need more info?
      placeholder: ex. email@example.com
    validations:
      required: false
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Also tell us, what did you expect to happen?
      placeholder: Tell us what you see!
    validations:
      required: true
  - type: dropdown
    id: version
    attributes:
      label: Version
      description: What version of our software are you running?
      options:
        - 1.0.0 (Default)
        - Latest
    validations:
      required: true
  - type: dropdown
    id: browsers
    attributes:
      label: What browsers are you seeing the problem on?
      multiple: true
      options:
        - Firefox
        - Chrome
        - Safari
        - Microsoft Edge
  - type: textarea
    id: logs
    attributes:
      label: Relevant log output
      description: Please copy and paste any relevant log output. This will be automatically formatted into code, so no need for backticks.
      render: shell
EOF

cat > .github/ISSUE_TEMPLATE/feature_request.yml << 'EOF'
name: Feature Request
description: Suggest an idea for this project
title: "[Feature]: "
labels: ["enhancement"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a new feature!
  - type: textarea
    id: problem
    attributes:
      label: Is your feature request related to a problem?
      description: A clear and concise description of what the problem is.
      placeholder: I'm always frustrated when...
  - type: textarea
    id: solution
    attributes:
      label: Describe the solution you'd like
      description: A clear and concise description of what you want to happen.
  - type: textarea
    id: alternatives
    attributes:
      label: Describe alternatives you've considered
      description: A clear and concise description of any alternative solutions or features you've considered.
  - type: textarea
    id: additional-context
    attributes:
      label: Additional context
      description: Add any other context or screenshots about the feature request here.
EOF

# Create pull request template
cat > .github/pull_request_template.md << 'EOF'
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] This change requires a documentation update

## How Has This Been Tested?

- [ ] Unit tests
- [ ] E2E tests
- [ ] Manual testing

## Checklist:

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules
EOF

# Commit the new GitHub templates
git add .github/
git commit -m "docs: add GitHub issue and PR templates" || echo "No changes to commit"
git push origin main || echo "Nothing to push"

echo ""
echo -e "${GREEN}🎉 GitHub setup complete!${NC}"
echo ""
echo -e "${BLUE}Repository URL:${NC} https://github.com/$GITHUB_USER/$REPO_NAME"
echo -e "${BLUE}Clone URL:${NC} git clone https://github.com/$GITHUB_USER/$REPO_NAME.git"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Set up environment variables in GitHub Secrets (for CI/CD)"
echo "2. Configure Vercel deployment"
echo "3. Set up Shopify Partner app"
echo "4. Start development!"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
EOF
