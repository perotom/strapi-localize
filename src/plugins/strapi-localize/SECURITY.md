# Security Implementation Guide

## Overview

This document describes the security features implemented in the strapi-strapi-localize plugin.

## 1. Authentication & Authorization

### Route Protection
All API endpoints are now protected with Strapi's built-in authentication and permission system.

**Implemented Policies:**
- `admin::isAuthenticatedAdmin` - Ensures user is authenticated
- `admin::hasPermissions` - Checks for specific plugin permissions

**Permission Actions:**
- `plugin::strapi-localize.settings.read` - View settings
- `plugin::strapi-localize.settings.update` - Modify settings
- `plugin::strapi-localize.translate` - Perform translations

### Configuration
Permissions can be managed through:
- **Strapi Admin Panel**: Settings > Users & Permissions Plugin > Roles
- **Database**: Stored in `up_permissions` table

## 2. API Key Encryption

### Encryption Details
- **Algorithm**: AES-256-CBC
- **Key Source**: `DEEPL_ENCRYPTION_KEY` env var or Strapi's `admin.apiToken.salt`
- **IV**: Randomly generated per encryption, stored with ciphertext

### Usage

**Environment Variable (Recommended):**
```bash
# .env
DEEPL_ENCRYPTION_KEY=your-strong-secret-key-min-32-chars
```

**Strapi Config (Alternative):**
```javascript
// config/admin.js
module.exports = {
  apiToken: {
    salt: process.env.API_TOKEN_SALT,
  },
};
```

### How It Works
1. **Storage**: API keys are encrypted before saving to database
2. **Retrieval**: Automatically decrypted when loaded
3. **Legacy Support**: Unencrypted keys are supported and auto-encrypted on next save

### Security Notes
- ⚠️ Never commit encryption keys to version control
- ⚠️ Use strong, random keys (minimum 32 characters)
- ⚠️ Rotate encryption keys periodically
- ⚠️ Store keys securely (use secrets manager in production)

## 3. Input Validation & Sanitization

### Validation Rules

**Content IDs:**
- Must be positive integers
- Required for all translation operations

**Content Models:**
- Must follow format: `api::name.name` or `plugin::name.name`
- Must exist in Strapi content types
- Must have i18n enabled

**Locales:**
- Format: `en`, `de`, `fr-FR` (2-letter or 2+2-letter codes)
- Validated against standard locale formats

**Batch Operations:**
- Maximum 50 items per batch
- Array must not be empty
- Each ID individually validated

**Settings:**
- API key: String, trimmed of whitespace
- Content types: Object with validated structure
- Glossary: Array of objects with required term field

### Sanitization
- API keys are trimmed of leading/trailing whitespace
- Input types are strictly validated before processing
- All fields undergo type checking

## 4. Error Handling & Retry Logic

### Exponential Backoff
- **Max Retries**: 3 attempts (configurable)
- **Initial Delay**: 1 second
- **Backoff Formula**: delay = initialDelay * 2^attempt
- **Delays**: 1s, 2s, 4s

### Retry Conditions
**Will Retry:**
- Network errors (timeout, connection refused)
- 5xx server errors
- 429 rate limit errors

**Won't Retry:**
- 4xx client errors (except 429)
- Validation errors
- Authentication failures

### Batch Error Boundaries
- Uses `Promise.allSettled` to handle failures gracefully
- Individual translation failures don't break entire batch
- Returns detailed status for each item:
  ```json
  {
    "results": [
      { "id": 1, "status": "success", "data": {...} },
      { "id": 2, "status": "failed", "error": "..." }
    ],
    "summary": {
      "total": 2,
      "successful": 1,
      "failed": 1
    }
  }
  ```

## 5. Testing

### Test Coverage
Basic unit tests are provided for:
- Retry logic with various error scenarios
- API key encryption/decryption
- Input validation functions
- Batch error handling

### Running Tests
```bash
cd src/plugins/strapi-strapi-localize
npm install
npm test
npm run test:coverage
```

### Test Structure
```
server/
├── services/
│   └── __tests__/
│       └── deepl.test.js
└── controllers/
    └── __tests__/
        └── translate.test.js
```

## Security Best Practices

### Production Deployment Checklist

- [ ] Set strong `DEEPL_ENCRYPTION_KEY` environment variable
- [ ] Configure DeepL API key ONLY via admin UI (Settings > Strapi Localize)
- [ ] Never store DeepL API key in environment variables or plugin config
- [ ] Configure proper RBAC permissions for users
- [ ] Restrict `settings.update` permission to Super Admins only
- [ ] Enable HTTPS for all API communications
- [ ] Set up rate limiting at reverse proxy level
- [ ] Monitor API key usage for anomalies
- [ ] Implement audit logging for translation operations
- [ ] Regular security updates for dependencies
- [ ] Backup encryption keys securely
- [ ] Test disaster recovery procedures

### Monitoring & Alerts

**Recommended Metrics:**
- Failed authentication attempts
- API key decryption failures
- Translation error rates
- Unusual batch sizes
- API rate limit hits

**Alert Conditions:**
- Multiple failed decryption attempts (possible key rotation issue)
- Spike in 403 errors (permission issues)
- DeepL API quota near limit
- Unusual translation patterns

## Incident Response

### API Key Compromise
1. Immediately rotate DeepL API key in DeepL dashboard
2. Update plugin settings with new key
3. Review access logs for unauthorized usage
4. Check for data exfiltration
5. Update team on breach

### Encryption Key Leak
1. Generate new encryption key
2. Decrypt all stored API keys with old key
3. Re-encrypt with new key
4. Update `DEEPL_ENCRYPTION_KEY` across all environments
5. Restart Strapi instances
6. Audit database access logs

## Compliance

### GDPR Considerations
- Translations may contain personal data
- Ensure DeepL contract covers data processing
- Document data retention policies
- Implement right to deletion for translations

### Data Privacy
- API keys are encrypted at rest
- DeepL API uses TLS for data in transit
- No translation content is cached by plugin
- Audit trails available via Strapi logs

## Support

For security issues:
1. **DO NOT** open public GitHub issues
2. Email: security@[your-domain].com
3. Include: Version, impact, reproduction steps
4. GPG key available for encrypted communication

---

Last Updated: 2024-10-08
Version: 1.0.0
