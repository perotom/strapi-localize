'use strict';

module.exports = async ({ strapi }) => {
  strapi.log.info('[Strapi Localize] Plugin initializing...');

  const lifecycleMiddleware = require('./middlewares/lifecycle')({ strapi });

  // Find all localizable content types
  const localizableModels = Object.keys(strapi.contentTypes).filter(key => {
    const contentType = strapi.contentTypes[key];
    return (
      contentType.kind === 'collectionType' &&
      !key.startsWith('plugin::') &&
      !key.startsWith('strapi::') &&
      contentType.pluginOptions?.i18n?.localized === true
    );
  });

  strapi.log.info(`[Strapi Localize] Found ${localizableModels.length} localizable content types`);

  if (localizableModels.length > 0) {
    strapi.log.debug(`[Strapi Localize] Localizable models: ${localizableModels.join(', ')}`);
  }

  strapi.db.lifecycles.subscribe({
    models: localizableModels,

    async afterCreate(event) {
      setTimeout(() => lifecycleMiddleware.translateOnUpdate(event), 1000);
    },

    async afterUpdate(event) {
      setTimeout(() => lifecycleMiddleware.translateOnUpdate(event), 1000);
    },
  });

  strapi.log.info('[Strapi Localize] Plugin initialized successfully');
};