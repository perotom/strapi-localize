'use strict';

/**
 * Strapi i18n Service
 * Handles locale management and document creation/update following Strapi v5 patterns
 * Based on reference implementation patterns
 */
module.exports = ({ strapi }) => ({
  /**
   * Get all available locales from Strapi i18n plugin
   * @returns {Promise<Array>} Array of locale objects
   */
  async getLocales() {
    return strapi.plugin('i18n').service('locales').find();
  },

  /**
   * Get the default locale code
   * @returns {Promise<string>} Default locale code (e.g., 'en')
   */
  async getDefaultLocaleCode() {
    return strapi.plugin('i18n').service('locales').getDefaultLocale();
  },

  /**
   * Check if a locale exists in Strapi
   * @param {string} localeCode - Locale code to check
   * @returns {Promise<boolean>}
   */
  async localeExists(localeCode) {
    const locales = await this.getLocales();
    return locales.some(l => l.code === localeCode);
  },

  /**
   * Get an entry in a specific locale using Documents API
   * @param {string} uid - Content type UID
   * @param {string} documentId - Document ID
   * @param {string} locale - Target locale
   * @param {object} populate - Population strategy
   * @returns {Promise<object|null>}
   */
  async getEntryInLocale(uid, documentId, locale, populate = '*') {
    try {
      const entry = await strapi.documents(uid).findOne({
        documentId,
        locale,
        populate,
      });
      return entry;
    } catch (error) {
      strapi.log.debug(`[Strapi Localize] Entry not found in locale: uid=${uid}, documentId=${documentId}, locale=${locale}`);
      return null;
    }
  },

  /**
   * Create a localization for an existing entry (v5 Documents API)
   * In Strapi v5, all localizations of a document share the same documentId.
   * We need to pass the documentId when creating to link the localization properly.
   *
   * @param {string} uid - Content type UID
   * @param {object} baseEntry - Source entry (with documentId)
   * @param {object} newEntryData - Translated data
   * @param {string} targetLocale - Target locale code
   * @returns {Promise<object>}
   */
  async createLocalization(uid, baseEntry, newEntryData, targetLocale) {
    try {
      const sourceDocumentId = baseEntry.documentId;
      strapi.log.debug(`[Strapi Localize] Creating localization: uid=${uid}, documentId=${sourceDocumentId}, locale=${targetLocale}`);

      // Check if a localization already exists (prevent duplicates)
      const existingLocalization = await this.getExistingLocalization(uid, sourceDocumentId, targetLocale);
      if (existingLocalization) {
        strapi.log.warn(`[Strapi Localize] Localization already exists, updating instead: uid=${uid}, documentId=${sourceDocumentId}, locale=${targetLocale}`);
        return this.updateLocalization(uid, sourceDocumentId, newEntryData, targetLocale);
      }

      // Remove system fields that should not be copied
      const cleanData = this.omitSystemFields(newEntryData);

      // Set as draft (publishedAt: null)
      cleanData.publishedAt = null;

      // Create the new localization using Documents API
      // Pass documentId to link this localization to the existing document
      const createdEntry = await strapi.documents(uid).create({
        documentId: sourceDocumentId,
        locale: targetLocale,
        data: cleanData,
      });

      strapi.log.info(`[Strapi Localize] Localization created: uid=${uid}, documentId=${createdEntry.documentId}, locale=${targetLocale}`);

      return createdEntry;
    } catch (error) {
      strapi.log.error(`[Strapi Localize] Failed to create localization: ${error.message}`);
      throw error;
    }
  },

  /**
   * Update an existing localization (v5 Documents API)
   * @param {string} uid - Content type UID
   * @param {string} documentId - Document ID to update
   * @param {object} data - Updated data
   * @param {string} locale - Locale of the document
   * @returns {Promise<object>}
   */
  async updateLocalization(uid, documentId, data, locale) {
    try {
      strapi.log.debug(`[Strapi Localize] Updating localization: uid=${uid}, documentId=${documentId}, locale=${locale}`);

      const cleanData = this.omitSystemFields(data);

      const updatedEntry = await strapi.documents(uid).update({
        documentId,
        locale,
        data: cleanData,
      });

      strapi.log.info(`[Strapi Localize] Localization updated: uid=${uid}, documentId=${documentId}, locale=${locale}`);

      return updatedEntry;
    } catch (error) {
      strapi.log.error(`[Strapi Localize] Failed to update localization: ${error.message}`);
      throw error;
    }
  },

  /**
   * Check if a localization exists for a document in a specific locale
   * @param {string} uid - Content type UID
   * @param {string} documentId - Document ID
   * @param {string} locale - Target locale
   * @returns {Promise<object|null>}
   */
  async getExistingLocalization(uid, documentId, locale) {
    try {
      const entry = await strapi.documents(uid).findOne({
        documentId,
        locale,
      });
      return entry;
    } catch (error) {
      return null;
    }
  },

  /**
   * Remove system fields that should not be copied during translation
   * @param {object} data - Data object
   * @returns {object} Cleaned data
   */
  omitSystemFields(data) {
    const systemFields = [
      'id',
      'documentId',
      'createdAt',
      'updatedAt',
      'publishedAt',
      'createdBy',
      'updatedBy',
      'locale',
      'localizations',
    ];

    const cleaned = { ...data };
    for (const field of systemFields) {
      delete cleaned[field];
    }
    return cleaned;
  },

  /**
   * Recursively remove system fields from nested objects
   * @param {object} obj - Object to clean
   * @param {Array<string>} keys - Keys to remove
   * @returns {object} Cleaned object
   */
  omitDeep(obj, keys = ['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy']) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.omitDeep(item, keys));
    }

    if (obj !== null && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        if (keys.includes(key)) {
          continue;
        }
        result[key] = this.omitDeep(value, keys);
      }
      return result;
    }

    return obj;
  },

  /**
   * Remove documentId from all nested objects except media objects
   * Media objects need documentId preserved for proper linking
   * @param {object} obj - Object to process
   * @returns {object} Processed object
   */
  dropDocumentIdExceptMedia(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.dropDocumentIdExceptMedia(item));
    }

    if (obj !== null && typeof obj === 'object') {
      // Check if this is a media object (has mime or url or provider)
      const isMedia = obj.mime || obj.url || obj.provider;

      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'documentId' && !isMedia) {
          continue;
        }
        result[key] = this.dropDocumentIdExceptMedia(value);
      }
      return result;
    }

    return obj;
  },
});
