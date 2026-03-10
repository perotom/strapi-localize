'use strict';

/**
 * Plugin bootstrap
 * Initializes lifecycle hooks for automatic translation
 * Uses Strapi v5 lifecycle patterns
 */

module.exports = async ({ strapi }) => {
  strapi.log.info('[Strapi Localize] Plugin initializing...');

  const lifecycleMiddleware = require('./middlewares/lifecycle')({ strapi });

  // Find all localizable content types (both collection and single types)
  const localizableModels = Object.keys(strapi.contentTypes).filter(key => {
    const contentType = strapi.contentTypes[key];
    return (
      // Include both collection types and single types
      (contentType.kind === 'collectionType' || contentType.kind === 'singleType') &&
      // Exclude system/plugin content types
      !key.startsWith('plugin::') &&
      !key.startsWith('strapi::') &&
      !key.startsWith('admin::') &&
      // Must have i18n enabled
      contentType.pluginOptions?.i18n?.localized === true
    );
  });

  strapi.log.info(`[Strapi Localize] Found ${localizableModels.length} localizable content types`);

  if (localizableModels.length > 0) {
    strapi.log.debug(`[Strapi Localize] Localizable models: ${localizableModels.join(', ')}`);
  }

  // Subscribe to lifecycle events for localizable models
  // In Strapi v5, we use afterCreate and afterUpdate with result containing documentId
  strapi.db.lifecycles.subscribe({
    models: localizableModels,

    /**
     * After content is created
     * Delay translation to allow Strapi to finish processing
     */
    async afterCreate(event) {
      // Use setTimeout to allow Strapi to complete its operations
      setTimeout(() => {
        lifecycleMiddleware.translateOnUpdate(event).catch(error => {
          strapi.log.error(`[Strapi Localize] Error in afterCreate hook: ${error.message}`);
        });
      }, 1000);
    },

    /**
     * After content is updated
     * Delay translation to allow Strapi to finish processing
     */
    async afterUpdate(event) {
      setTimeout(() => {
        lifecycleMiddleware.translateOnUpdate(event).catch(error => {
          strapi.log.error(`[Strapi Localize] Error in afterUpdate hook: ${error.message}`);
        });
      }, 1000);
    },
  });

  strapi.log.info('[Strapi Localize] Plugin initialized successfully');
};
