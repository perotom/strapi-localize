# Strapi DeepL Translate Plugin

A powerful Strapi v5 plugin that automatically translates your content using the DeepL API. This plugin seamlessly integrates with Strapi's internationalization (i18n) system to provide high-quality translations across all your localized content.

## 🌟 Key Features

- **🔄 Automatic Translation**: Automatically translate content when created or updated
- **📦 Batch Translation**: Translate multiple content items at once through the admin panel
- **🎯 Field-Level Control**: Configure which fields should be ignored during translation
- **⚙️ Content Type Configuration**: Enable/disable translation for specific content types
- **🔗 Relation Handling**: Properly maintains relations when translating content
- **💼 DeepL Integration**: Supports both Free and Pro DeepL API plans
- **🎨 Admin UI**: User-friendly interface for managing translations and settings

## 📋 Requirements

- Strapi v5.0.0 or higher
- Node.js v18.x to v20.x
- DeepL API key (Free or Pro)
- i18n plugin enabled and configured

## 🚀 Installation

### From NPM (when published)

```bash
npm install strapi-localize
```

### From Source

1. Copy the plugin folder to your Strapi project:
```bash
cp -r strapi-localize /path/to/your-strapi-project/src/plugins/
```

2. Install dependencies:
```bash
cd /path/to/your-strapi-project
npm install axios
```

3. Enable the plugin in `config/plugins.js`:

```javascript
module.exports = {
  'strapi-localize': {
    enabled: true,
    resolve: './src/plugins/strapi-localize'
  },
};
```

4. Rebuild your admin panel:
```bash
npm run build
npm run develop
```

## ⚙️ Configuration

### Environment Variables

The plugin requires one environment variable for security:

```bash
# .env
DEEPL_ENCRYPTION_KEY=your-strong-secret-key-min-32-chars  # Required for API key encryption
```

**Important Security Notes:**
- The `DEEPL_ENCRYPTION_KEY` is **required** to encrypt API keys stored in the database
- Use a strong, random key (minimum 32 characters)
- Never commit encryption keys to version control
- If not set, the plugin will use Strapi's `admin.apiToken.salt` as fallback
- **The DeepL API key itself is configured via the admin UI, not environment variables**

### Getting a DeepL API Key

