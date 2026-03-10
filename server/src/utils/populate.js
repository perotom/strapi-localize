'use strict';

/**
 * Deep populate utilities for Strapi v5
 * Based on reference implementation and strapi-plugin-populate-deep patterns
 */

const DEFAULT_MAX_DEPTH = 10;
const DEFAULT_DEPTH = 6;

/**
 * Get model attributes, excluding 'related' field for upload files
 * @param {object} model - Model schema
 * @returns {object}
 */
const getModelPopulationAttributes = (model) => {
  if (model.uid === 'plugin::upload.file') {
    const { related, ...attributes } = model.attributes;
    return attributes;
  }
  return model.attributes;
};

/**
 * Build a full populate object for downloading/fetching content
 * Includes relations at depth 1 for finding localized versions
 *
 * @param {object} strapi - Strapi instance
 * @param {string} modelUid - Content type UID
 * @param {number} maxDepth - Maximum recursion depth
 * @param {Array<string>} ignore - Fields to ignore
 * @returns {object|boolean}
 */
const buildPopulateObject = (strapi, modelUid, maxDepth = DEFAULT_DEPTH, ignore = ['localizations', 'createdBy', 'updatedBy']) => {
  if (maxDepth <= 1) {
    return true;
  }

  if (modelUid === 'admin::user') {
    return undefined;
  }

  const populate = {};
  const model = strapi.getModel(modelUid);

  if (!model) {
    return undefined;
  }

  // Add collection name to ignore list to prevent circular references
  if (ignore && !ignore.includes(model.collectionName)) {
    ignore.push(model.collectionName);
  }

  const attributes = getModelPopulationAttributes(model);

  for (const [key, value] of Object.entries(attributes)) {
    if (ignore?.includes(key)) continue;

    if (value.type === 'component') {
      const componentPopulate = buildPopulateObject(strapi, value.component, maxDepth - 1, ignore);
      if (componentPopulate) {
        populate[key] = componentPopulate;
      }
    } else if (value.type === 'dynamiczone') {
      // Dynamic zones need special 'on' syntax in Strapi v5
      const dynamicPopulate = {};
      for (const componentName of value.components || []) {
        const componentPop = buildPopulateObject(strapi, componentName, maxDepth - 1, ignore);
        if (componentPop) {
          dynamicPopulate[componentName] = componentPop;
        }
      }
      populate[key] = Object.keys(dynamicPopulate).length > 0
        ? { on: dynamicPopulate }
        : true;
    } else if (value.type === 'relation') {
      // Relations: populate only 1 level deep to get documentId for localized lookup
      const relationPopulate = buildPopulateObject(strapi, value.target, 1, ignore);
      if (relationPopulate) {
        populate[key] = relationPopulate;
      }
    } else if (value.type === 'media') {
      populate[key] = true;
    }
  }

  return Object.keys(populate).length > 0 ? { populate } : true;
};

/**
 * Build a populate object for uploading/reading source content
 * Excludes relations (only needs IDs, not full population)
 *
 * @param {object} strapi - Strapi instance
 * @param {string} modelUid - Content type UID
 * @param {number} maxDepth - Maximum recursion depth
 * @param {Array<string>} ignore - Fields to ignore
 * @returns {object|boolean}
 */
const buildUploadPopulateObject = (strapi, modelUid, maxDepth = DEFAULT_DEPTH, ignore = ['localizations', 'createdBy', 'updatedBy']) => {
  if (maxDepth <= 1) {
    return true;
  }

  if (modelUid === 'admin::user') {
    return undefined;
  }

  const populate = {};
  const model = strapi.getModel(modelUid);

  if (!model) {
    return undefined;
  }

  if (ignore && !ignore.includes(model.collectionName)) {
    ignore.push(model.collectionName);
  }

  const attributes = getModelPopulationAttributes(model);

  for (const [key, value] of Object.entries(attributes)) {
    if (ignore?.includes(key)) continue;

    if (value.type === 'component') {
      const componentPopulate = buildUploadPopulateObject(strapi, value.component, maxDepth - 1, ignore);
      if (componentPopulate) {
        populate[key] = componentPopulate;
      }
    } else if (value.type === 'dynamiczone') {
      const dynamicPopulate = {};
      for (const componentName of value.components || []) {
        const componentPop = buildUploadPopulateObject(strapi, componentName, maxDepth - 1, ignore);
        if (componentPop) {
          dynamicPopulate[componentName] = componentPop;
        }
      }
      populate[key] = Object.keys(dynamicPopulate).length > 0
        ? { on: dynamicPopulate }
        : true;
    } else if (value.type === 'relation') {
      // For upload: just get relation IDs, minimal population
      populate[key] = true;
    } else if (value.type === 'media') {
      populate[key] = true;
    }
  }

  return Object.keys(populate).length > 0 ? { populate } : true;
};

/**
 * Merge two populate objects deeply
 * @param {object} target - Target object
 * @param {object} source - Source object
 * @returns {object}
 */
const mergePopulate = (target, source) => {
  if (typeof source !== 'object' || source === null) {
    return source;
  }

  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = mergePopulate(result[key] || {}, value);
    } else {
      result[key] = value;
    }
  }

  return result;
};

module.exports = {
  buildPopulateObject,
  buildUploadPopulateObject,
  mergePopulate,
  DEFAULT_DEPTH,
  DEFAULT_MAX_DEPTH,
};
