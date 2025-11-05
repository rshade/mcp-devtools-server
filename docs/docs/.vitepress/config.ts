import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'MCP DevTools Server',
  description: 'Development tooling for AI assistants via Model Context Protocol',

  base: '/mcp-devtools-server/',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/mcp-devtools-server/logo.svg' }]
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/getting-started/installation' },
      { text: 'Tools', link: '/tools/overview' },
      { text: 'API', link: '/api/mcp-protocol' },
      { text: 'Examples', link: '/examples/basic-usage' }
    ],

    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/getting-started/installation' },
            { text: 'Quick Start', link: '/getting-started/quick-start' },
            { text: 'Configuration', link: '/getting-started/configuration' },
            { text: 'Troubleshooting', link: '/getting-started/troubleshooting' }
          ]
        }
      ],
      '/guides/': [
        {
          text: 'Guides',
          items: [
            { text: 'Go Development', link: '/guides/go-development' },
            { text: 'Smart Suggestions', link: '/guides/smart-suggestions' },
            { text: 'MCP Servers', link: '/guides/mcp-servers' },
            { text: 'CI/CD Integration', link: '/guides/ci-cd-integration' },
            { text: 'Custom Tools', link: '/guides/custom-tools' },
            { text: 'Onboarding Wizard', link: '/guides/onboarding-wizard' }
          ]
        }
      ],
      '/tools/': [
        {
          text: 'Tools Reference',
          items: [
            { text: 'Overview', link: '/tools/overview' },
            { text: 'Go Tools', link: '/tools/go-tools' },
            { text: 'Make Tools', link: '/tools/make-tools' },
            { text: 'Lint Tools', link: '/tools/lint-tools' },
            { text: 'Test Tools', link: '/tools/test-tools' },
            { text: 'Git Tools', link: '/tools/git-tools' },
            { text: 'Actionlint Tools', link: '/tools/actionlint-tools' },
            { text: 'Smart Suggestions', link: '/tools/smart-suggestions' },
            { text: 'File Validation', link: '/tools/file-validation' },
            { text: 'Onboarding Tools', link: '/tools/onboarding-tools' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'MCP Protocol', link: '/api/mcp-protocol' },
            { text: 'Tool Schemas', link: '/api/tool-schemas' },
            { text: 'Error Handling', link: '/api/error-handling' }
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Basic Usage', link: '/examples/basic-usage' },
            { text: 'Advanced Workflows', link: '/examples/advanced-workflows' },
            { text: 'Integration Patterns', link: '/examples/integration-patterns' }
          ]
        }
      ],
      '/contributing/': [
        {
          text: 'Contributing',
          items: [
            { text: 'Development Setup', link: '/contributing/development-setup' },
            { text: 'Writing Tools', link: '/contributing/writing-tools' },
            { text: 'Testing', link: '/contributing/testing' },
            { text: 'Documentation', link: '/contributing/documentation' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/rshade/mcp-devtools-server' }
    ],

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/rshade/mcp-devtools-server/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the Apache-2.0 License.',
      copyright: 'Copyright © 2025-present'
    },

    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium'
      }
    }
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true
  }
})
