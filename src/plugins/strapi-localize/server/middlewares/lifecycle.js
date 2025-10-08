'use strict';

module.exports = ({ strapi }) => {
  const translateOnUpdate = async (event) => {
    const { model, data, where } = event.params;

    const settings = await strapi
      .plugin('strapi-localize')
      .service('settings')
      .getSettings();

    if (!settings.autoTranslate) {
      return;
    }

    const contentTypeSettings = settings.contentTypes?.[model.uid];
    if (!contentTypeSettings?.enabled || !contentTypeSettings?.autoTranslate) {
      return;
    }

    const modelSchema = strapi.getModel(model.uid);
    if (!modelSchema.pluginOptions?.i18n?.localized) {
      return;
    }

    const entity = await strapi.entityService.findOne(model.uid, where.id, {
      populate: ['localizations'],
    });

    if (!entity || !entity.localizations || entity.localizations.length === 0) {
      return;
    }

    const currentLocale = entity.locale || 'en';
    const targetLocales = await strapi.plugins.i18n.services.locales.find();

    for (const targetLocale of targetLocales) {
      if (targetLocale.code === currentLocale) {
        continue;
      }

      try {
        await strapi
          .plugin('strapi-localize')
          .service('deepl')
          .translateContent(where.id, model.uid, targetLocale.code, currentLocale);

        strapi.log.info(
          `Auto-translated ${model.uid} ID ${where.id} from ${currentLocale} to ${targetLocale.code}`
        );
      } catch (error) {
        strapi.log.error(
          `Failed to auto-translate ${model.uid} ID ${where.id} to ${targetLocale.code}:`,
          error.message
        );
      }
    }
  };

  return {
    translateOnUpdate,
  };
};