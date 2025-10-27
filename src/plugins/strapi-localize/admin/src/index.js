import { PLUGIN_ID } from './pluginId';

export default {
  register(app) {
    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
      isReady: false,
    });
  },

  async registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`);

          return { data, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};