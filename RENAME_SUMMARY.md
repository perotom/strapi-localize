# Project Rename Summary

## Overview
The project has been successfully renamed from `strapi-deepl-translate` to `strapi-localize`.

## Changes Made

### 1. Directory Structure
```
src/plugins/strapi-deepl-translate/  →  src/plugins/strapi-localize/
```

### 2. Package Configuration

**File: `package.json`**
```json
{
  "name": "strapi-localize",  // Was: strapi-deepl-translate
  "strapi": {
    "name": "strapi-localize",  // Was: deepl-translate
    "displayName": "Strapi Localize"  // Was: DeepL Translate
  }
}
```

### 3. Server Files Updated

All references updated in:
- `server/services/deepl.js`
- `server/services/settings.js`
- `server/controllers/translate.js`
- `server/controllers/settings.js`
- `server/routes/index.js`
- `server/bootstrap.js`
- `server/middlewares/lifecycle.js`

**Plugin Store Name:**
```javascript
// Old
strapi.store({ type: 'plugin', name: 'deepl-translate' })

// New
strapi.store({ type: 'plugin', name: 'strapi-localize' })
```

**Plugin Access:**
```javascript
// Old
strapi.plugin('deepl-translate').service('deepl')

// New
strapi.plugin('strapi-localize').service('deepl')
```

### 4. Admin UI Files Updated

**File: `admin/src/index.js`**
```javascript
const name = 'strapi-localize';  // Was: deepl-translate
```

**File: `admin/src/pages/Settings/index.js`**
```javascript
// Old API routes
get('/deepl-translate/settings')

// New API routes
get('/strapi-localize/settings')
```

**File: `admin/src/pages/HomePage/index.js`**
```javascript
// Old API routes
post('/deepl-translate/translate-batch')

// New API routes
post('/strapi-localize/translate-batch')
```

**File: `admin/src/translations/en.json`**
```json
{
  "strapi-localize.plugin.name": "DeepL Translate",
  "strapi-localize.settings.title": "Settings",
  // ... all keys updated from deepl-translate to strapi-localize
}
```

### 5. Routes Updated

**Permission Actions:**
```
Old: plugin::deepl-translate.settings.read
New: plugin::strapi-localize.settings.read

Old: plugin::deepl-translate.settings.update
New: plugin::strapi-localize.settings.update

Old: plugin::deepl-translate.translate
New: plugin::strapi-localize.translate
```

### 6. API Endpoints Updated

**All endpoints changed from:**
```
/api/deepl-translate/*
```

**To:**
```
/api/strapi-localize/*
```

**Specific endpoints:**
- `/api/strapi-localize/settings` (GET, PUT)
- `/api/strapi-localize/content-types` (GET)
- `/api/strapi-localize/test-connection` (POST)
- `/api/strapi-localize/translate` (POST)
- `/api/strapi-localize/translate-batch` (POST)
- `/api/strapi-localize/languages` (GET)
- `/api/strapi-localize/sync-glossaries` (POST)
- `/api/strapi-localize/list-glossaries` (GET)

### 7. Documentation Updated

**Files updated:**
- `README.md`
- `CHANGELOG.md`
- `CONFIGURATION.md`
- `SECURITY.md`

**Plugin configuration examples:**
```javascript
// config/plugins.js
module.exports = {
  'strapi-localize': {  // Was: strapi-deepl-translate
    enabled: true,
    resolve: './src/plugins/strapi-localize'  // Was: strapi-deepl-translate
  },
};
```

### 8. Code References Updated

**JavaScript SDK usage:**
```javascript
// Old
const service = strapi.plugin('deepl-translate').service('deepl');

// New
const service = strapi.plugin('strapi-localize').service('deepl');
```

**Schema plugin options:**
```javascript
// Old
"pluginOptions": {
  "deepl-translate": {
    "translatable": true
  }
}

// New
"pluginOptions": {
  "strapi-localize": {
    "translatable": true
  }
}
```

## Migration for Existing Installations

### If you have an existing installation:

1. **Update plugin configuration** in `config/plugins.js`:
   ```javascript
   module.exports = {
     'strapi-localize': {  // Change from 'strapi-deepl-translate'
       enabled: true,
       resolve: './src/plugins/strapi-localize'
     },
   };
   ```

2. **Update plugin directory name**:
   ```bash
   mv src/plugins/strapi-deepl-translate src/plugins/strapi-localize
   ```

