'use strict';

/**
 * Model utility functions for schema introspection
 * Based on reference implementation patterns
 */

/**
 * Get attribute definition from model schema
 * @param {object} model - Model schema object
 * @param {string} attribute - Attribute name
 * @returns {object|undefined}
 */
const getAttribute = (model, attribute) => {
  if (!model || !model.attributes) {
    return undefined;
  }
  return model.attributes[attribute];
};

/**
 * Check if attribute is a component type
 * @param {object} attributeObj - Attribute definition
 * @returns {boolean}
 */
const isComponent = (attributeObj) => {
  return attributeObj?.type === 'component';
};

/**
 * Check if attribute is a dynamic zone type
 * @param {object} attributeObj - Attribute definition
 * @returns {boolean}
 */
const isDynamicZone = (attributeObj) => {
  return attributeObj?.type === 'dynamiczone';
};

/**
 * Check if component is repeatable
 * @param {object} attributeObj - Attribute definition
 * @returns {boolean}
 */
const isRepeatable = (attributeObj) => {
  return isComponent(attributeObj) && !!attributeObj.repeatable;
};

/**
 * Check if attribute is a relation (excluding media/file uploads)
 * @param {object} attributeObj - Attribute definition
 * @returns {boolean}
 */
const isRelation = (attributeObj) => {
  return attributeObj?.type === 'relation' && attributeObj?.target !== 'plugin::upload.file';
};

/**
 * Check if attribute is a media/file type
 * @param {object} attributeObj - Attribute definition
 * @returns {boolean}
 */
const isMedia = (attributeObj) => {
  return attributeObj?.type === 'media' ||
         (attributeObj?.type === 'relation' && attributeObj?.target === 'plugin::upload.file');
};

/**
 * Check if attribute type is translatable (string content)
 * @param {object} attributeObj - Attribute definition
 * @returns {boolean}
 */
const isTranslatable = (attributeObj) => {
  const translatableTypes = ['string', 'text', 'richtext', 'blocks'];
  return translatableTypes.includes(attributeObj?.type);
};

/**
 * Get model schema by UID
 * @param {object} strapi - Strapi instance
 * @param {string} uid - Content type UID
 * @returns {object|undefined}
 */
const getModel = (strapi, uid) => {
  // Try content types first
  if (strapi.contentTypes[uid]) {
    return strapi.contentTypes[uid];
  }
  // Try components
  if (strapi.components[uid]) {
    return strapi.components[uid];
  }
  return undefined;
};

/**
 * Check if content type is localizable (has i18n enabled)
 * @param {object} model - Model schema
 * @returns {boolean}
 */
const isLocalizable = (model) => {
  return model?.pluginOptions?.i18n?.localized === true;
};

/**
 * Check if content type is a user-defined content type (not system/plugin)
 * @param {string} uid - Content type UID
 * @returns {boolean}
 */
const isUserContentType = (uid) => {
  return !uid.startsWith('plugin::') && !uid.startsWith('strapi::') && !uid.startsWith('admin::');
};

/**
 * Get all attributes that should be populated for translation
 * @param {object} model - Model schema
 * @returns {Array<string>}
 */
const getPopulatableAttributes = (model) => {
  if (!model || !model.attributes) {
    return [];
  }

  const populatable = [];
  for (const [key, attr] of Object.entries(model.attributes)) {
    if (isComponent(attr) || isDynamicZone(attr) || isRelation(attr) || isMedia(attr)) {
      populatable.push(key);
    }
  }
  return populatable;
};

module.exports = {
  getAttribute,
  isComponent,
  isDynamicZone,
  isRepeatable,
  isRelation,
  isMedia,
  isTranslatable,
  getModel,
  isLocalizable,
  isUserContentType,
  getPopulatableAttributes,
};
