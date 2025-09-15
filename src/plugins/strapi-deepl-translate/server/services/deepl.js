'use strict';

const axios = require('axios');

module.exports = ({ strapi }) => ({
  async getApiKey() {
    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'deepl-translate',
    });

    const settings = await pluginStore.get({ key: 'settings' });
    return settings?.apiKey;
  },

  async getAvailableLanguages() {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('DeepL API key not configured');
    }

    try {
      const response = await axios.get('https://api-free.deepl.com/v2/languages', {
        params: {
          auth_key: apiKey,
          type: 'target',
        },
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        const proResponse = await axios.get('https://api.deepl.com/v2/languages', {
          params: {
            auth_key: apiKey,
            type: 'target',
          },
        });
        return proResponse.data;
      }
      throw error;
    }
  },

  async translate(text, targetLang, sourceLang = null) {
    if (!text || !targetLang) {
      return text;
    }

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      strapi.log.warn('DeepL API key not configured');
      return text;
    }

    const params = {
      auth_key: apiKey,
      text: text,
      target_lang: targetLang.toUpperCase(),
    };

    if (sourceLang) {
      params.source_lang = sourceLang.toUpperCase();
    }

    try {
      let response;
      try {
        response = await axios.post('https://api-free.deepl.com/v2/translate', null, {
          params,
        });
      } catch (error) {
        if (error.response?.status === 403) {
          response = await axios.post('https://api.deepl.com/v2/translate', null, {
            params,
          });
        } else {
          throw error;
        }
      }

      return response.data.translations[0].text;
    } catch (error) {
      strapi.log.error('DeepL translation error:', error.message);
      return text;
    }
  },

  async translateObject(obj, targetLang, sourceLang = null, fieldsToIgnore = []) {
    const translated = {};

    for (const [key, value] of Object.entries(obj)) {
      if (fieldsToIgnore.includes(key)) {
        translated[key] = value;
        continue;
      }

      if (typeof value === 'string' && value.trim()) {
        translated[key] = await this.translate(value, targetLang, sourceLang);
      } else if (Array.isArray(value)) {
        translated[key] = await Promise.all(
          value.map(async (item) => {
            if (typeof item === 'string') {
              return await this.translate(item, targetLang, sourceLang);
            } else if (typeof item === 'object' && item !== null) {
              return await this.translateObject(item, targetLang, sourceLang, fieldsToIgnore);
            }
            return item;
          })
        );
      } else if (typeof value === 'object' && value !== null && !Buffer.isBuffer(value)) {
        if (value.id && value.__typename) {
          translated[key] = value;
        } else {
          translated[key] = await this.translateObject(value, targetLang, sourceLang, fieldsToIgnore);
        }
      } else {
        translated[key] = value;
      }
    }

    return translated;
  },

  async translateContent(entityId, model, targetLocale, sourceLocale = null) {
    const entity = await strapi.entityService.findOne(model, entityId, {
      populate: 'deep',
      locale: sourceLocale || 'en',
    });

    if (!entity) {
      throw new Error('Entity not found');
    }

    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'deepl-translate',
    });

    const settings = await pluginStore.get({ key: 'settings' });
    const contentTypeConfig = settings?.contentTypes?.[model] || {};
    const fieldsToIgnore = contentTypeConfig.ignoredFields || [];

    const systemFields = [
      'id',
      'createdAt',
      'updatedAt',
      'publishedAt',
      'createdBy',
      'updatedBy',
      'locale',
      'localizations',
    ];

    const allFieldsToIgnore = [...systemFields, ...fieldsToIgnore];

    const translatedData = await this.translateObject(
      entity,
      targetLocale,
      sourceLocale,
      allFieldsToIgnore
    );

    delete translatedData.id;
    delete translatedData.localizations;

    const relations = {};
    const modelSchema = strapi.getModel(model);

    for (const [key, attribute] of Object.entries(modelSchema.attributes)) {
      if (attribute.type === 'relation') {
        if (entity[key]) {
          if (Array.isArray(entity[key])) {
            relations[key] = entity[key].map(item => item.id || item);
          } else {
            relations[key] = entity[key].id || entity[key];
          }
        }
      }
    }

    const finalData = {
      ...translatedData,
      ...relations,
      locale: targetLocale,
    };

    const existingTranslation = await strapi.entityService.findMany(model, {
      filters: {
        locale: targetLocale,
      },
      populate: ['localizations'],
    });

    const existingForSource = existingTranslation.find(t =>
      t.localizations?.some(l => l.id === entity.id)
    );

    if (existingForSource) {
      return await strapi.entityService.update(model, existingForSource.id, {
        data: finalData,
      });
    } else {
      return await strapi.entityService.create(model, {
        data: finalData,
      });
    }
  },
});