'use strict';

module.exports = ({ strapi }) => {
  const translateOnUpdate = async (event) => {
    const { model, data, where } = event.params;

    strapi.log.debug(`[Strapi Localize] Lifecycle hook triggered: model=${model.uid}, id=${where.id}`);

    const settings = await strapi
      .plugin('strapi-localize')
      .service('settings')
      .getSettings();

    if (!settings.autoTranslate) {
      strapi.log.debug(`[Strapi Localize] Auto-translate disabled globally: model=${model.uid}, id=${where.id}`);
      return;
    }

    const contentTypeSettings = settings.contentTypes?.[model.uid];
    if (!contentTypeSettings?.enabled || !contentTypeSettings?.autoTranslate) {
      strapi.log.debug(`[Strapi Localize] Auto-translate not enabled for content type: model=${model.uid}, id=${where.id}`);
      return;
    }

    const modelSchema = strapi.getModel(model.uid);
    if (!modelSchema.pluginOptions?.i18n?.localized) {
      strapi.log.debug(`[Strapi Localize] Content type not localized: model=${model.uid}, id=${where.id}`);
      return;
    }

    const entity = await strapi.entityService.findOne(model.uid, where.id, {
      populate: ['localizations'],
    });

    if (!entity || !entity.localizations || entity.localizations.length === 0) {
      strapi.log.debug(`[Strapi Localize] No localizations found: model=${model.uid}, id=${where.id}`);
      return;
    }

    const currentLocale = entity.locale || 'en';
    const targetLocales = await strapi.plugins.i18n.services.locales.find();
    const targetLocaleCodes = targetLocales
      .filter(l => l.code !== currentLocale)
      .map(l => l.code);

    strapi.log.info(`[Strapi Localize] Auto-translate triggered: model=${model.uid}, id=${where.id}, source=${currentLocale}, targets=[${targetLocaleCodes.join(', ')}]`);

    let successCount = 0;
    let failCount = 0;

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
          `[Strapi Localize] Auto-translation successful: model=${model.uid}, id=${where.id}, source=${currentLocale}, target=${targetLocale.code}`
        );
        successCount++;
      } catch (error) {
        strapi.log.error(
          `[Strapi Localize] Auto-translation failed: model=${model.uid}, id=${where.id}, target=${targetLocale.code}, error=${error.message}`
        );
        failCount++;
      }
    }

    strapi.log.info(`[Strapi Localize] Auto-translate completed: model=${model.uid}, id=${where.id}, successful=${successCount}, failed=${failCount}`);
  };

  return {
    translateOnUpdate,
  };
};