'use strict';

module.exports = ({ strapi }) => ({
  async translate(ctx) {
    try {
      const { id, model, targetLocale, sourceLocale } = ctx.request.body;

      if (!id || !model || !targetLocale) {
        return ctx.badRequest('Missing required parameters');
      }

      const result = await strapi
        .plugin('deepl-translate')
        .service('deepl')
        .translateContent(id, model, targetLocale, sourceLocale);

      ctx.body = result;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async translateBatch(ctx) {
    try {
      const { ids, model, targetLocale, sourceLocale } = ctx.request.body;

      if (!ids || !model || !targetLocale) {
        return ctx.badRequest('Missing required parameters');
      }

      const results = await Promise.all(
        ids.map(id =>
          strapi
            .plugin('deepl-translate')
            .service('deepl')
            .translateContent(id, model, targetLocale, sourceLocale)
        )
      );

      ctx.body = results;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async getLanguages(ctx) {
    try {
      const languages = await strapi
        .plugin('deepl-translate')
        .service('deepl')
        .getAvailableLanguages();

      ctx.body = languages;
    } catch (error) {
      ctx.throw(500, error);
    }
  },
});