3. **Rebuild admin panel**:
   ```bash
   npm run build
   ```

4. **Important: Database Migration**

   The plugin store data is stored under the old name. You have two options:

   **Option A: Keep existing settings (recommended)**

   The plugin will not find your old settings automatically. You'll need to:
   - Re-enter your API key in the admin UI
   - Reconfigure content type settings

   **Option B: Migrate database data**

   If you want to preserve existing settings, run this SQL:
   ```sql
   -- For PostgreSQL
   UPDATE strapi_core_store_settings
   SET key = REPLACE(key, 'plugin_deepl-translate', 'plugin_strapi-localize')
   WHERE key LIKE 'plugin_deepl-translate%';

   -- For MySQL
   UPDATE strapi_core_store_settings
   SET `key` = REPLACE(`key`, 'plugin_deepl-translate', 'plugin_strapi-localize')
   WHERE `key` LIKE 'plugin_deepl-translate%';

   -- For SQLite
   UPDATE strapi_core_store_settings
   SET key = REPLACE(key, 'plugin_deepl-translate', 'plugin_strapi-localize')
   WHERE key LIKE 'plugin_deepl-translate%';
   ```

5. **Update permissions**:
   - Go to Settings > Roles
   - Update permissions from `plugin::deepl-translate.*` to `plugin::strapi-localize.*`
   - This may happen automatically, but verify in the admin panel

6. **Update custom code** (if applicable):

   If you have custom code that references the plugin:
   ```javascript
   // Update all occurrences:
   strapi.plugin('deepl-translate')  →  strapi.plugin('strapi-localize')

   // Update API calls:
   '/api/deepl-translate/*'  →  '/api/strapi-localize/*'
   ```

7. **Restart Strapi**:
   ```bash
   npm run develop
   ```

## Verification

After renaming, verify:

✅ Plugin appears in admin panel as "Strapi Localize"
✅ Settings page accessible at Settings > Strapi Localize
✅ API endpoints respond at `/api/strapi-localize/*`
✅ Permissions show as `plugin::strapi-localize.*`
✅ Translations work correctly
✅ All tests pass: `npm test`

## Breaking Changes

⚠️ **API Endpoints**: All API endpoints have changed from `/api/deepl-translate/*` to `/api/strapi-localize/*`

⚠️ **Plugin Name**: Plugin identifier changed from `deepl-translate` to `strapi-localize`

⚠️ **Permissions**: Permission actions changed from `plugin::deepl-translate.*` to `plugin::strapi-localize.*`

⚠️ **Configuration**: Config key changed from `strapi-deepl-translate` to `strapi-localize`

## Files Changed

### Total Files Modified: 20+

**Core Plugin Files:**
- package.json
- strapi-admin.js
- strapi-server.js

**Server Files:**
- server/index.js
- server/bootstrap.js
- server/routes/index.js
- server/services/deepl.js
- server/services/settings.js
- server/services/index.js
- server/controllers/translate.js
- server/controllers/settings.js
- server/controllers/index.js
- server/middlewares/lifecycle.js

**Admin Files:**
- admin/src/index.js
- admin/src/pages/Settings/index.js
- admin/src/pages/HomePage/index.js
- admin/src/translations/en.json

**Documentation:**
- README.md
- CHANGELOG.md
- CONFIGURATION.md
- SECURITY.md

**Tests:**
- server/services/__tests__/deepl.test.js
- server/controllers/__tests__/translate.test.js

## Verification Commands

```bash
# Check no old references remain
grep -r "strapi-deepl-translate" . --include="*.js" --include="*.json" --include="*.md"
# Should return: 0 results

grep -r "deepl-translate" . --include="*.js" --include="*.json"
# Should return: 0 results (except in comments/strings if any)

# Verify new name is used
grep -r "strapi-localize" . --include="*.js" --include="*.json" | wc -l
# Should return: 100+ results

# Run tests
cd src/plugins/strapi-localize
npm test
# All tests should pass
```

## Notes

- The plugin still uses DeepL API internally (the service files are not renamed)
- Display name in UI is "Strapi Localize"
- npm package name is `strapi-localize`
- Internal Strapi plugin name is `strapi-localize`
- All functionality remains the same, only naming changed

---

**Rename Date:** 2024-10-08
**Version:** 1.0.0
**Status:** ✅ Complete
