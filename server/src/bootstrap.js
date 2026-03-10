'use strict';

/**
 * Plugin bootstrap
 * Initializes lifecycle hooks for automatic translation
 * Uses queue-based approach to avoid SQLite transaction conflicts
 */

module.exports = async ({ strapi }) => {
  strapi.log.info('[Strapi Localize] Plugin initializing...');

  // Translation queue - processed by interval
  const translationQueue = [];
  const processingSet = new Set();
  const QUEUE_PROCESS_INTERVAL = 5000; // Process queue every 5 seconds

  // Track recent translations to prevent duplicates
  const recentTranslations = new Map();
  const DEBOUNCE_MS = 10000;

  /**
   * Process translation queue - runs on interval, completely outside any request context
   */
  const processQueue = async () => {
    if (translationQueue.length === 0) {
      return;
    }

    // Get next item
    const item = translationQueue.shift();
    if (!item) return;

    const { uid, documentId, sourceLocale, queuedAt } = item;
    const translationKey = `${uid}:${documentId}`;

    // Skip if already processing
    if (processingSet.has(translationKey)) {
      strapi.log.debug(`[Strapi Localize] Already processing: ${translationKey}`);
      return;
    }

    processingSet.add(translationKey);

    try {
      strapi.log.info(`[Strapi Localize] Processing queued translation: ${translationKey} (source: ${sourceLocale})`);

      const translationService = strapi.plugin('strapi-localize').service('translation');
      const settingsService = strapi.plugin('strapi-localize').service('settings');
      const i18nService = strapi.plugin('strapi-localize').service('i18n');

      // Get settings
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

      // Get all target locales (all locales except the source/default locale)
      const allLocales = await i18nService.getLocales();
      const targetLocales = allLocales.filter(l => l.code !== sourceLocale);

      if (targetLocales.length === 0) {
        return;
      }

      strapi.log.info(`[Strapi Localize] Auto-translate starting: model=${uid}, documentId=${documentId}, source=${sourceLocale}, targets=[${targetLocales.map(l => l.code).join(', ')}]`);

      let successCount = 0;
      let failCount = 0;

      for (const targetLocale of targetLocales) {
        try {
          await translationService.translateContent(
            documentId,
            uid,
            targetLocale.code,
            sourceLocale  // Always translate FROM the default/source locale
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
      strapi.log.error(`[Strapi Localize] Queue processing error: ${error.message}`);
    } finally {
      processingSet.delete(translationKey);
    }
  };

  // Start queue processor
  setInterval(processQueue, QUEUE_PROCESS_INTERVAL);
  strapi.log.info(`[Strapi Localize] Translation queue processor started (interval: ${QUEUE_PROCESS_INTERVAL}ms)`);

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

  // Cache for default locale (fetched once at startup)
  let defaultLocale = null;

  // Get default locale on startup
  const initDefaultLocale = async () => {
    try {
      defaultLocale = await strapi.plugin('i18n').service('locales').getDefaultLocale();
      strapi.log.info(`[Strapi Localize] Default locale: ${defaultLocale}`);
    } catch (error) {
      strapi.log.error(`[Strapi Localize] Failed to get default locale: ${error.message}`);
      defaultLocale = 'en'; // Fallback
    }
  };

  // Initialize default locale
  initDefaultLocale();

  /**
   * Schedule translation outside of the database transaction context
   * Only triggers when the DEFAULT locale is edited
   */
  const scheduleTranslation = (event, hookType) => {
    const { model, result } = event;

    if (!result || !result.documentId) {
      return;
    }

    const editedLocale = result.locale;

    // IMPORTANT: Only translate when the SOURCE (default) locale is edited
    // Editing translations should NOT trigger re-translation
    if (editedLocale !== defaultLocale) {
      strapi.log.debug(`[Strapi Localize] Skipping ${hookType} - edited locale '${editedLocale}' is not the default locale '${defaultLocale}'`);
      return;
    }

    const translationKey = `${model.uid}:${result.documentId}`;

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

    strapi.log.info(`[Strapi Localize] Queuing translation from ${hookType}: ${translationKey} (source: ${defaultLocale})`);

    // Add to queue - will be processed by the interval-based processor
    // Always use defaultLocale as the source
    translationQueue.push({
      uid: model.uid,
      documentId: result.documentId,
      sourceLocale: defaultLocale,
      queuedAt: Date.now(),
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
