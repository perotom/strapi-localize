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
          strapi.log.warn(`[Strapi Localize] DeepL API client error: status=${error.response.status}, message=${error.message}`);
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          strapi.log.error(`[Strapi Localize] DeepL API request failed after ${maxRetries} attempts: ${error.message}`);
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = initialDelay * Math.pow(2, attempt);
        strapi.log.warn(`[Strapi Localize] DeepL API request failed: attempt=${attempt + 1}/${maxRetries}, retrying_in=${delay}ms, error=${error.message}`);

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
      strapi.log.error('[Strapi Localize] DeepL API key not configured');
      throw new Error('DeepL API key not configured');
    }

    const isFree = this.isFreeApiKey(apiKey);
    const baseUrl = isFree ? 'https://api-free.deepl.com' : 'https://api.deepl.com';

    strapi.log.debug(`[Strapi Localize] Using DeepL API: type=${isFree ? 'free' : 'pro'}, endpoint=${endpoint}`);

    return `${baseUrl}/v2/${endpoint}`;
  },

  async makeDeeplRequest(endpoint, method = 'GET', data = null, params = {}) {
    const startTime = Date.now();
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      strapi.log.error('[Strapi Localize] DeepL API key not configured');
      throw new Error('DeepL API key not configured');
    }

    const isFree = this.isFreeApiKey(apiKey);
    const baseUrl = isFree ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
    const url = `${baseUrl}/v2/${endpoint}`;

    strapi.log.info(`[Strapi Localize] DeepL API request: method=${method}, endpoint=${endpoint}, api_type=${isFree ? 'free' : 'pro'}`);

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
      const duration = Date.now() - startTime;
      strapi.log.info(`[Strapi Localize] DeepL API response: endpoint=${endpoint}, duration=${duration}ms, status=${response.status}`);

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
    const startTime = Date.now();
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      strapi.log.error('[Strapi Localize] DeepL API key not configured');
      throw new Error('DeepL API key not configured');
    }

    const isFree = this.isFreeApiKey(apiKey);
    const baseUrl = isFree ? 'https://api-free.deepl.com' : 'https://api.deepl.com';

    strapi.log.info(`[Strapi Localize] Fetching available languages from DeepL: api_type=${isFree ? 'free' : 'pro'}`);

    return await this.retryWithBackoff(async () => {
      const response = await axios.get(`${baseUrl}/v2/languages`, {
        params: {
          auth_key: apiKey,
          type: 'target',
        },
      });

      const duration = Date.now() - startTime;
      strapi.log.info(`[Strapi Localize] Fetched languages: count=${response.data?.length || 0}, duration=${duration}ms`);

      return response.data;
    });
  },

  async translate(text, targetLang, sourceLang = null) {
    if (!text || !targetLang) {
      return text;
    }

    const startTime = Date.now();
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      strapi.log.error('[Strapi Localize] DeepL API key not configured');
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
      strapi.log.debug(`[Strapi Localize] Using glossary: id=${glossaryId}, lang_pair=${langPairKey}`);
    }

    const isFree = this.isFreeApiKey(apiKey);
    const baseUrl = isFree ? 'https://api-free.deepl.com' : 'https://api.deepl.com';

    const textPreview = text.length > 50 ? `${text.substring(0, 50)}...` : text;
    strapi.log.debug(`[Strapi Localize] Translating text: source=${sourceLang || 'auto'}, target=${targetLang}, length=${text.length}, preview="${textPreview}"`);

    try {
      return await this.retryWithBackoff(async () => {
        const response = await axios.post(`${baseUrl}/v2/translate`, null, {
          params,
        });

        const duration = Date.now() - startTime;
        const translatedText = response.data.translations[0].text;
        strapi.log.debug(`[Strapi Localize] Translation successful: duration=${duration}ms, chars_translated=${text.length}`);

        return translatedText;
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      strapi.log.error(`[Strapi Localize] Translation failed: source=${sourceLang || 'auto'}, target=${targetLang}, duration=${duration}ms, error=${error.message}`);
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
    const startTime = Date.now();
    strapi.log.info(`[Strapi Localize] Starting content translation: model=${model}, id=${entityId}, source=${sourceLocale || 'auto'}, target=${targetLocale}`);

    const entity = await strapi.entityService.findOne(model, entityId, {
      populate: 'deep',
      locale: sourceLocale || 'en',
    });

    if (!entity) {
      strapi.log.error(`[Strapi Localize] Entity not found: model=${model}, id=${entityId}`);
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

    strapi.log.debug(`[Strapi Localize] Translation config: model=${model}, ignored_fields=${fieldsToIgnore.length}`);

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

    let result;
    if (existingForSource) {
      strapi.log.debug(`[Strapi Localize] Updating existing translation: model=${model}, translation_id=${existingForSource.id}`);
      result = await strapi.entityService.update(model, existingForSource.id, {
        data: finalData,
      });
    } else {
      strapi.log.debug(`[Strapi Localize] Creating new translation: model=${model}`);
      result = await strapi.entityService.create(model, {
        data: finalData,
      });
    }

    const duration = Date.now() - startTime;
    strapi.log.info(`[Strapi Localize] Content translation completed: model=${model}, id=${entityId}, target=${targetLocale}, duration=${duration}ms, result_id=${result.id}`);

    return result;
  },

  // Glossary Management Methods
  async listGlossaries() {
    try {
      strapi.log.debug('[Strapi Localize] Listing DeepL glossaries');
      const result = await this.makeDeeplRequest('glossaries', 'GET');
      strapi.log.info(`[Strapi Localize] Listed glossaries: count=${result.glossaries?.length || 0}`);
      return result;
    } catch (error) {
      strapi.log.error(`[Strapi Localize] Failed to list glossaries: ${error.message}`);
      return { glossaries: [] };
    }
  },

  async createGlossary(name, sourceLang, targetLang, entries) {
    try {
      strapi.log.info(`[Strapi Localize] Creating glossary: name="${name}", source=${sourceLang}, target=${targetLang}, entries=${entries.length}`);

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

      strapi.log.info(`[Strapi Localize] Glossary created: id=${response.glossary_id}, name="${name}"`);
      return response;
    } catch (error) {
      strapi.log.error(`[Strapi Localize] Failed to create glossary "${name}": ${error.message}`);
      throw error;
    }
  },

  async deleteGlossary(glossaryId) {
    try {
      strapi.log.info(`[Strapi Localize] Deleting glossary: id=${glossaryId}`);
      await this.makeDeeplRequest(`glossaries/${glossaryId}`, 'DELETE');
      strapi.log.info(`[Strapi Localize] Glossary deleted: id=${glossaryId}`);
      return true;
    } catch (error) {
      strapi.log.error(`[Strapi Localize] Failed to delete glossary ${glossaryId}: ${error.message}`);
      return false;
    }
  },

  async getGlossaryEntries(glossaryId) {
    try {
      strapi.log.debug(`[Strapi Localize] Fetching glossary entries: id=${glossaryId}`);
      const response = await this.makeDeeplRequest(`glossaries/${glossaryId}/entries`, 'GET');
      strapi.log.debug(`[Strapi Localize] Fetched glossary entries: id=${glossaryId}`);
      return response;
    } catch (error) {
      strapi.log.error(`[Strapi Localize] Failed to get glossary entries for ${glossaryId}: ${error.message}`);
      return [];
    }
  },

  async syncGlossaries() {
    const startTime = Date.now();
    strapi.log.info('[Strapi Localize] Starting glossary sync with DeepL');

    const settingsService = strapi.plugin('strapi-localize').service('settings');
    const settings = await settingsService.getSettings();
    const glossary = settings.glossary || [];

    if (glossary.length === 0) {
      strapi.log.info('[Strapi Localize] No glossary entries configured, skipping sync');
      return;
    }

    strapi.log.debug(`[Strapi Localize] Syncing glossary: total_entries=${glossary.length}`);

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

    strapi.log.info(`[Strapi Localize] Glossary language pairs to sync: count=${Object.keys(glossariesByLangPair).length}`);

    // Create or update glossaries for each language pair
    const glossaryIds = {};
    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const [langPair, entries] of Object.entries(glossariesByLangPair)) {
      const [sourceLang, targetLang] = langPair.split('_');
      const glossaryName = `Strapi Glossary (${sourceLang}-${targetLang})`;

      // Check if glossary already exists
      const existing = existingGlossaries.glossaries?.find(
        g => g.name === glossaryName && g.source_lang === sourceLang && g.target_lang === targetLang
      );

      if (existing) {
        // Delete and recreate (v2 glossaries are immutable)
        strapi.log.debug(`[Strapi Localize] Updating existing glossary: lang_pair=${langPair}, id=${existing.glossary_id}`);
        await this.deleteGlossary(existing.glossary_id);
        updated++;
      } else {
        created++;
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
        strapi.log.error(`[Strapi Localize] Failed to create glossary for ${langPair}: ${error.message}`);
        failed++;
      }
    }

    // Store glossary IDs in settings
    settings.glossaryIds = glossaryIds;
    await settingsService.updateSettings(settings);

    const duration = Date.now() - startTime;
    strapi.log.info(`[Strapi Localize] Glossary sync completed: created=${created}, updated=${updated}, failed=${failed}, duration=${duration}ms`);

    return glossaryIds;
  },
});