'use strict';

/**
 * Plugin bootstrap
 * Initializes lifecycle hooks for automatic translation
 * Uses Strapi v5 lifecycle patterns with event-based decoupling
 */

module.exports = async ({ strapi }) => {
  strapi.log.info('[Strapi Localize] Plugin initializing...');

  // Track recent translations to prevent duplicates
  const recentTranslations = new Map();
  const DEBOUNCE_MS = 5000;
  const TRANSLATION_EVENT = 'strapi-localize.translate';

  /**
   * Handle translation event - runs completely outside lifecycle context
   */
  strapi.eventHub.on(TRANSLATION_EVENT, async (data) => {
    const { uid, documentId, locale } = data;
    const translationKey = `${uid}:${documentId}:${locale}`;

    strapi.log.debug(`[Strapi Localize] Received translation event: ${translationKey}`);

    try {
      const translationService = strapi.plugin('strapi-localize').service('translation');
      const settingsService = strapi.plugin('strapi-localize').service('settings');
      const i18nService = strapi.plugin('strapi-localize').service('i18n');

      // Get fresh settings
      const settings = await settingsService.getSettings();
      if (!settings.autoTranslate) {
        strapi.log.debug(`[Strapi Localize] Auto-translate disabled globally`);
        return;
      }

      const contentTypeSettings = settings.contentTypes?.[uid];
      if (!contentTypeSettings?.enabled || !contentTypeSettings?.autoTranslate) {
        strapi.log.debug(`[Strapi Localize] Auto-translate not enabled for ${uid}`);
        return;
      }

      // Get all target locales
      const allLocales = await i18nService.getLocales();
      const targetLocales = allLocales.filter(l => l.code !== locale);

      if (targetLocales.length === 0) {
        return;
      }

      strapi.log.info(`[Strapi Localize] Auto-translate starting: model=${uid}, documentId=${documentId}, source=${locale}, targets=[${targetLocales.map(l => l.code).join(', ')}]`);

      let successCount = 0;
      let failCount = 0;

      for (const targetLocale of targetLocales) {
        try {
          await translationService.translateContent(
            documentId,
            uid,
            targetLocale.code,
            locale
          );
          strapi.log.info(`[Strapi Localize] Auto-translation successful: target=${targetLocale.code}`);
          successCount++;
        } catch (error) {
          strapi.log.error(`[Strapi Localize] Auto-translation failed: target=${targetLocale.code}, error=${error.message}`);
          failCount++;
        }
      }

      strapi.log.info(`[Strapi Localize] Auto-translate completed: successful=${successCount}, failed=${failCount}`);
    } catch (error) {
      strapi.log.error(`[Strapi Localize] Translation event error: ${error.message}`);
    }
  });

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

    // Emit event after a delay to ensure the transaction is fully committed
    // The event handler runs in a completely separate context
    setTimeout(() => {
      strapi.eventHub.emit(TRANSLATION_EVENT, {
        uid: cleanEvent.model.uid,
        documentId: cleanEvent.result.documentId,
        locale: cleanEvent.result.locale,
      });
    }, 3000);
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
