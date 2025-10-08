'use strict';

module.exports = ({ strapi }) => ({
  validateContentModel(model) {
    if (!model || typeof model !== 'string') {
      return { valid: false, error: 'Model must be a non-empty string' };
    }

    // Validate model format (e.g., api::article.article)
    if (!/^(api|plugin)::[a-z0-9-]+\.[a-z0-9-]+$/i.test(model)) {
      return { valid: false, error: 'Invalid model format. Expected format: api::name.name' };
    }

    // Check if content type exists
    const contentType = strapi.contentTypes[model];
    if (!contentType) {
      return { valid: false, error: `Content type '${model}' does not exist` };
    }

    // Check if content type has i18n enabled
    if (!contentType.pluginOptions?.i18n?.localized) {
      return { valid: false, error: `Content type '${model}' does not have i18n enabled` };
    }

    return { valid: true };
  },

  validateLocale(locale) {
    if (!locale || typeof locale !== 'string') {
      return { valid: false, error: 'Locale must be a non-empty string' };
    }

    // Basic locale format validation (e.g., en, de, fr-FR)
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
      return { valid: false, error: 'Invalid locale format. Expected format: en, de, fr-FR' };
    }

    return { valid: true };
  },

  validateId(id) {
    if (!id) {
      return { valid: false, error: 'ID is required' };
    }

    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) {
      return { valid: false, error: 'ID must be a positive number' };
    }

    return { valid: true };
  },

  async translate(ctx) {
    try {
      const { id, model, targetLocale, sourceLocale } = ctx.request.body;

      // Validate required parameters
      if (!id || !model || !targetLocale) {
        return ctx.badRequest('Missing required parameters: id, model, targetLocale');
      }

      // Validate ID
      const idValidation = this.validateId(id);
      if (!idValidation.valid) {
        return ctx.badRequest(idValidation.error);
      }

      // Validate model
      const modelValidation = this.validateContentModel(model);
      if (!modelValidation.valid) {
        return ctx.badRequest(modelValidation.error);
      }

      // Validate target locale
      const targetLocaleValidation = this.validateLocale(targetLocale);
      if (!targetLocaleValidation.valid) {
        return ctx.badRequest(targetLocaleValidation.error);
      }

      // Validate source locale if provided
      if (sourceLocale) {
        const sourceLocaleValidation = this.validateLocale(sourceLocale);
        if (!sourceLocaleValidation.valid) {
          return ctx.badRequest(sourceLocaleValidation.error);
        }
      }

      const result = await strapi
        .plugin('strapi-localize')
        .service('deepl')
        .translateContent(id, model, targetLocale, sourceLocale);

      ctx.body = result;
    } catch (error) {
      strapi.log.error('Translation error:', error);
      ctx.throw(500, error.message || 'Translation failed');
    }
  },

  async translateBatch(ctx) {
    try {
      const { ids, model, targetLocale, sourceLocale } = ctx.request.body;

      // Validate required parameters
      if (!ids || !model || !targetLocale) {
        return ctx.badRequest('Missing required parameters: ids, model, targetLocale');
      }

      // Validate ids is an array
      if (!Array.isArray(ids)) {
        return ctx.badRequest('ids must be an array');
      }

      // Validate batch size (max 50 items to prevent overload)
      if (ids.length === 0) {
        return ctx.badRequest('ids array cannot be empty');
      }

      if (ids.length > 50) {
        return ctx.badRequest('Maximum batch size is 50 items');
      }

      // Validate each ID
      for (const id of ids) {
        const idValidation = this.validateId(id);
        if (!idValidation.valid) {
          return ctx.badRequest(`Invalid ID '${id}': ${idValidation.error}`);
        }
      }

      // Validate model
      const modelValidation = this.validateContentModel(model);
      if (!modelValidation.valid) {
        return ctx.badRequest(modelValidation.error);
      }

      // Validate target locale
      const targetLocaleValidation = this.validateLocale(targetLocale);
      if (!targetLocaleValidation.valid) {
        return ctx.badRequest(targetLocaleValidation.error);
      }

      // Validate source locale if provided
      if (sourceLocale) {
        const sourceLocaleValidation = this.validateLocale(sourceLocale);
        if (!sourceLocaleValidation.valid) {
          return ctx.badRequest(sourceLocaleValidation.error);
        }
      }

      // Process translations with error boundaries
      const results = await Promise.allSettled(
        ids.map(id =>
          strapi
            .plugin('strapi-localize')
            .service('deepl')
            .translateContent(id, model, targetLocale, sourceLocale)
            .catch(error => ({
              id,
              error: error.message || 'Translation failed',
              status: 'failed'
            }))
        )
      );

      // Format results with success/failure status
      const formattedResults = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value?.error) {
            return {
              id: ids[index],
              status: 'failed',
              error: result.value.error
            };
          }
          return {
            id: result.value.id,
            status: 'success',
            data: result.value
          };
        } else {
          return {
            id: ids[index],
            status: 'failed',
            error: result.reason?.message || 'Unknown error'
          };
        }
      });

      // Count successes and failures
      const successCount = formattedResults.filter(r => r.status === 'success').length;
      const failureCount = formattedResults.filter(r => r.status === 'failed').length;

      ctx.body = {
        results: formattedResults,
        summary: {
          total: ids.length,
          successful: successCount,
          failed: failureCount
        }
      };
    } catch (error) {
      strapi.log.error('Batch translation error:', error);
      ctx.throw(500, error.message || 'Batch translation failed');
    }
  },

  async getLanguages(ctx) {
    try {
      const languages = await strapi
        .plugin('strapi-localize')
        .service('deepl')
        .getAvailableLanguages();

      ctx.body = languages;
    } catch (error) {
      ctx.throw(500, error);
    }
  },
});