'use strict';

/**
 * Relation handler utilities for Strapi v5 localization
 * Key feature: Find localized versions of related documents in target locale
 */

const {
  getAttribute,
  isRelation,
  isComponent,
  isDynamicZone,
  isRepeatable,
} = require('./model-utils');

/**
 * Find the localized version of a related document in the target locale
 * If no localized version exists, returns null (relation will be skipped)
 *
 * @param {object} strapi - Strapi instance
 * @param {string} targetUid - Target content type UID
 * @param {string} documentId - Source document ID
 * @param {string} targetLocale - Target locale code
 * @returns {Promise<object|null>}
 */
const findLocalizedRelation = async (strapi, targetUid, documentId, targetLocale) => {
  if (!documentId) {
    return null;
  }

  try {
    const localizedEntry = await strapi.documents(targetUid).findOne({
      documentId,
      locale: targetLocale,
    });

    if (localizedEntry) {
      strapi.log.debug(`[Strapi Localize] Found localized relation: uid=${targetUid}, documentId=${documentId}, locale=${targetLocale}`);
      return localizedEntry;
    }

    strapi.log.debug(`[Strapi Localize] No localized relation found: uid=${targetUid}, documentId=${documentId}, locale=${targetLocale}`);
    return null;
  } catch (error) {
    strapi.log.warn(`[Strapi Localize] Failed to find localized relation: ${error.message}`);
    return null;
  }
};

/**
 * Process relations in translated data to point to localized versions
 * This is the key function that makes relations work correctly across locales
 *
 * @param {object} strapi - Strapi instance
 * @param {object} data - Translated data object
 * @param {object} sourceData - Original source data (with populated relations)
 * @param {object} modelSchema - Model schema
 * @param {string} targetLocale - Target locale code
 * @returns {Promise<object>} Data with localized relations
 */
const processRelations = async (strapi, data, sourceData, modelSchema, targetLocale) => {
  const result = { ...data };

  if (!modelSchema || !modelSchema.attributes) {
    return result;
  }

  for (const [key, attribute] of Object.entries(modelSchema.attributes)) {
    if (isRelation(attribute)) {
      const sourceValue = sourceData[key];

      if (!sourceValue) {
        continue;
      }

      const targetUid = attribute.target;
      const localizedDocumentIds = [];

      // Handle both single relations and arrays
      const items = Array.isArray(sourceValue) ? sourceValue : [sourceValue];

      for (const item of items) {
        if (!item || typeof item !== 'object') {
          continue;
        }

        const documentId = item.documentId;
        if (!documentId) {
          continue;
        }

        const localizedEntry = await findLocalizedRelation(strapi, targetUid, documentId, targetLocale);

        if (localizedEntry) {
          localizedDocumentIds.push(localizedEntry.documentId);
        }
      }

      // Set the localized relation(s)
      if (localizedDocumentIds.length > 0) {
        if (Array.isArray(sourceValue)) {
          result[key] = localizedDocumentIds;
        } else {
          result[key] = localizedDocumentIds[0];
        }
        strapi.log.debug(`[Strapi Localize] Set localized relation: key=${key}, count=${localizedDocumentIds.length}`);
      } else {
        // No localized versions found - remove the relation
        delete result[key];
        strapi.log.debug(`[Strapi Localize] Removed relation (no localized version): key=${key}`);
      }
    }
  }

  return result;
};

/**
 * Recursively process relations in nested structures (components, dynamic zones)
 *
 * @param {object} strapi - Strapi instance
 * @param {object} data - Data object
 * @param {object} sourceData - Source data
 * @param {object} modelSchema - Model schema
 * @param {string} targetLocale - Target locale
 * @returns {Promise<object>}
 */
const processRelationsDeep = async (strapi, data, sourceData, modelSchema, targetLocale) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  let result = { ...data };

  // Process top-level relations
  result = await processRelations(strapi, result, sourceData, modelSchema, targetLocale);

  if (!modelSchema || !modelSchema.attributes) {
    return result;
  }

  // Process nested structures (components, dynamic zones)
  for (const [key, attribute] of Object.entries(modelSchema.attributes)) {
    if (!result[key] || !sourceData[key]) {
      continue;
    }

    if (isComponent(attribute)) {
      const componentSchema = strapi.components[attribute.component];
      if (!componentSchema) {
        continue;
      }

      if (isRepeatable(attribute)) {
        // Repeatable component (array)
        const processedItems = [];
        const sourceItems = Array.isArray(sourceData[key]) ? sourceData[key] : [];
        const dataItems = Array.isArray(result[key]) ? result[key] : [];

        for (let i = 0; i < dataItems.length; i++) {
          const sourceItem = sourceItems[i] || {};
          const processedItem = await processRelationsDeep(
            strapi,
            dataItems[i],
            sourceItem,
            componentSchema,
            targetLocale
          );
          processedItems.push(processedItem);
        }
        result[key] = processedItems;
      } else {
        // Single component
        result[key] = await processRelationsDeep(
          strapi,
          result[key],
          sourceData[key],
          componentSchema,
          targetLocale
        );
      }
    } else if (isDynamicZone(attribute)) {
      // Dynamic zone (array of mixed components)
      const processedItems = [];
      const sourceItems = Array.isArray(sourceData[key]) ? sourceData[key] : [];
      const dataItems = Array.isArray(result[key]) ? result[key] : [];

      for (let i = 0; i < dataItems.length; i++) {
        const item = dataItems[i];
        const sourceItem = sourceItems[i] || {};

        if (item && item.__component) {
          const componentSchema = strapi.components[item.__component];
          if (componentSchema) {
            const processedItem = await processRelationsDeep(
              strapi,
              item,
              sourceItem,
              componentSchema,
              targetLocale
            );
            processedItems.push(processedItem);
          } else {
            processedItems.push(item);
          }
        } else {
          processedItems.push(item);
        }
      }
      result[key] = processedItems;
    }
  }

  return result;
};

module.exports = {
  findLocalizedRelation,
  processRelations,
  processRelationsDeep,
};
