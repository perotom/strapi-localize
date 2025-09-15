# Strapi Localize - DeepL Translation Plugin for Strapi v5

A powerful Strapi v5 plugin that provides automatic content translation using DeepL's AI-powered translation service. Seamlessly integrate multilingual capabilities into your Strapi CMS with just a few clicks.

## 🚀 What Can This Plugin Do?

- **🔄 Automatic Translation**: Automatically translate content when created or updated
- **📦 Batch Operations**: Translate multiple content items simultaneously
- **🎯 Smart Field Selection**: Choose which fields to translate and which to preserve
- **🔗 Relation Preservation**: Maintains all content relationships during translation
- **🌍 Multi-locale Support**: Works with all DeepL-supported languages
- **⚙️ Flexible Configuration**: Per-content-type settings for maximum control
- **💼 Free & Pro Support**: Compatible with both DeepL Free and Pro API plans

## 📋 Prerequisites

- **Node.js**: v18.x to v20.x
- **Strapi**: v5.0.0 or higher
- **DeepL API Key**: Free or Pro account ([Get one here](https://www.deepl.com/pro-api))
- **i18n Plugin**: Strapi Internationalization plugin must be installed and configured

## 🛠️ Installation

### Step 1: Create a New Strapi Project (Skip if you have one)

```bash
npx create-strapi@latest my-project --quickstart
cd my-project
```

### Step 2: Enable Internationalization

1. Install the i18n plugin if not already installed:
```bash
npm install @strapi/plugin-i18n
```

2. Configure locales in your Strapi admin panel:
   - Go to **Settings → Internationalization**
   - Add the languages you want to support

### Step 3: Install the DeepL Translation Plugin

#### Option A: From this repository (Development)

1. Clone this repository:
```bash
git clone https://github.com/perotom/strapi-localize.git
cd strapi-localize
```

2. Copy the plugin to your Strapi project:
```bash
cp -r src/plugins/strapi-deepl-translate /path/to/your-strapi-project/src/plugins/
```

3. Install plugin dependencies:
```bash
cd /path/to/your-strapi-project
npm install axios
```

#### Option B: As a package (When published)

```bash
npm install strapi-deepl-translate
```

### Step 4: Enable the Plugin

Create or update `config/plugins.js`:

```javascript
module.exports = {
  'strapi-deepl-translate': {
    enabled: true,
  },
  // ... other plugins
};
```

### Step 5: Rebuild Admin Panel

```bash
npm run build
npm run develop
```

## 🎯 User Flow & Configuration

### Initial Setup

1. **Get Your DeepL API Key**
   - Sign up at [DeepL Pro](https://www.deepl.com/pro-api)
   - Choose Free (500,000 chars/month) or Pro plan
   - Copy your authentication key from the account settings

2. **Configure the Plugin**
   - Navigate to **Settings → DeepL Translate** in your Strapi admin
   - Enter your DeepL API key
   - Click "Test Connection" to verify
   - Save your settings

### Setting Up Content Types for Translation

1. **Enable i18n for Your Content Types**
   - Go to **Content-Type Builder**
   - Edit your content type
   - Go to Advanced Settings
   - Enable "Internationalization"

2. **Configure Translation Settings**
   - Return to **Settings → DeepL Translate**
   - For each content type:
     - ✅ **Enable translation**: Toggle on
     - 🔄 **Auto-translate**: Enable automatic translation on save
     - 🚫 **Ignored fields**: Select fields that shouldn't be translated (e.g., slugs, IDs, technical fields)

### Using the Translation Features

#### Manual Batch Translation

1. Navigate to **DeepL Translate** in the main menu
2. Select your content type from the dropdown
3. Choose the target language
4. Select content items to translate (checkbox)
5. Click "Translate Selected"

#### Automatic Translation

When enabled, content automatically translates when:
- Creating new content in the default locale
- Updating existing content
- Publishing drafts

#### Field Exclusion

To exclude specific fields from translation:

1. Go to **Settings → DeepL Translate**
2. Find your content type
3. In "Fields to ignore", select:
   - Technical fields (slugs, IDs)
   - Fields with specific formatting requirements
   - Fields that should remain in the original language

Example excluded fields:
- `slug` - URL identifiers
- `seo_keywords` - SEO-specific terms
- `product_code` - Technical codes
- `email` - Email addresses

## 📝 Complete Usage Example

Let's say you have a blog with articles in English that you want to translate to German and French:

### 1. Prepare Your Content Type

```javascript
// Your article content type should have:
{
  "title": "string",          // ✅ Will be translated
  "content": "richtext",      // ✅ Will be translated
  "excerpt": "text",          // ✅ Will be translated
  "slug": "string",           // ❌ Can be excluded
  "author": "relation",       // 🔗 Relation preserved
  "category": "relation",     // 🔗 Relation preserved
  "featured_image": "media"   // 📷 Media preserved
}
```

### 2. Configure the Plugin

```javascript
// Settings configuration
{
  apiKey: "your-deepl-api-key",
  contentTypes: {
    "api::article.article": {
      enabled: true,
      autoTranslate: true,
      ignoredFields: ["slug", "seo_meta"]
    }
  }
}
```

### 3. Create Content

1. Create an article in English
2. Fill in all fields
3. Save the article

### 4. Automatic Translation

If auto-translate is enabled:
- The article is automatically translated to German and French
- Relations to author and category are maintained
- The slug field remains unchanged
- Featured image is preserved

### 5. Manual Translation

For existing content:
1. Go to **DeepL Translate**
2. Select "Article" content type
3. Choose "German" as target language
4. Select articles to translate
5. Click "Translate Selected"

## 🔌 API Usage

### Translate Single Item

```bash
curl -X POST http://localhost:1337/api/deepl-translate/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "id": 1,
    "model": "api::article.article",
    "targetLocale": "de",
    "sourceLocale": "en"
  }'
```

### Translate Multiple Items

```bash
curl -X POST http://localhost:1337/api/deepl-translate/translate-batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "ids": [1, 2, 3],
    "model": "api::article.article",
    "targetLocale": "fr",
    "sourceLocale": "en"
  }'
```

### Get Available Languages

```bash
curl -X GET http://localhost:1337/api/deepl-translate/languages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🎨 Supported Field Types

| Field Type | Translated | Notes |
|------------|------------|-------|
| string | ✅ | Short text fields |
| text | ✅ | Long text fields |
| richtext | ✅ | Formatted content |
| blocks | ✅ | Dynamic zones |
| relation | 🔗 | Preserved as-is |
| media | 📷 | Preserved as-is |
| number | 🔢 | Preserved as-is |
| boolean | ⚡ | Preserved as-is |
| json | 📊 | Depends on content |
| date | 📅 | Preserved as-is |

## ⚡ Performance Considerations

- **Rate Limits**: DeepL Free allows 500,000 characters/month
- **Batch Size**: Process up to 50 items at once for optimal performance
- **Caching**: Translations are stored in Strapi's database
- **Async Processing**: Large batches are processed asynchronously

## 🔒 Security Best Practices

1. **API Key Storage**: Store your DeepL API key securely
2. **Access Control**: Configure proper permissions for translation endpoints
3. **Field Validation**: Always validate which fields should be translated
4. **Rate Limiting**: Implement rate limiting for API endpoints

## 🐛 Troubleshooting

### Plugin Not Appearing in Admin Panel
- Ensure the plugin is enabled in `config/plugins.js`
- Rebuild the admin panel: `npm run build`
- Clear browser cache

### Translation Not Working
- Verify DeepL API key is correct
- Check if content type has i18n enabled
- Ensure target locale exists in Strapi
- Verify you have remaining DeepL quota

### Fields Not Being Excluded
- Check field names match exactly
- Save settings after making changes
- Verify fields are listed in ignored fields

### Relations Lost After Translation
- Ensure relations exist in the source content
- Check that related entities are published
- Verify relation field names haven't changed

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🆘 Support

- **Documentation**: [Plugin README](src/plugins/strapi-deepl-translate/README.md)
- **Issues**: [GitHub Issues](https://github.com/perotom/strapi-localize/issues)
- **Discord**: [Strapi Community](https://discord.strapi.io/)

## 🚦 Roadmap

- [ ] Support for custom translation providers
- [ ] Translation queue management
- [ ] Translation history and rollback
- [ ] Bulk translation scheduling
- [ ] Translation quality settings
- [ ] Cost estimation calculator
- [ ] Webhook support for translation events

---

Made with ❤️ for the Strapi Community