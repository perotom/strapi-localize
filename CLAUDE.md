# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Strapi v5 plugin project that provides automatic content translation capabilities using the DeepL API. The main component is the `strapi-deepl-translate` plugin located in `src/plugins/strapi-deepl-translate/`.

## Repository Structure

```
strapi-localize/
├── src/plugins/strapi-deepl-translate/  # Main translation plugin
│   ├── admin/                           # React-based admin UI
│   │   └── src/
│   │       ├── pages/Settings/          # Plugin configuration UI
│   │       └── pages/HomePage/          # Batch translation interface
│   ├── server/                          # Node.js backend
│   │   ├── services/                    # Business logic
│   │   │   ├── deepl.js                # DeepL API integration
│   │   │   └── settings.js             # Settings management
│   │   ├── controllers/                 # HTTP endpoints
│   │   ├── routes/                      # Route definitions
│   │   ├── middlewares/                 # Lifecycle hooks
│   │   └── bootstrap.js                # Plugin initialization
│   └── package.json                     # Plugin dependencies
```

## Key Components

### DeepL Translation Service (`server/services/deepl.js`)
- Handles all DeepL API communication
- Supports both Free and Pro API endpoints
- Translates content recursively while preserving relations
- Respects field-level ignore configuration

### Settings Management (`server/services/settings.js`)
- Stores configuration in Strapi's plugin store
- Manages per-content-type settings
- Handles field exclusion lists

### Lifecycle Hooks (`server/middlewares/lifecycle.js`)
- Automatically triggers translation on content create/update
- Only processes i18n-enabled content types
- Respects auto-translate configuration

### Admin UI Components
- **Settings Page**: Configure API key, content types, and ignored fields
- **HomePage**: Batch translation interface with content selection
- Uses Strapi Design System components

## Development Commands

Since this is a plugin meant to be integrated into a Strapi project:

```bash
# To use the plugin in a Strapi project:
1. Copy plugin to Strapi's src/plugins/ directory
2. Install dependencies: npm install axios
3. Enable in config/plugins.js
4. Rebuild admin: npm run build
5. Start Strapi: npm run develop
```

## Testing the Plugin

```bash
# Test DeepL connection
curl -X POST http://localhost:1337/api/deepl-translate/test-connection

# Translate content
curl -X POST http://localhost:1337/api/deepl-translate/translate \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "model": "api::article.article", "targetLocale": "de"}'
```

## Important Technical Details

### Field Translation Logic
- Automatically translates: `string`, `text`, `richtext`, `blocks`
- Preserves: relations, media, numbers, dates, booleans
- System fields always ignored: `id`, `createdAt`, `updatedAt`, `publishedAt`, `locale`
- Custom ignored fields configured per content type

### API Integration
- Attempts Free API first (api-free.deepl.com)
- Falls back to Pro API (api.deepl.com) on 403 error
- Handles rate limiting gracefully
- Logs errors without breaking the application

### Relation Handling
- Relations are preserved by extracting and maintaining IDs
- Supports both single and multiple relations
- Does not translate related content (only the current entity)

### Auto-Translation Trigger
- Uses Strapi's lifecycle hooks (afterCreate, afterUpdate)
- Delayed by 1 second to allow for database transactions
- Only triggers for content with localizations
- Skips if auto-translate is disabled

## Configuration Structure

```javascript
{
  apiKey: "string",           // DeepL API key
  autoTranslate: boolean,     // Global setting
  contentTypes: {
    "api::model.model": {
      enabled: boolean,       // Translation enabled
      autoTranslate: boolean, // Auto-translate on save
      ignoredFields: []       // Fields to exclude
    }
  }
}
```

## Common Issues and Solutions

1. **Plugin not appearing**: Rebuild admin panel with `npm run build`
2. **API key issues**: Test connection in Settings page
3. **Fields not translating**: Check if field type is supported
4. **Relations broken**: Ensure related entities exist in target locale

## GitHub Repository

- Repository: https://github.com/perotom/strapi-localize
- Issues: https://github.com/perotom/strapi-localize/issues

## Notes for Future Development

- Consider caching translations to reduce API calls
- Add support for custom translation providers
- Implement translation queue for large batch operations
- Add translation history and rollback functionality