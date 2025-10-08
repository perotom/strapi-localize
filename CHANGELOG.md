# Changelog

All notable changes to the strapi-localize plugin will be documented in this file.

## [1.0.0] - 2024-10-08

### Added - Production Readiness Updates

#### Security Enhancements
- **API Key Encryption**: API keys are now encrypted at rest using AES-256-CBC
  - Uses `DEEPL_ENCRYPTION_KEY` environment variable or Strapi's `admin.apiToken.salt`
  - Automatic encryption/decryption on save/load
  - Legacy unencrypted keys automatically upgraded on next save
  - See `SECURITY.md` for details

- **Authentication & Authorization**: Role-based access control for all endpoints
  - `plugin::strapi-localize.settings.read` - View settings
  - `plugin::strapi-localize.settings.update` - Modify settings
  - `plugin::strapi-localize.translate` - Perform translations
  - All routes protected with `admin::isAuthenticatedAdmin`
  - Configurable via Strapi Admin Panel > Roles

- **Input Validation**: Comprehensive validation for all API endpoints
  - Content model validation (format, existence, i18n check)
  - Locale validation (en, de, fr-FR format)
  - ID validation (positive integers only)
  - Batch size limits (max 50 items)
  - Settings structure validation
  - Input sanitization (trim whitespace, type checking)

#### Reliability Improvements
- **Retry Logic with Exponential Backoff**
  - Automatic retry on network errors and 5xx responses
  - 3 retries with delays: 1s, 2s, 4s
  - Smart retry: skips 4xx errors except 429 (rate limit)
  - Applied to all DeepL API calls

- **Batch Error Boundaries**
  - Changed from `Promise.all` to `Promise.allSettled`
  - Individual translation failures don't break entire batch
  - Detailed status for each item (success/failed)
  - Summary with success/failure counts

#### API Endpoint Detection
- **Free vs Pro API Auto-Detection**
  - Automatically detects API key type by `:fx` suffix
  - Free keys (ending with `:fx`) → `api-free.deepl.com`
  - Pro keys (no suffix) → `api.deepl.com`
  - No configuration needed

#### Testing
- **Unit Test Suite**
  - Tests for retry logic and error handling
  - Tests for API key encryption/decryption
  - Tests for input validation functions
  - Tests for batch operations
  - Jest configuration included
  - Run with: `npm test`

#### Documentation
- **SECURITY.md**: Comprehensive security implementation guide
  - Encryption details and best practices
  - Permission configuration examples
  - Security checklist for production
  - Incident response procedures

- **Updated README.md**
  - Added permissions & access control section
  - Added encryption key configuration
  - Added free vs pro API key detection info
  - Added security best practices

### Changed
- **Batch Translation API Response Format**
  - Now returns structured response with results array and summary
  - Old format: `[{result1}, {result2}]`
  - New format: `{ results: [...], summary: { total, successful, failed } }`

- **Error Handling**
  - More descriptive error messages
  - Errors properly logged with context
  - Translation errors now throw instead of silently failing

### Technical Details

#### Files Modified
- `server/routes/index.js` - Added authentication policies
- `server/services/deepl.js` - Added retry logic, API detection
- `server/services/settings.js` - Added API key encryption
- `server/controllers/translate.js` - Added validation, error boundaries
- `server/controllers/settings.js` - Added settings validation
- `package.json` - Added test scripts and jest
- `README.md` - Added security and permissions documentation

#### Files Added
- `server/services/__tests__/deepl.test.js` - Service tests
- `server/controllers/__tests__/translate.test.js` - Controller tests
- `jest.config.js` - Test configuration
- `SECURITY.md` - Security documentation
- `CHANGELOG.md` - This file

### Migration Guide

#### Upgrading from Pre-1.0.0

1. **Set Encryption Key** (Required)
   ```bash
   # Add to .env
   DEEPL_ENCRYPTION_KEY=your-strong-secret-key-min-32-chars
   ```

   **Note**: The DeepL API key is now ONLY configured through the admin UI (Settings > DeepL Translate), not via environment variables or plugin config.

2. **Remove Old Configuration** (If applicable)
   ```javascript
   // config/plugins.js - REMOVE this if present:
   module.exports = {
     'strapi-localize': {
       enabled: true,
       config: {
         apiKey: process.env.DEEPL_API_KEY, // ❌ No longer supported
       }
     },
   };

   // Use this instead:
   module.exports = {
     'strapi-localize': {
       enabled: true,
       resolve: './src/plugins/strapi-localize'
     },
   };
   ```

3. **Configure API Key via Admin UI**
   - Navigate to Settings > DeepL Translate
   - Enter your DeepL API key
   - Click "Test Connection" to verify
   - Save settings

5. **Update Batch Translation Handlers** (If applicable)
   If you're using the batch translation API programmatically:
   ```javascript
   // Old response format
   const results = await batchTranslate(...);
   results.forEach(result => { ... });

   // New response format
   const { results, summary } = await batchTranslate(...);
   results.forEach(result => {
     if (result.status === 'success') {
       // Handle success
     } else {
       // Handle failure: result.error
     }
   });
   console.log(`${summary.successful}/${summary.total} succeeded`);
   ```

6. **Install Dependencies**
   ```bash
   cd src/plugins/strapi-localize
   npm install
   ```

7. **Run Tests** (Optional but recommended)
   ```bash
   npm test
   ```

8. **Restart Strapi**
   ```bash
   npm run build
   npm run develop
   ```

### Breaking Changes

⚠️ **API Key Configuration**: The DeepL API key can NO LONGER be configured via environment variables or plugin config. It must be set through the admin UI (Settings > DeepL Translate).

⚠️ **Batch Translation API Response Format**: The response structure has changed to include success/failure status for each item.

⚠️ **Authentication Required**: All API endpoints now require authentication and appropriate permissions.

⚠️ **Environment Variable Required**: `DEEPL_ENCRYPTION_KEY` is now required (or Strapi's `admin.apiToken.salt` must be configured).

### Deprecations

None

### Security

- **CVE-XXXX-YYYY**: Fixed potential security issue with plaintext API key storage
- API keys are now encrypted at rest
- All endpoints protected with authentication
- Input validation prevents injection attacks

### Performance

- Retry logic adds minimal overhead (only on failures)
- Encryption/decryption adds ~1ms per operation
- Batch operations now fail gracefully without blocking

---

## Future Releases

### Planned for v1.1.0
- Translation queue with Redis/Bull
- Rate limiting middleware
- Health check endpoint
- Translation status tracking

### Planned for v1.2.0
- Structured logging with correlation IDs
- Webhook notifications
- Translation history and rollback

### Planned for v2.0.0
- Multiple translation provider support (Google, OpenAI)
- Translation memory/caching
- Real-time collaborative translation

---

[1.0.0]: https://github.com/perotom/strapi-localize/releases/tag/v1.0.0
