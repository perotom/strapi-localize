// Strapi v5 compatible admin panel configuration
export default {
  register(app) {
    console.log('✅ strapi-localize: register() called');

    // Add main menu link
    app.addMenuLink({
      to: '/plugins/strapi-localize',
      icon: 'globe',
      intlLabel: {
        id: 'strapi-localize.plugin.name',
        defaultMessage: 'Strapi Localize',
      },
      Component: async () => {
        const component = await import('./admin/src/pages/HomePage');
        return component;
      },
      permissions: [
        {
          action: 'plugin::strapi-localize.read',
          subject: null,
        },
      ],
    });

    // Create settings section
    app.createSettingSection(
      {
        id: 'strapi-localize',
        intlLabel: {
          id: 'strapi-localize.plugin.name',
          defaultMessage: 'Strapi Localize',
        },
      },
      [
        {
          intlLabel: {
            id: 'strapi-localize.settings.title',
            defaultMessage: 'Settings',
          },
          id: 'settings',
          to: '/settings/strapi-localize',
          Component: async () => {
            const component = await import('./admin/src/pages/Settings');
            return component;
          },
          permissions: [
            {
              action: 'plugin::strapi-localize.settings.read',
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