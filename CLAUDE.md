# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Strapi v5 plugin that provides automatic content translation using the DeepL API. The plugin can be installed from npm or directly from GitHub.

## Repository Structure

```
strapi-localize/
├── admin/                    # React-based admin UI
│   └── src/
│       ├── index.js          # Admin plugin entry point
│       ├── pluginId.js       # Plugin ID constant
│       ├── pages/Settings/   # Plugin configuration UI
│       ├── pages/HomePage/   # Batch translation interface
│       └── translations/     # i18n translations
├── server/                   # Node.js backend
│   └── src/
│       ├── index.js          # Server entry point
│       ├── bootstrap.js      # Plugin initialization
│       ├── services/         # Business logic (deepl.js, settings.js)
│       ├── controllers/      # HTTP endpoints
│       ├── routes/           # Route definitions
│       └── middlewares/      # Lifecycle hooks
├── dist/                     # Compiled distribution (committed for GitHub installs)
├── package.json              # Plugin package configuration
├── strapi-admin.js           # Local dev admin entry
└── strapi-server.js          # Local dev server entry
```

## Development Commands

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Verify package for distribution
npm run verify

# Watch mode for development
npm run watch

# Run tests
npm test
```

## Installation Methods

### From GitHub (direct)
```bash
npm install github:perotom/strapi-localize
```

### From npm (when published)
```bash
npm install strapi-localize
```

### Enable in Strapi
```javascript
// config/plugins.js
module.exports = {
  'strapi-localize': {
    enabled: true,
  },
};
```

## Key Components

### DeepL Translation Service (`server/src/services/deepl.js`)
- Handles all DeepL API communication
- Supports both Free and Pro API endpoints
- Translates content recursively while preserving relations
- Respects field-level ignore configuration

### Settings Management (`server/src/services/settings.js`)
- Stores configuration in Strapi's plugin store
- Manages per-content-type settings
- Handles API key encryption (AES-256-CBC)

### Lifecycle Hooks (`server/src/middlewares/lifecycle.js`)
- Automatically triggers translation on content create/update
- Only processes i18n-enabled content types
- Respects auto-translate configuration

## Configuration Structure

```javascript
{
  apiKey: "string",           // DeepL API key (encrypted)
  autoTranslate: boolean,     // Global auto-translate setting
  contentTypes: {
    "api::model.model": {
      enabled: boolean,       // Translation enabled
      autoTranslate: boolean, // Auto-translate on save
      ignoredFields: []       // Fields to exclude
    }
  }
}
```

## GitHub Repository

- Repository: https://github.com/perotom/strapi-localize
- Issues: https://github.com/perotom/strapi-localize/issues
