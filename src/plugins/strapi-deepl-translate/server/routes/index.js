'use strict';

module.exports = {
  admin: {
    type: 'admin',
    routes: [
      {
        method: 'GET',
        path: '/settings',
        handler: 'settings.get',
        config: {
          policies: [
            'admin::isAuthenticatedAdmin',
            {
              name: 'admin::hasPermissions',
              config: {
                actions: ['plugin::deepl-translate.settings.read'],
              },
            },
          ],
        },
      },
      {
        method: 'PUT',
        path: '/settings',
        handler: 'settings.update',
        config: {
          policies: [
            'admin::isAuthenticatedAdmin',
            {
              name: 'admin::hasPermissions',
              config: {
                actions: ['plugin::deepl-translate.settings.update'],
              },
            },
          ],
        },
      },
      {
        method: 'GET',
        path: '/content-types',
        handler: 'settings.getContentTypes',
        config: {
          policies: [
            'admin::isAuthenticatedAdmin',
            {
              name: 'admin::hasPermissions',
              config: {
                actions: ['plugin::deepl-translate.settings.read'],
              },
            },
          ],
        },
      },
      {
        method: 'POST',
        path: '/test-connection',
        handler: 'settings.testConnection',
        config: {
          policies: [
            'admin::isAuthenticatedAdmin',
            {
              name: 'admin::hasPermissions',
              config: {
                actions: ['plugin::deepl-translate.settings.read'],
              },
            },
          ],
        },
      },
      {
        method: 'POST',
        path: '/translate',
        handler: 'translate.translate',
        config: {
          policies: [
            'admin::isAuthenticatedAdmin',
            {
              name: 'admin::hasPermissions',
              config: {
                actions: ['plugin::deepl-translate.translate'],
              },
            },
          ],
        },
      },
      {
        method: 'POST',
        path: '/translate-batch',
        handler: 'translate.translateBatch',
        config: {
          policies: [
            'admin::isAuthenticatedAdmin',
            {
              name: 'admin::hasPermissions',
              config: {
                actions: ['plugin::deepl-translate.translate'],
              },
            },
          ],
        },
      },
      {
        method: 'GET',
        path: '/languages',
        handler: 'translate.getLanguages',
        config: {
          policies: [
            'admin::isAuthenticatedAdmin',
            {
              name: 'admin::hasPermissions',
              config: {
                actions: ['plugin::deepl-translate.settings.read'],
              },
            },
          ],
        },
      },
      {
        method: 'POST',
        path: '/sync-glossaries',
        handler: 'settings.syncGlossaries',
        config: {
          policies: [
            'admin::isAuthenticatedAdmin',
            {
              name: 'admin::hasPermissions',
              config: {
                actions: ['plugin::deepl-translate.settings.update'],
              },
            },
          ],
        },
      },
      {
        method: 'GET',
        path: '/list-glossaries',
        handler: 'settings.listGlossaries',
        config: {
          policies: [
            'admin::isAuthenticatedAdmin',
            {
              name: 'admin::hasPermissions',
              config: {
                actions: ['plugin::deepl-translate.settings.read'],
              },
            },
          ],
        },
      },
    ],
  },
};