module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/dashboard?shop=test-shop.myshopify.com&host=test-host',
        'http://localhost:3000/settings?shop=test-shop.myshopify.com&host=test-host',
        'http://localhost:3000/billing?shop=test-shop.myshopify.com&host=test-host',
      ],
      startServerCommand: 'npm start',
      startServerReadyPattern: 'ready',
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'categories:pwa': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
