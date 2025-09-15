'use strict';

module.exports = async ({ strapi }) => {
  const lifecycleMiddleware = require('./middlewares/lifecycle')({ strapi });

  strapi.db.lifecycles.subscribe({
    models: Object.keys(strapi.contentTypes).filter(key => {
      const contentType = strapi.contentTypes[key];
      return (
        contentType.kind === 'collectionType' &&
        !key.startsWith('plugin::') &&
        !key.startsWith('strapi::') &&
        contentType.pluginOptions?.i18n?.localized === true
      );
    }),

    async afterCreate(event) {
      setTimeout(() => lifecycleMiddleware.translateOnUpdate(event), 1000);
    },

    async afterUpdate(event) {
      setTimeout(() => lifecycleMiddleware.translateOnUpdate(event), 1000);
    },
  });
};