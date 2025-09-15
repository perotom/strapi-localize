// Strapi v5 compatible admin panel configuration
export default {
  register(app) {
    // Add main menu link
    app.addMenuLink({
      to: '/plugins/deepl-translate',
      icon: 'globe',
      intlLabel: {
        id: 'deepl-translate.plugin.name',
        defaultMessage: 'DeepL Translate',
      },
      Component: async () => {
        const component = await import('./admin/src/pages/HomePage');
        return component;
      },
      permissions: [
        {
          action: 'plugin::deepl-translate.read',
          subject: null,
        },
      ],
    });

    // Create settings section
    app.createSettingSection(
      {
        id: 'deepl-translate',
        intlLabel: {
          id: 'deepl-translate.plugin.name',
          defaultMessage: 'DeepL Translate',
        },
      },
      [
        {
          intlLabel: {
            id: 'deepl-translate.settings.title',
            defaultMessage: 'Settings',
          },
          id: 'settings',
          to: '/settings/deepl-translate',
          Component: async () => {
            const component = await import('./admin/src/pages/Settings');
            return component;
          },
          permissions: [
            {
              action: 'plugin::deepl-translate.settings.read',
              subject: null,
            },
          ],
        },
      ]
    );
  },

  bootstrap(app) {
    // Bootstrap lifecycle - can be used for additional initialization if needed
  },

  async registerTrads({ locales }) {
    // Register translations if needed
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./admin/src/translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: data,
              locale: locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale: locale,
            };
          });
      })
    );

    return Promise.resolve(importedTrads);
  },
};