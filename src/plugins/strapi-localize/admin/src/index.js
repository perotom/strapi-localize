import { prefixPluginTranslations } from '@strapi/helper-plugin';
import pluginId from './pluginId';
import PluginIcon from './components/PluginIcon';

const name = 'strapi-localize';

export default {
  register(app) {
    // Register the plugin
    app.registerPlugin({
      id: pluginId,
      name,
      isReady: true,
    });
  },

  bootstrap(app) {
    // Bootstrap phase - additional initialization if needed
  },

  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      })
    );

    return Promise.resolve(importedTrads);
  },
};