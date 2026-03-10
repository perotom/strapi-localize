'use strict';

/**
 * Translation Service
 * Handles content translation using Strapi v5 Documents API
 * Based on reference implementation patterns
 */

const { buildPopulateObject } = require('../utils/populate');
const { processRelationsDeep } = require('../utils/relation-handler');
const {
  isComponent,
  isDynamicZone,
  isTranslatable,
  isMedia,
  isRelation,
} = require('../utils/model-utils');

module.exports = ({ strapi }) => ({
  /**
   * Translate content from source locale to target locale
   * Uses Documents API (v5 pattern)
   *
   * @param {string} documentId - Document ID to translate
   * @param {string} uid - Content type UID
   * @param {string} targetLocale - Target locale code
   * @param {string} sourceLocale - Source locale code (optional)
   * @returns {Promise<object>} Translated entry
   */
  async translateContent(documentId, uid, targetLocale, sourceLocale = null) {
    const startTime = Date.now();
    strapi.log.info(`[Strapi Localize] Starting translation: uid=${uid}, documentId=${documentId}, source=${sourceLocale || 'auto'}, target=${targetLocale}`);

    // Get services
    const i18nService = strapi.plugin('strapi-localize').service('i18n');
    const deeplService = strapi.plugin('strapi-localize').service('deepl');
    const settingsService = strapi.plugin('strapi-localize').service('settings');

    // Get model schema
    const modelSchema = strapi.getModel(uid);
    if (!modelSchema) {
      throw new Error(`Model schema not found: ${uid}`);
    }

    // Determine source locale
    const effectiveSourceLocale = sourceLocale || await i18nService.getDefaultLocaleCode();

    // Build populate strategy for v5
    const populateStrategy = buildPopulateObject(strapi, uid);
    strapi.log.debug(`[Strapi Localize] Populate strategy: ${JSON.stringify(populateStrategy).substring(0, 300)}...`);

    // Fetch source entry using Documents API
    const sourceEntry = await strapi.documents(uid).findOne({
      documentId,
      locale: effectiveSourceLocale,
      ...populateStrategy,
    });

    if (!sourceEntry) {
      throw new Error(`Entry not found: uid=${uid}, documentId=${documentId}, locale=${effectiveSourceLocale}`);
    }

    strapi.log.debug(`[Strapi Localize] Fetched source entry: documentId=${sourceEntry.documentId}`);

    // Get settings for ignored fields
    const settings = await settingsService.getSettings();
    const contentTypeConfig = settings?.contentTypes?.[uid] || {};
    const ignoredFields = contentTypeConfig.ignoredFields || [];

    // System fields to always ignore
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

    const allFieldsToIgnore = [...new Set([...systemFields, ...ignoredFields])];

    // Translate the content
    const translatedData = await this.translateObject(
      deeplService,
      sourceEntry,
      targetLocale,
      effectiveSourceLocale,
      allFieldsToIgnore,
      modelSchema
    );

    // Process relations to point to localized versions (key v5 feature!)
    const dataWithLocalizedRelations = await processRelationsDeep(
      strapi,
      translatedData,
      sourceEntry,
      modelSchema,
      targetLocale
    );

    // Clean system fields
    const cleanedData = i18nService.omitSystemFields(dataWithLocalizedRelations);

    // Remove documentId from nested objects (except media)
    const finalData = i18nService.dropDocumentIdExceptMedia(cleanedData);

    // Check if translation already exists
    const existingTranslation = await i18nService.getExistingLocalization(uid, documentId, targetLocale);

    let result;
    if (existingTranslation) {
      // Update existing translation
      strapi.log.debug(`[Strapi Localize] Updating existing translation: documentId=${documentId}`);
      result = await i18nService.updateLocalization(uid, documentId, finalData, targetLocale);
    } else {
      // Create new translation
      strapi.log.debug(`[Strapi Localize] Creating new translation: documentId=${documentId}`);
      result = await i18nService.createLocalization(uid, sourceEntry, finalData, targetLocale);
    }

    const duration = Date.now() - startTime;
    strapi.log.info(`[Strapi Localize] Translation completed: uid=${uid}, documentId=${documentId}, target=${targetLocale}, duration=${duration}ms`);

    return result;
  },

  /**
   * Recursively translate an object's translatable fields
   *
   * @param {object} deeplService - DeepL service instance
   * @param {object} obj - Object to translate
   * @param {string} targetLang - Target language code
   * @param {string} sourceLang - Source language code
   * @param {Array<string>} fieldsToIgnore - Fields to skip
   * @param {object} modelSchema - Model schema
   * @returns {Promise<object>} Translated object
   */
  async translateObject(deeplService, obj, targetLang, sourceLang, fieldsToIgnore, modelSchema) {
    const translated = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip ignored fields and system/internal fields
      if (fieldsToIgnore.includes(key) || ['id', '__component', '__typename', 'documentId'].includes(key)) {
        translated[key] = value;
        continue;
      }

      // Get field schema
      const fieldSchema = modelSchema?.attributes?.[key];

      // Handle different field types
      if (this.shouldTranslateField(value, fieldSchema)) {
        // Translate string fields
        translated[key] = await deeplService.translate(value, targetLang, sourceLang);
      } else if (Array.isArray(value)) {
        // Handle arrays (components, dynamic zones, relations, string arrays)
        translated[key] = await this.translateArray(
          deeplService,
          value,
          targetLang,
          sourceLang,
          fieldsToIgnore,
          fieldSchema
        );
      } else if (typeof value === 'object' && value !== null) {
        // Handle objects (components, relations, nested structures)
        translated[key] = await this.translateNestedObject(
          deeplService,
          value,
          targetLang,
          sourceLang,
          fieldsToIgnore,
          fieldSchema
        );
      } else {
        // Primitive value, copy as-is
        translated[key] = value;
      }
    }

    return translated;
  },

  /**
   * Check if a field should be translated
   */
  shouldTranslateField(value, fieldSchema) {
    if (typeof value !== 'string' || !value.trim()) {
      return false;
    }

    if (fieldSchema) {
      return isTranslatable(fieldSchema);
    }

    // Fallback: translate strings if no schema
    return true;
  },

  /**
   * Translate an array field
   */
  async translateArray(deeplService, array, targetLang, sourceLang, fieldsToIgnore, fieldSchema) {
    const results = [];

    for (const item of array) {
      if (typeof item === 'string') {
        // String array
        results.push(await deeplService.translate(item, targetLang, sourceLang));
      } else if (typeof item === 'object' && item !== null) {
        if (item.__component) {
          // Component in dynamic zone or repeatable component
          const componentSchema = strapi.components[item.__component];
          if (componentSchema) {
            const translated = await this.translateObject(
              deeplService,
              item,
              targetLang,
              sourceLang,
              fieldsToIgnore,
              componentSchema
            );
            results.push(translated);
          } else {
            results.push(item);
          }
        } else if (item.documentId && !item.__component) {
          // Relation - preserve as-is, will be processed by relation handler
          results.push(item);
        } else {
          // Other object
          results.push(item);
        }
      } else {
        results.push(item);
      }
    }

    return results;
  },

  /**
   * Translate a nested object field
   */
  async translateNestedObject(deeplService, obj, targetLang, sourceLang, fieldsToIgnore, fieldSchema) {
    // Component (has __component)
    if (obj.__component) {
      const componentSchema = strapi.components[obj.__component];
      if (componentSchema) {
        return await this.translateObject(
          deeplService,
          obj,
          targetLang,
          sourceLang,
          fieldsToIgnore,
          componentSchema
        );
      }
      return obj;
    }

    // Relation (has documentId)
    if (obj.documentId && !obj.__component) {
      // Preserve relation as-is, will be processed by relation handler
      return obj;
    }

    // Media (has mime or url or provider)
    if (obj.mime || obj.url || obj.provider) {
      return obj;
    }

    // Schema-defined component
    if (fieldSchema && isComponent(fieldSchema)) {
      const componentSchema = strapi.components[fieldSchema.component];
      if (componentSchema) {
        return await this.translateObject(
          deeplService,
          obj,
          targetLang,
          sourceLang,
          fieldsToIgnore,
          componentSchema
        );
      }
    }

    // Default: recurse with same schema
    if (fieldSchema && typeof obj === 'object') {
      return await this.translateObject(
        deeplService,
        obj,
        targetLang,
        sourceLang,
        fieldsToIgnore,
        fieldSchema
      );
    }

    return obj;
  },
});
