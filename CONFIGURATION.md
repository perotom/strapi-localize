# Configuration Guide

## Quick Start

### 1. Enable the Plugin

Create or update `config/plugins.js`:

```javascript
module.exports = {
  'strapi-localize': {
    enabled: true,
    resolve: './src/plugins/strapi-localize'
  },
};
```

### 2. Set Encryption Key

Add to your `.env` file:

```bash
DEEPL_ENCRYPTION_KEY=your-strong-random-secret-key-minimum-32-characters
```

**Important:**
- Use a strong, random key (minimum 32 characters recommended)
- Keep this key secret - never commit to version control
- If you lose this key, you'll need to reconfigure your DeepL API key

**Generating a secure key:**
```bash
# Linux/macOS
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Configure API Key via Admin UI

1. **Rebuild and start Strapi:**
   ```bash
   npm run build
   npm run develop
   ```

2. **Navigate to Settings:**
   - Open Strapi Admin Panel
   - Go to **Settings > DeepL Translate**

3. **Enter your DeepL API Key:**
   - Get your API key from [DeepL Account](https://www.deepl.com/account/summary)
   - Free API keys end with `:fx`
   - Pro API keys don't have this suffix
   - The plugin automatically detects which endpoint to use

4. **Test the connection:**
   - Click "Test Connection" button
   - Verify you see a success message
   - You should see the number of available languages

5. **Configure settings:**
   - Enable/disable global auto-translation
   - Configure content types
   - Set ignored fields
   - Manage glossary terms

6. **Save your settings**

## API Key Management

### ✅ DO: Configure via Admin UI
```
✓ Settings > DeepL Translate > API Key field
✓ Encrypted automatically before storage
✓ Protected by authentication & permissions
✓ Auditable through Strapi admin logs
```

### ❌ DON'T: Use Environment Variables
```
✗ DEEPL_API_KEY=xxx  (Not supported)
✗ config/plugins.js apiKey option (Not supported)
✗ Hardcoded in code (Never do this!)
```

**Why Admin UI Only?**
- **Security**: Keys are encrypted in database
- **Auditability**: Changes tracked via admin logs
- **Permissions**: Controlled by RBAC
- **User-friendly**: No need to restart server
- **Best Practice**: Secrets shouldn't be in env vars if they change frequently

## Permission Configuration

### Default Permissions (Recommended)

| Role | settings.read | settings.update | translate |
|------|---------------|-----------------|-----------|
| Super Admin | ✓ | ✓ | ✓ |
| Admin | ✓ | ✗ | ✓ |
| Editor | ✓ | ✗ | ✓ |
| Author | ✗ | ✗ | ✓ |
| Translator | ✗ | ✗ | ✓ |

### Setting Up Permissions

1. **Navigate to Roles:**
   ```
   Settings > Administration Panel > Roles
   ```

2. **Select a role** (e.g., Editor)

3. **Find DeepL Translate** in Plugins section

4. **Check desired permissions:**
   - `settings.read` - View API key status, test connection
   - `settings.update` - Change API key, modify configuration
   - `translate` - Perform translations

5. **Save changes**

### Security Recommendations

- **Only Super Admins** should have `settings.update`
- **API key changes** should require Super Admin approval
- **Content editors** should only have `translate` permission
- **Review permissions** regularly (quarterly)
- **Audit logs** for sensitive operations

## Content Type Configuration

### Enable Translation for a Content Type

1. **Ensure i18n is enabled** in your content type schema:
   ```javascript
   // server/content-types/article/schema.json
   {
     "pluginOptions": {
       "i18n": {
         "localized": true
       }
     }
   }
   ```

2. **Configure in admin UI:**
   - Go to Settings > DeepL Translate
   - Find your content type in the list
   - Toggle "Enable translation"
   - Toggle "Auto-translate" if desired
   - Select fields to ignore (slug, SKU, etc.)

### Field Translation Behavior

**Automatically Translated:**
- `string` - Short text fields
- `text` - Long text fields
- `richtext` - HTML/Markdown content
- `blocks` - Dynamic zones

**Preserved (Not Translated):**
- `relation` - Relations maintained
- `media` - Images/files preserved
- `number` - Numbers unchanged
- `boolean` - Booleans unchanged
- `date` - Dates unchanged
- `json` - JSON data preserved

**Always Ignored:**
- `id`
- `createdAt`
- `updatedAt`
- `publishedAt`
- `createdBy`
- `updatedBy`
- `locale`
- `localizations`

### Custom Ignored Fields

**Via Admin UI:**
```
Settings > DeepL Translate > [Content Type] > Fields to ignore
```

Select fields like:
- `slug` - URL paths
- `seo_keywords` - SEO terms
- `product_sku` - Product codes
- `external_id` - External references
- `canonical_url` - SEO URLs

## Glossary Management

### Setting Up a Glossary

1. **Navigate to Settings > DeepL Translate**

2. **Scroll to "Translation Glossary" section**

3. **Add terms:**
   - Enter term in "Term" field
   - Click "Add Term"
   - Enter translations for each language
   - Repeat for all terms

4. **Sync with DeepL:**
   - Click "Sync with DeepL" button
   - Wait for confirmation
   - Glossaries are now active

### Example Glossary

| Term | German (DE) | French (FR) | Spanish (ES) |
|------|-------------|-------------|--------------|
| Strapi | Strapi | Strapi | Strapi |
| CMS | CMS | CMS | CMS |
| Content Type | Inhaltstyp | Type de contenu | Tipo de contenido |

## Environment Variables Reference

### Required

```bash
# Encryption key for API key storage
DEEPL_ENCRYPTION_KEY=your-strong-random-secret-32-chars-minimum
```

### Optional (Strapi Defaults)

```bash
# Alternative encryption key source (if DEEPL_ENCRYPTION_KEY not set)
# Configured in config/admin.js
API_TOKEN_SALT=your-strapi-token-salt
```

### NOT Used (Deprecated)

```bash
# ❌ These are NOT used by the plugin:
DEEPL_API_KEY=xxx           # Use admin UI instead
DEEPL_AUTO_TRANSLATE=true   # Use admin UI instead
```

## Troubleshooting

### API Key Issues

**Problem:** "DeepL API key not configured"
- **Solution:** Set API key in admin UI (Settings > DeepL Translate)

**Problem:** "Failed to decrypt API key"
- **Solution:** Check `DEEPL_ENCRYPTION_KEY` is set correctly
- **Solution:** If key was changed, you'll need to re-enter the API key

**Problem:** "Connection failed" with 403 error
- **Solution:** Verify API key is correct in DeepL dashboard
- **Solution:** Check if using Free key with Free endpoint (auto-detected)

### Permission Issues

**Problem:** User can't access plugin settings
- **Solution:** Grant `settings.read` permission to user's role

**Problem:** User can't change API key
- **Solution:** Grant `settings.update` permission (Super Admin only recommended)

**Problem:** User can't translate content
- **Solution:** Grant `translate` permission to user's role

### Translation Issues

**Problem:** Content not translating automatically
- **Solution:** Check "Auto-translate" is enabled for content type
- **Solution:** Verify i18n is enabled for content type
- **Solution:** Check lifecycle hooks are not disabled

**Problem:** Some fields are translating that shouldn't
- **Solution:** Add fields to "Ignored Fields" list in settings

**Problem:** Batch translation partially fails
- **Solution:** Check response summary for failed items
- **Solution:** Review error messages for each failed item
- **Solution:** Retry failed items individually

## Advanced Configuration

### Backup & Recovery

**Backup encryption key:**
```bash
# Store securely (password manager, secrets vault)
echo $DEEPL_ENCRYPTION_KEY > deepl-key-backup.txt
gpg -c deepl-key-backup.txt
rm deepl-key-backup.txt
```

**Recovery procedure:**
1. Restore `DEEPL_ENCRYPTION_KEY` from backup
2. Restart Strapi
3. Verify API key in admin UI
4. Test connection

### Key Rotation

**When to rotate:**
- Annually (recommended)
- After team member departure
- After suspected compromise
- After system breach

**How to rotate:**
1. Generate new encryption key
2. Decrypt API key with old key (manual process)
3. Update `DEEPL_ENCRYPTION_KEY`
4. Re-enter API key in admin UI
5. Restart Strapi

### Multi-Environment Setup

**Development:**
```bash
# .env.development
DEEPL_ENCRYPTION_KEY=dev-key-not-for-production
```

**Staging:**
```bash
# .env.staging
DEEPL_ENCRYPTION_KEY=staging-key-secure-but-separate
```

**Production:**
```bash
# .env.production (use secrets manager)
DEEPL_ENCRYPTION_KEY=${secrets.deepl_encryption_key}
```

**Best Practice:** Use different keys per environment

## Support

### Getting Help

1. **Check documentation:**
   - README.md - General usage
   - SECURITY.md - Security features
   - CHANGELOG.md - Recent changes

2. **Test connection:**
   - Settings > DeepL Translate > Test Connection

3. **Check logs:**
   ```bash
   # Strapi logs
   tail -f .strapi/logs/strapi.log
   ```

4. **Open issue:**
   - https://github.com/perotom/strapi-localize/issues

---

**Last Updated:** 2024-10-08
**Plugin Version:** 1.0.0
**Strapi Compatibility:** v5.0.0+
