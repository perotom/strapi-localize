'use strict';

module.exports = ({ strapi }) => ({
  async get(ctx) {
    try {
      const settings = await strapi
        .plugin('deepl-translate')
        .service('settings')
        .getSettings();

      ctx.body = settings;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async update(ctx) {
    try {
      const settings = await strapi
        .plugin('deepl-translate')
        .service('settings')
        .updateSettings(ctx.request.body);

      ctx.body = settings;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async getContentTypes(ctx) {
    try {
      const contentTypes = Object.keys(strapi.contentTypes)
        .filter(key => {
          const contentType = strapi.contentTypes[key];
          return (
            contentType.kind === 'collectionType' &&
            !key.startsWith('plugin::') &&
            !key.startsWith('strapi::') &&
            contentType.pluginOptions?.i18n?.localized === true
          );
        })
        .map(key => {
          const contentType = strapi.contentTypes[key];
          const fields = Object.entries(contentType.attributes)
            .filter(([fieldKey, field]) => {
              return (
                field.type === 'string' ||
                field.type === 'text' ||
                field.type === 'richtext' ||
                field.type === 'blocks'
              );
            })
            .map(([fieldKey]) => fieldKey);

          return {
            uid: key,
            displayName: contentType.info?.displayName || key,
            fields,
          };
        });

      ctx.body = contentTypes;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async testConnection(ctx) {
    try {
      const languages = await strapi
        .plugin('deepl-translate')
        .service('deepl')
        .getAvailableLanguages();

      ctx.body = {
        success: true,
        languages,
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
  },
});