'use strict';

module.exports = ({ strapi }) => ({
  async get(ctx) {
    try {
      const settings = await strapi
        .plugin('deepl-translate')
        .service('settings')
        .getSettings();

      ctx.body = settings;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async update(ctx) {
    try {
      const newSettings = ctx.request.body;

      // Validate settings structure
      if (!newSettings || typeof newSettings !== 'object') {
        return ctx.badRequest('Settings must be an object');
      }

      // Validate API key if provided
      if (newSettings.apiKey !== undefined) {
        if (typeof newSettings.apiKey !== 'string') {
          return ctx.badRequest('API key must be a string');
        }
        // Sanitize API key (trim whitespace)
        newSettings.apiKey = newSettings.apiKey.trim();
      }

      // Validate autoTranslate if provided
      if (newSettings.autoTranslate !== undefined && typeof newSettings.autoTranslate !== 'boolean') {
        return ctx.badRequest('autoTranslate must be a boolean');
      }

      // Validate contentTypes if provided
      if (newSettings.contentTypes !== undefined) {
        if (typeof newSettings.contentTypes !== 'object' || Array.isArray(newSettings.contentTypes)) {
          return ctx.badRequest('contentTypes must be an object');
        }

        // Validate each content type configuration
        for (const [uid, config] of Object.entries(newSettings.contentTypes)) {
          if (typeof config !== 'object') {
            return ctx.badRequest(`Content type config for '${uid}' must be an object`);
          }

          if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
            return ctx.badRequest(`enabled for '${uid}' must be a boolean`);
          }

          if (config.autoTranslate !== undefined && typeof config.autoTranslate !== 'boolean') {
            return ctx.badRequest(`autoTranslate for '${uid}' must be a boolean`);
          }

          if (config.ignoredFields !== undefined) {
            if (!Array.isArray(config.ignoredFields)) {
              return ctx.badRequest(`ignoredFields for '${uid}' must be an array`);
            }
            // Validate each field name is a string
            for (const field of config.ignoredFields) {
              if (typeof field !== 'string') {
                return ctx.badRequest(`ignoredFields for '${uid}' must contain only strings`);
              }
            }
          }
        }
      }

      // Validate glossary if provided
      if (newSettings.glossary !== undefined) {
        if (!Array.isArray(newSettings.glossary)) {
          return ctx.badRequest('glossary must be an array');
        }

        for (const entry of newSettings.glossary) {
          if (!entry.term || typeof entry.term !== 'string') {
            return ctx.badRequest('Each glossary entry must have a term (string)');
          }

          if (entry.translations && typeof entry.translations !== 'object') {
            return ctx.badRequest('Glossary translations must be an object');
          }
        }
      }

      const settings = await strapi
        .plugin('deepl-translate')
        .service('settings')
        .updateSettings(newSettings);

      // Sync glossaries with DeepL after settings update
      if (settings.glossary && settings.glossary.length > 0) {
        try {
          await strapi
            .plugin('deepl-translate')
            .service('deepl')
            .syncGlossaries();
        } catch (glossaryError) {
          strapi.log.warn('Failed to sync glossaries:', glossaryError.message);
          // Don't fail the entire request if glossary sync fails
        }
      }

      ctx.body = settings;
    } catch (error) {
      strapi.log.error('Settings update error:', error);
      ctx.throw(500, error.message || 'Failed to update settings');
    }
  },

  async getContentTypes(ctx) {
    try {
      const contentTypes = Object.keys(strapi.contentTypes)
        .filter(key => {
          const contentType = strapi.contentTypes[key];
          return (
            contentType.kind === 'collectionType' &&
            !key.startsWith('plugin::') &&
            !key.startsWith('strapi::') &&
            contentType.pluginOptions?.i18n?.localized === true
          );
        })
        .map(key => {
          const contentType = strapi.contentTypes[key];
          const fields = Object.entries(contentType.attributes)
            .filter(([fieldKey, field]) => {
              return (
                field.type === 'string' ||
                field.type === 'text' ||
                field.type === 'richtext' ||
                field.type === 'blocks'
              );
            })
            .map(([fieldKey]) => fieldKey);

          return {
            uid: key,
            displayName: contentType.info?.displayName || key,
            fields,
          };
        });

      ctx.body = contentTypes;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async testConnection(ctx) {
    try {
      const languages = await strapi
        .plugin('deepl-translate')
        .service('deepl')
        .getAvailableLanguages();

      ctx.body = {
        success: true,
        languages,
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
  },

  async syncGlossaries(ctx) {
    try {
      const glossaryIds = await strapi
        .plugin('deepl-translate')
        .service('deepl')
        .syncGlossaries();

      ctx.body = {
        success: true,
        glossaryIds,
        message: 'Glossaries synced successfully',
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
  },

  async listGlossaries(ctx) {
    try {
      const glossaries = await strapi
        .plugin('deepl-translate')
        .service('deepl')
        .listGlossaries();

      ctx.body = glossaries;
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
  },
});