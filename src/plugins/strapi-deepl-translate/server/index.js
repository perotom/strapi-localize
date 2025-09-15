'use strict';

const bootstrap = require('./bootstrap');
const services = require('./services');
const controllers = require('./controllers');
const routes = require('./routes');

module.exports = {
  bootstrap,
  services,
  controllers,
  routes,

  config: {
    default: {
      apiKey: '',
      autoTranslate: false,
      contentTypes: {},
    },
    validator: (config) => {
      if (config.apiKey && typeof config.apiKey !== 'string') {
        throw new Error('API key must be a string');
      }
    },
  },
};