1. Sign up for a DeepL account at [deepl.com](https://www.deepl.com/pro-api)
2. Choose your plan:
   - **Free**: 500,000 characters/month (API keys end with `:fx`)
   - **Pro**: Unlimited usage with pay-as-you-go pricing
3. Copy your API key from the account settings

**Note**: The plugin automatically detects Free vs Pro API keys based on the `:fx` suffix and uses the correct API endpoint.

### Permissions & Access Control

The plugin implements role-based access control (RBAC) for all operations:

#### Permission Actions

1. **`plugin::strapi-localize.settings.read`**
   - View plugin settings
   - Test API connection
   - List available languages
   - View content types

2. **`plugin::strapi-localize.settings.update`**
   - Modify plugin configuration
   - Update API key
   - Change content type settings
   - Sync glossaries

3. **`plugin::strapi-localize.translate`**
   - Perform single translations
   - Execute batch translations

#### Configuring Permissions

**Via Strapi Admin Panel:**
1. Navigate to **Settings > Administration Panel > Roles**
2. Select a role (Editor, Author, etc.)
3. Expand **Plugins > DeepL Translate**
4. Check/uncheck desired permissions
5. Save changes

**Example Configuration:**
```javascript
// Recommended role setup
Super Admin:    ✓ settings.read  ✓ settings.update  ✓ translate
Editor:         ✓ settings.read  ✗ settings.update  ✓ translate
Author:         ✗ settings.read  ✗ settings.update  ✓ translate
Translator:     ✗ settings.read  ✗ settings.update  ✓ translate
```

**Security Best Practices:**
- Only grant `settings.update` to trusted administrators
- API key changes should be restricted to Super Admins
- Content editors should only have `translate` permission
- Audit permission changes regularly

### Plugin Settings Page

After installation, navigate to **Settings > DeepL Translate** in your Strapi admin panel:

#### Global Settings
- **API Key**: Enter your DeepL API authentication key here (securely encrypted in database)
- **Test Connection**: Verify your API key is valid before saving
- **Auto-Translation**: Enable/disable automatic translation globally

**Note**: The API key is stored encrypted in the database and can only be changed through this admin interface.

#### Content Type Settings
For each content type with i18n enabled:
- **Enable Translation**: Allow this content type to be translated
- **Auto-Translate**: Automatically translate on create/update
- **Ignored Fields**: Select fields that should not be translated

## 📖 Detailed Usage Guide

### Preparing Content Types

1. **Enable i18n for Your Content Type**

```javascript
// In your content type schema
{
  "pluginOptions": {
    "i18n": {
      "localized": true
    }
  }
}
```

2. **Configure Field Types**

The plugin automatically detects and translates these field types:
- `string` - Short text
- `text` - Long text
- `richtext` - HTML/Markdown content
- `blocks` - Dynamic zones and components

### Manual Translation Workflow

#### Single Item Translation

1. Navigate to your content manager
2. Select an item to translate
3. Use the plugin's API or admin interface
4. Choose target language(s)
5. Review and save translated content

#### Batch Translation

1. Go to **DeepL Translate** in the admin menu
2. Select content type
3. Choose target language
4. Select multiple items using checkboxes
5. Click "Translate Selected"
6. Monitor progress in real-time

### Automatic Translation

When enabled, the plugin automatically translates content:

```javascript
// Lifecycle hooks trigger on:
- afterCreate: New content in default locale
- afterUpdate: Updated content fields
- beforePublish: Draft to published state
```

### Field Exclusion Strategies

#### Via Admin UI

1. Go to **Settings → DeepL Translate**
2. Select your content type
3. In "Fields to ignore", choose fields like:
   - `slug` - URL paths
   - `seo_keywords` - SEO terms
   - `product_sku` - Product codes
   - `external_id` - External references

#### Via Configuration

```javascript
// In your plugin configuration
{
  contentTypes: {
    "api::article.article": {
      enabled: true,
      autoTranslate: true,
      ignoredFields: ["slug", "seo_description", "canonical_url"]
    }
  }
}
```

#### Via Field Schema (Advanced)

```javascript
// In your content type schema
{
  "attributes": {
    "title": {
      "type": "string",
      "pluginOptions": {
        "strapi-localize": {
          "translatable": true
        }
      }
    },
    "slug": {
      "type": "string",
      "pluginOptions": {
        "strapi-localize": {
          "translatable": false // Never translate this field
        }
      }
    }
  }
}
```

## 🔌 API Reference

### REST API Endpoints

#### Translate Single Content

```http
POST /api/strapi-localize/translate
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "id": 1,
  "model": "api::article.article",
  "targetLocale": "de",
  "sourceLocale": "en"
}
```

**Response:**
```json
{
  "id": 42,
  "title": "Übersetzter Titel",
  "content": "Übersetzter Inhalt...",
  "locale": "de",
  "localizations": [{"id": 1, "locale": "en"}]
}
```

#### Batch Translation

```http
POST /api/strapi-localize/translate-batch
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "ids": [1, 2, 3, 4, 5],
  "model": "api::article.article",
  "targetLocale": "fr",
  "sourceLocale": "en"
}
```

**Response:**
```json
[
  {"id": 43, "status": "success", "locale": "fr"},
  {"id": 44, "status": "success", "locale": "fr"},
  {"id": 45, "status": "success", "locale": "fr"}
]
```

#### Get Available Languages

```http
GET /api/strapi-localize/languages
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
[
  {"language": "DE", "name": "German"},
  {"language": "FR", "name": "French"},
  {"language": "ES", "name": "Spanish"},
  {"language": "IT", "name": "Italian"}
]
```

#### Get/Update Settings

```http
GET /api/strapi-localize/settings
PUT /api/strapi-localize/settings
Authorization: Bearer YOUR_JWT_TOKEN
```

### JavaScript SDK Usage

```javascript
// In your custom code
const translationService = strapi.plugin('strapi-localize').service('deepl');

// Translate a single field
const translatedText = await translationService.translate(
  'Hello World',
  'de',
  'en'
);

// Translate an entire object
const translatedObject = await translationService.translateObject(
  { title: 'Hello', content: 'World' },
  'fr',
  'en',
  ['id', 'slug'] // Fields to ignore
);

// Translate content entity
const translatedContent = await translationService.translateContent(
  entityId,
  'api::article.article',
  'es',
  'en'
);
```

## 🎯 Use Cases & Examples

### E-commerce Product Catalog

```javascript
// Product content type
{
  "name": "string",           // ✅ Translate
  "description": "richtext",  // ✅ Translate
  "price": "decimal",         // 🔢 Preserve
  "sku": "string",            // ❌ Ignore
  "category": "relation",     // 🔗 Maintain
  "images": "media"           // 📷 Preserve
}

// Configuration
{
  "api::product.product": {
    enabled: true,
    autoTranslate: true,
    ignoredFields: ["sku", "barcode", "manufacturer_id"]
  }
}
```

### Multi-language Blog

```javascript
// Article content type
{
  "title": "string",
  "content": "richtext",
  "excerpt": "text",
  "slug": "uid",
  "author": "relation",
  "tags": "relation"
}

// Workflow
1. Author writes in English
2. Auto-translate to DE, FR, ES on save
3. Editors review translations
4. Publish all locales simultaneously
```

### Documentation Site

```javascript
// Documentation page
{
  "title": "string",
  "content": "blocks",  // Dynamic zones
  "code_examples": "text",  // Ignore
  "api_reference": "json",  // Ignore
  "version": "string"       // Ignore
}

// Settings
ignoredFields: ["code_examples", "api_reference", "version"]
```

## 🔧 Advanced Configuration

### Custom Translation Rules

```javascript
// In your plugin extension
module.exports = {
  async beforeTranslate(content, targetLocale, sourceLocale) {
    // Pre-process content before translation
    if (content.title && targetLocale === 'de') {
      // Add custom prefix for German titles
      content.title = `[DE] ${content.title}`;
    }
    return content;
  },

  async afterTranslate(content, targetLocale, sourceLocale) {
    // Post-process translated content
    if (targetLocale === 'fr') {
      // Ensure French formatting
      content.content = content.content.replace(/\$/g, '€');
    }
    return content;
  }
};
```

### Performance Optimization

```javascript
// config/plugins.js
module.exports = {
  'strapi-localize': {
    enabled: true,
    config: {
      batchSize: 25,        // Items per batch
      timeout: 30000,       // API timeout (ms)
      retryAttempts: 3,     // Retry failed translations
      cacheEnabled: true,   // Cache translations
      cacheTTL: 3600       // Cache TTL in seconds
    }
  }
};
```

## 🐛 Troubleshooting Guide

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Plugin not appearing | Not enabled | Check `config/plugins.js` and rebuild |
| API key invalid | Wrong key or plan | Verify key in DeepL dashboard |
| Fields not translating | Field type unsupported | Check supported field types |
| Relations broken | Invalid reference | Ensure relations exist in target locale |
| Timeout errors | Large content | Reduce batch size or increase timeout |
| Character limit reached | Free plan limit | Upgrade to Pro or wait for reset |

### Debug Mode

Enable debug logging:

```javascript
// config/plugins.js
{
  'strapi-localize': {
    enabled: true,
    config: {
      debug: true // Enable detailed logging
    }
  }
}
```

### Health Check

```bash
# Check plugin status
curl http://localhost:1337/api/strapi-localize/health

# Test API connection
curl -X POST http://localhost:1337/api/strapi-localize/test-connection \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔄 Migration Guide

### From Other Translation Plugins

```javascript
// Export existing translations
const oldTranslations = await strapi
  .plugin('old-translation-plugin')
  .service('export')
  .exportAll();

// Import to DeepL Translate
for (const item of oldTranslations) {
  await strapi
    .plugin('strapi-localize')
    .service('deepl')
    .translateContent(
      item.id,
      item.model,
      item.locale,
      item.sourceLocale
    );
}
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/perotom/strapi-localize.git

# Install dependencies
npm install

# Run tests
npm test

# Build for production
npm run build
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/perotom/strapi-localize/issues)
- **Discussions**: [GitHub Discussions](https://github.com/perotom/strapi-localize/discussions)
- **Discord**: [Strapi Community](https://discord.strapi.io/)

## 🚦 Roadmap

### Version 2.0
- [ ] OpenAI/GPT translation support
- [ ] Google Translate integration
- [ ] Custom translation providers API

### Version 2.1
- [ ] Translation memory database
- [ ] Glossary/term management
- [ ] Translation quality scoring

### Version 3.0
- [ ] Real-time collaborative translation
- [ ] Translation workflow management
- [ ] A/B testing for translations

---

Made with ❤️ by the Strapi Community