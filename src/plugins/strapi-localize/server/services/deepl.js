'use strict';

const axios = require('axios');

module.exports = ({ strapi }) => ({
  async retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (400-499) except 429 (rate limit)
        if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = initialDelay * Math.pow(2, attempt);
        strapi.log.warn(`DeepL API request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  },
  isFreeApiKey(apiKey) {
    // Free API keys end with :fx
    return apiKey && apiKey.endsWith(':fx');
  },

  async getApiUrl(endpoint) {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('DeepL API key not configured');
    }

    const baseUrl = this.isFreeApiKey(apiKey)
      ? 'https://api-free.deepl.com'
      : 'https://api.deepl.com';

    return `${baseUrl}/v2/${endpoint}`;
  },

  async makeDeeplRequest(endpoint, method = 'GET', data = null, params = {}) {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('DeepL API key not configured');
    }

    const baseUrl = this.isFreeApiKey(apiKey)
      ? 'https://api-free.deepl.com'
      : 'https://api.deepl.com';

    const url = `${baseUrl}/v2/${endpoint}`;

    return await this.retryWithBackoff(async () => {
      const config = {
        method,
        url,
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        params: method === 'GET' ? { ...params, auth_key: apiKey } : params,
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    });
  },
  async getApiKey() {
    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'strapi-localize',
    });

    const settings = await pluginStore.get({ key: 'settings' });
    return settings?.apiKey;
  },

  async getAvailableLanguages() {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('DeepL API key not configured');
    }

    const baseUrl = this.isFreeApiKey(apiKey)
      ? 'https://api-free.deepl.com'
      : 'https://api.deepl.com';

    return await this.retryWithBackoff(async () => {
      const response = await axios.get(`${baseUrl}/v2/languages`, {
        params: {
          auth_key: apiKey,
          type: 'target',
        },
      });

      return response.data;
    });
  },

  async translate(text, targetLang, sourceLang = null) {
    if (!text || !targetLang) {
      return text;
    }

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('DeepL API key not configured');
    }

    const params = {
      auth_key: apiKey,
      text: text,
      target_lang: targetLang.toUpperCase(),
    };

    if (sourceLang) {
      params.source_lang = sourceLang.toUpperCase();
    }

    // Get glossary ID for the language pair
    const settingsService = strapi.plugin('strapi-localize').service('settings');
    const settings = await settingsService.getSettings();
    const glossaryIds = settings.glossaryIds || {};

    const langPairKey = `${(sourceLang || 'en').toLowerCase()}_${targetLang.toLowerCase()}`;
    const glossaryId = glossaryIds[langPairKey];

    if (glossaryId) {
      params.glossary_id = glossaryId;
    }

    const baseUrl = this.isFreeApiKey(apiKey)
      ? 'https://api-free.deepl.com'
      : 'https://api.deepl.com';

    try {
      return await this.retryWithBackoff(async () => {
        const response = await axios.post(`${baseUrl}/v2/translate`, null, {
          params,
        });

        return response.data.translations[0].text;
      });
    } catch (error) {
      strapi.log.error('DeepL translation error:', error.message);
      throw error;
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
      name: 'strapi-localize',
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

  // Glossary Management Methods
  async listGlossaries() {
    try {
      return await this.makeDeeplRequest('glossaries', 'GET');
    } catch (error) {
      strapi.log.error('Failed to list glossaries:', error.message);
      return { glossaries: [] };
    }
  },

  async createGlossary(name, sourceLang, targetLang, entries) {
    try {
      // Format entries as TSV (tab-separated values)
      const entriesText = entries
        .map(entry => `${entry.term}\t${entry.translation}`)
        .join('\n');

      const response = await this.makeDeeplRequest('glossaries', 'POST', {
        name,
        source_lang: sourceLang,
        target_lang: targetLang,
        entries: entriesText,
        entries_format: 'tsv',
      });

      return response;
    } catch (error) {
      strapi.log.error('Failed to create glossary:', error.message);
      throw error;
    }
  },

  async deleteGlossary(glossaryId) {
    try {
      await this.makeDeeplRequest(`glossaries/${glossaryId}`, 'DELETE');
      return true;
    } catch (error) {
      strapi.log.error('Failed to delete glossary:', error.message);
      return false;
    }
  },

  async getGlossaryEntries(glossaryId) {
    try {
      const response = await this.makeDeeplRequest(`glossaries/${glossaryId}/entries`, 'GET');
      return response;
    } catch (error) {
      strapi.log.error('Failed to get glossary entries:', error.message);
      return [];
    }
  },

  async syncGlossaries() {
    const settingsService = strapi.plugin('strapi-localize').service('settings');
    const settings = await settingsService.getSettings();
    const glossary = settings.glossary || [];

    if (glossary.length === 0) {
      return;
    }

    // Get existing glossaries from DeepL
    const existingGlossaries = await this.listGlossaries();

    // Group glossary entries by language pair
    const glossariesByLangPair = {};

    for (const entry of glossary) {
      for (const [targetLang, translation] of Object.entries(entry.translations || {})) {
        if (!translation) continue;

        const key = `en_${targetLang}`;
        if (!glossariesByLangPair[key]) {
          glossariesByLangPair[key] = [];
        }
        glossariesByLangPair[key].push({
          term: entry.term,
          translation: translation,
        });
      }
    }

    // Create or update glossaries for each language pair
    const glossaryIds = {};

    for (const [langPair, entries] of Object.entries(glossariesByLangPair)) {
      const [sourceLang, targetLang] = langPair.split('_');
      const glossaryName = `Strapi Glossary (${sourceLang}-${targetLang})`;

      // Check if glossary already exists
      const existing = existingGlossaries.glossaries?.find(
        g => g.name === glossaryName && g.source_lang === sourceLang && g.target_lang === targetLang
      );

      if (existing) {
        // Delete and recreate (v2 glossaries are immutable)
        await this.deleteGlossary(existing.glossary_id);
      }

      // Create new glossary
      try {
        const newGlossary = await this.createGlossary(
          glossaryName,
          sourceLang.toUpperCase(),
          targetLang.toUpperCase(),
          entries
        );
        glossaryIds[langPair] = newGlossary.glossary_id;
      } catch (error) {
        strapi.log.error(`Failed to create glossary for ${langPair}:`, error.message);
      }
    }

    // Store glossary IDs in settings
    settings.glossaryIds = glossaryIds;
    await settingsService.updateSettings(settings);

    return glossaryIds;
  },
});