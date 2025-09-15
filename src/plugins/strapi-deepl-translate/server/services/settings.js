'use strict';

module.exports = ({ strapi }) => ({
  async getSettings() {
    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'deepl-translate',
    });

    const settings = await pluginStore.get({ key: 'settings' });
    return settings || { apiKey: '', contentTypes: {}, autoTranslate: false };
  },

  async updateSettings(settings) {
    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'deepl-translate',
    });

    await pluginStore.set({
      key: 'settings',
      value: settings,
    });

    return settings;
  },

  async getContentTypeSettings(contentType) {
    const settings = await this.getSettings();
    return settings.contentTypes?.[contentType] || {
      enabled: false,
      ignoredFields: [],
      autoTranslate: false,
    };
  },

  async updateContentTypeSettings(contentType, contentTypeSettings) {
    const settings = await this.getSettings();

    if (!settings.contentTypes) {
      settings.contentTypes = {};
    }

    settings.contentTypes[contentType] = contentTypeSettings;

    return await this.updateSettings(settings);
  },
});