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
          policies: [],
        },
      },
      {
        method: 'PUT',
        path: '/settings',
        handler: 'settings.update',
        config: {
          policies: [],
        },
      },
      {
        method: 'GET',
        path: '/content-types',
        handler: 'settings.getContentTypes',
        config: {
          policies: [],
        },
      },
      {
        method: 'POST',
        path: '/test-connection',
        handler: 'settings.testConnection',
        config: {
          policies: [],
        },
      },
      {
        method: 'POST',
        path: '/translate',
        handler: 'translate.translate',
        config: {
          policies: [],
        },
      },
      {
        method: 'POST',
        path: '/translate-batch',
        handler: 'translate.translateBatch',
        config: {
          policies: [],
        },
      },
      {
        method: 'GET',
        path: '/languages',
        handler: 'translate.getLanguages',
        config: {
          policies: [],
        },
      },
    ],
  },
};