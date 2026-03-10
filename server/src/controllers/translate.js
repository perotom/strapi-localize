'use strict';

/**
 * Translation controller
 * Handles HTTP endpoints for manual translation
 * Uses Strapi v5 Documents API (documentId instead of numeric id)
 */

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

  /**
   * Validate documentId (v5 format - string)
   */
  validateDocumentId(documentId) {
    if (!documentId) {
      return { valid: false, error: 'documentId is required' };
    }

    if (typeof documentId !== 'string') {
      return { valid: false, error: 'documentId must be a string' };
    }

    // documentId should be a non-empty string
    if (documentId.trim().length === 0) {
      return { valid: false, error: 'documentId cannot be empty' };
    }

    return { valid: true };
  },

  /**
   * Translate a single entry
   * POST /admin/strapi-localize/translate
   * Body: { documentId, model, targetLocale, sourceLocale? }
   */
  async translate(ctx) {
    const startTime = Date.now();
    const { documentId, model, targetLocale, sourceLocale } = ctx.request.body;

    strapi.log.info(`[Strapi Localize] Translation request: model=${model}, documentId=${documentId}, target=${targetLocale}, source=${sourceLocale || 'auto'}`);

    try {
      // Validate required parameters
      if (!documentId || !model || !targetLocale) {
        strapi.log.warn(`[Strapi Localize] Translation validation failed: Missing required parameters`);
        return ctx.badRequest('Missing required parameters: documentId, model, targetLocale');
      }

      // Validate documentId
      const documentIdValidation = this.validateDocumentId(documentId);
      if (!documentIdValidation.valid) {
        strapi.log.warn(`[Strapi Localize] Translation validation failed: ${documentIdValidation.error}`);
        return ctx.badRequest(documentIdValidation.error);
      }

      // Validate model
      const modelValidation = this.validateContentModel(model);
      if (!modelValidation.valid) {
        strapi.log.warn(`[Strapi Localize] Translation validation failed: ${modelValidation.error}`);
        return ctx.badRequest(modelValidation.error);
      }

      // Validate target locale
      const targetLocaleValidation = this.validateLocale(targetLocale);
      if (!targetLocaleValidation.valid) {
        strapi.log.warn(`[Strapi Localize] Translation validation failed: ${targetLocaleValidation.error}`);
        return ctx.badRequest(targetLocaleValidation.error);
      }

      // Validate source locale if provided
      if (sourceLocale) {
        const sourceLocaleValidation = this.validateLocale(sourceLocale);
        if (!sourceLocaleValidation.valid) {
          strapi.log.warn(`[Strapi Localize] Translation validation failed: ${sourceLocaleValidation.error}`);
          return ctx.badRequest(sourceLocaleValidation.error);
        }
      }

      // Use the new translation service (v5 Documents API)
      const result = await strapi
        .plugin('strapi-localize')
        .service('translation')
        .translateContent(documentId, model, targetLocale, sourceLocale);

      const duration = Date.now() - startTime;
      strapi.log.info(`[Strapi Localize] Translation completed: model=${model}, documentId=${documentId}, duration=${duration}ms`);

      ctx.body = result;
    } catch (error) {
      const duration = Date.now() - startTime;
      strapi.log.error(`[Strapi Localize] Translation error: model=${model}, documentId=${documentId}, duration=${duration}ms, error=${error.message}`);
      ctx.throw(500, error.message || 'Translation failed');
    }
  },

  /**
   * Translate multiple entries
   * POST /admin/strapi-localize/translate-batch
   * Body: { documentIds, model, targetLocale, sourceLocale? }
   */
  async translateBatch(ctx) {
    const startTime = Date.now();
    const { documentIds, model, targetLocale, sourceLocale } = ctx.request.body;

    strapi.log.info(`[Strapi Localize] Batch translation request: model=${model}, count=${documentIds?.length || 0}, target=${targetLocale}, source=${sourceLocale || 'auto'}`);

    try {
      // Validate required parameters
      if (!documentIds || !model || !targetLocale) {
        strapi.log.warn(`[Strapi Localize] Batch translation validation failed: Missing required parameters`);
        return ctx.badRequest('Missing required parameters: documentIds, model, targetLocale');
      }

      // Validate documentIds is an array
      if (!Array.isArray(documentIds)) {
        strapi.log.warn(`[Strapi Localize] Batch translation validation failed: documentIds must be an array`);
        return ctx.badRequest('documentIds must be an array');
      }

      // Validate batch size (max 50 items to prevent overload)
      if (documentIds.length === 0) {
        strapi.log.warn(`[Strapi Localize] Batch translation validation failed: Empty array`);
        return ctx.badRequest('documentIds array cannot be empty');
      }

      if (documentIds.length > 50) {
        strapi.log.warn(`[Strapi Localize] Batch translation validation failed: Batch size ${documentIds.length} exceeds maximum of 50`);
        return ctx.badRequest('Maximum batch size is 50 items');
      }

      // Validate each documentId
      for (const docId of documentIds) {
        const docIdValidation = this.validateDocumentId(docId);
        if (!docIdValidation.valid) {
          return ctx.badRequest(`Invalid documentId '${docId}': ${docIdValidation.error}`);
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

      const translationService = strapi.plugin('strapi-localize').service('translation');

      // Process translations with error boundaries
      const results = await Promise.allSettled(
        documentIds.map(docId =>
          translationService
            .translateContent(docId, model, targetLocale, sourceLocale)
            .catch(error => ({
              documentId: docId,
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
              documentId: documentIds[index],
              status: 'failed',
              error: result.value.error
            };
          }
          return {
            documentId: result.value.documentId,
            status: 'success',
            data: result.value
          };
        } else {
          return {
            documentId: documentIds[index],
            status: 'failed',
            error: result.reason?.message || 'Unknown error'
          };
        }
      });

      // Count successes and failures
      const successCount = formattedResults.filter(r => r.status === 'success').length;
      const failureCount = formattedResults.filter(r => r.status === 'failed').length;

      const duration = Date.now() - startTime;
      strapi.log.info(`[Strapi Localize] Batch translation completed: model=${model}, total=${documentIds.length}, successful=${successCount}, failed=${failureCount}, duration=${duration}ms`);

      if (failureCount > 0) {
        const failedIds = formattedResults.filter(r => r.status === 'failed').map(r => r.documentId);
        strapi.log.warn(`[Strapi Localize] Failed translations for documentIds: ${failedIds.join(', ')}`);
      }

      ctx.body = {
        results: formattedResults,
        summary: {
          total: documentIds.length,
          successful: successCount,
          failed: failureCount
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      strapi.log.error(`[Strapi Localize] Batch translation error: model=${model}, count=${documentIds?.length || 0}, duration=${duration}ms, error=${error.message}`);
      ctx.throw(500, error.message || 'Batch translation failed');
    }
  },

  /**
   * Get available DeepL languages
   * GET /admin/strapi-localize/languages
   */
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
