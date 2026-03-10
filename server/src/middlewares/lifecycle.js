'use strict';

/**
 * Lifecycle middleware for automatic translation
 * Uses Strapi v5 Documents API patterns
 */

module.exports = ({ strapi }) => {
  // Track entries being translated to prevent infinite loops
  // Using documentId:locale format for v5
  const translatingEntries = new Set();

  /**
   * Handle translation on content create/update
   * @param {object} event - Strapi lifecycle event
   */
  const translateOnUpdate = async (event) => {
    const { model, result } = event;

    // In v5, result contains the created/updated document
    if (!result || !result.documentId) {
      strapi.log.debug(`[Strapi Localize] Lifecycle hook: no result or documentId`);
      return;
    }

    const documentId = result.documentId;
    const currentLocale = result.locale;

    strapi.log.debug(`[Strapi Localize] Lifecycle hook triggered: model=${model.uid}, documentId=${documentId}, locale=${currentLocale}`);

    // Prevent infinite loop: Check if this entry is being created by our translation process
    const entryKey = `${model.uid}:${documentId}:${currentLocale}`;
    if (translatingEntries.has(entryKey)) {
      strapi.log.debug(`[Strapi Localize] Skipping - entry is being translated: ${entryKey}`);
      return;
    }

    // Get settings
    const settings = await strapi
      .plugin('strapi-localize')
      .service('settings')
      .getSettings();

    if (!settings.autoTranslate) {
      strapi.log.debug(`[Strapi Localize] Auto-translate disabled globally: model=${model.uid}, documentId=${documentId}`);
      return;
    }

    const contentTypeSettings = settings.contentTypes?.[model.uid];
    if (!contentTypeSettings?.enabled || !contentTypeSettings?.autoTranslate) {
      strapi.log.debug(`[Strapi Localize] Auto-translate not enabled for content type: model=${model.uid}`);
      return;
    }

    // Check if content type is localized
    const modelSchema = strapi.getModel(model.uid);
    if (!modelSchema.pluginOptions?.i18n?.localized) {
      strapi.log.debug(`[Strapi Localize] Content type not localized: model=${model.uid}`);
      return;
    }

    // Get i18n service for locale operations
    const i18nService = strapi.plugin('strapi-localize').service('i18n');

    // Get target locales (all locales except current)
    const allLocales = await i18nService.getLocales();
    const targetLocales = allLocales.filter(l => l.code !== currentLocale);

    if (targetLocales.length === 0) {
      strapi.log.debug(`[Strapi Localize] No target locales available: model=${model.uid}, documentId=${documentId}`);
      return;
    }

    // Check if this is a source entry (not a translation)
    // In v5, we check if entry exists in other locales
    const existingLocalizations = [];
    for (const locale of allLocales) {
      if (locale.code === currentLocale) continue;
      const existing = await i18nService.getExistingLocalization(model.uid, documentId, locale.code);
      if (existing) {
        existingLocalizations.push(locale.code);
      }
    }

    // If this entry already has localizations, it might be the source
    // If it doesn't, check if there's a source in another locale that we're updating
    // For now, we translate from the current entry to all missing locales
    const localesNeedingTranslation = targetLocales.filter(
      l => !existingLocalizations.includes(l.code)
    );

    // If all locales already exist, this might be an update - we can re-translate
    const localesToTranslate = localesNeedingTranslation.length > 0
      ? localesNeedingTranslation
      : targetLocales;

    strapi.log.info(`[Strapi Localize] Auto-translate triggered: model=${model.uid}, documentId=${documentId}, source=${currentLocale}, targets=[${localesToTranslate.map(l => l.code).join(', ')}]`);

    let successCount = 0;
    let failCount = 0;

    const translationService = strapi.plugin('strapi-localize').service('translation');

    for (const targetLocale of localesToTranslate) {
      // Mark this entry as being translated (with target locale)
      const targetEntryKey = `${model.uid}:${documentId}:${targetLocale.code}`;
      translatingEntries.add(targetEntryKey);

      try {
        await translationService.translateContent(
          documentId,
          model.uid,
          targetLocale.code,
          currentLocale
        );

        strapi.log.info(
          `[Strapi Localize] Auto-translation successful: model=${model.uid}, documentId=${documentId}, source=${currentLocale}, target=${targetLocale.code}`
        );
        successCount++;
      } catch (error) {
        strapi.log.error(
          `[Strapi Localize] Auto-translation failed: model=${model.uid}, documentId=${documentId}, target=${targetLocale.code}, error=${error.message}`
        );
        failCount++;
      } finally {
        // Remove from tracking after translation attempt
        translatingEntries.delete(targetEntryKey);
      }
    }

    strapi.log.info(`[Strapi Localize] Auto-translate completed: model=${model.uid}, documentId=${documentId}, successful=${successCount}, failed=${failCount}`);
  };

  /**
   * Mark an entry as being translated (for external use)
   * @param {string} uid - Content type UID
   * @param {string} documentId - Document ID
   * @param {string} locale - Target locale
   */
  const markAsTranslating = (uid, documentId, locale) => {
    const key = `${uid}:${documentId}:${locale}`;
    translatingEntries.add(key);
    return key;
  };

  /**
   * Unmark an entry as being translated
   * @param {string} key - Entry key from markAsTranslating
   */
  const unmarkAsTranslating = (key) => {
    translatingEntries.delete(key);
  };

  /**
   * Check if an entry is currently being translated
   * @param {string} uid - Content type UID
   * @param {string} documentId - Document ID
   * @param {string} locale - Target locale
   * @returns {boolean}
   */
  const isTranslating = (uid, documentId, locale) => {
    const key = `${uid}:${documentId}:${locale}`;
    return translatingEntries.has(key);
  };

  return {
    translateOnUpdate,
    markAsTranslating,
    unmarkAsTranslating,
    isTranslating,
  };
};
