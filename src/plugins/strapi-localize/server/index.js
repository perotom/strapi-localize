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

  // No config needed - all settings managed through admin UI
  config: {
    default: {},
    validator: () => {},
  },
};