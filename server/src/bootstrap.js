'use strict';

/**
 * Plugin bootstrap
 * Initializes lifecycle hooks for automatic translation
 * Uses Strapi v5 lifecycle patterns
 */

module.exports = async ({ strapi }) => {
  strapi.log.info('[Strapi Localize] Plugin initializing...');

  const lifecycleMiddleware = require('./middlewares/lifecycle')({ strapi });

  // Track recent translations to prevent duplicates from afterCreate + afterUpdate firing together
  const recentTranslations = new Map();
  const DEBOUNCE_MS = 3000;

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

  /**
   * Schedule translation outside of the database transaction context
   * Creates a clean event object without transaction references
   */
  const scheduleTranslation = (event, hookType) => {
    const { model, result } = event;

    if (!result || !result.documentId) {
      return;
    }

    // Create a clean event copy without transaction references
    const cleanEvent = {
      model: { uid: model.uid },
      result: {
        documentId: result.documentId,
        locale: result.locale,
      },
    };

    const translationKey = `${model.uid}:${result.documentId}:${result.locale}`;

    // Check if we recently scheduled a translation for this entry (debounce)
    const lastTranslation = recentTranslations.get(translationKey);
    if (lastTranslation && Date.now() - lastTranslation < DEBOUNCE_MS) {
      strapi.log.debug(`[Strapi Localize] Debouncing ${hookType} for ${translationKey}`);
      return;
    }

    // Mark as recently scheduled
    recentTranslations.set(translationKey, Date.now());

    // Clean up old entries periodically
    if (recentTranslations.size > 100) {
      const now = Date.now();
      for (const [key, time] of recentTranslations.entries()) {
        if (now - time > DEBOUNCE_MS * 2) {
          recentTranslations.delete(key);
        }
      }
    }

    strapi.log.debug(`[Strapi Localize] Scheduling translation from ${hookType}: ${translationKey}`);

    // Use setImmediate to fully exit the current execution context
    // Then setTimeout to ensure database transaction is fully committed
    setImmediate(() => {
      setTimeout(() => {
        lifecycleMiddleware.translateOnUpdate(cleanEvent).catch(error => {
          strapi.log.error(`[Strapi Localize] Error in ${hookType} hook: ${error.message}`);
        });
      }, 2000);
    });
  };

  // Subscribe to lifecycle events for localizable models
  // In Strapi v5, we use afterCreate and afterUpdate with result containing documentId
  strapi.db.lifecycles.subscribe({
    models: localizableModels,

    /**
     * After content is created
     */
    async afterCreate(event) {
      scheduleTranslation(event, 'afterCreate');
    },

    /**
     * After content is updated
     */
    async afterUpdate(event) {
      scheduleTranslation(event, 'afterUpdate');
    },
  });

  strapi.log.info('[Strapi Localize] Plugin initialized successfully');
};
