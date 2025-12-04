import require$$0 from "axios";
import require$$0$1 from "crypto";
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var lifecycle$1;
var hasRequiredLifecycle;
function requireLifecycle() {
  if (hasRequiredLifecycle) return lifecycle$1;
  hasRequiredLifecycle = 1;
  lifecycle$1 = ({ strapi }) => {
    const translatingEntries = /* @__PURE__ */ new Set();
    const translateOnUpdate = async (event) => {
      const { model, data, where } = event.params;
      strapi.log.debug(`[Strapi Localize] Lifecycle hook triggered: model=${model.uid}, id=${where.id}`);
      const entryKey = `${model.uid}:${where.id}`;
      if (translatingEntries.has(entryKey)) {
        strapi.log.debug(`[Strapi Localize] Skipping - entry is being translated: ${entryKey}`);
        return;
      }
      const settings2 = await strapi.plugin("strapi-localize").service("settings").getSettings();
      if (!settings2.autoTranslate) {
        strapi.log.debug(`[Strapi Localize] Auto-translate disabled globally: model=${model.uid}, id=${where.id}`);
        return;
      }
      const contentTypeSettings = settings2.contentTypes?.[model.uid];
      if (!contentTypeSettings?.enabled || !contentTypeSettings?.autoTranslate) {
        strapi.log.debug(`[Strapi Localize] Auto-translate not enabled for content type: model=${model.uid}, id=${where.id}`);
        return;
      }
      const modelSchema = strapi.getModel(model.uid);
      if (!modelSchema.pluginOptions?.i18n?.localized) {
        strapi.log.debug(`[Strapi Localize] Content type not localized: model=${model.uid}, id=${where.id}`);
        return;
      }
      const entity = await strapi.entityService.findOne(model.uid, where.id, {
        populate: ["localizations"]
      });
      if (!entity) {
        strapi.log.debug(`[Strapi Localize] Entity not found: model=${model.uid}, id=${where.id}`);
        return;
      }
      if (entity.localizations && entity.localizations.length > 0) {
        strapi.log.debug(`[Strapi Localize] Skipping - entry already has localizations (might be a translation): model=${model.uid}, id=${where.id}`);
        return;
      }
      const currentLocale = entity.locale || "en";
      const targetLocales = await strapi.plugins.i18n.services.locales.find();
      const targetLocaleCodes = targetLocales.filter((l) => l.code !== currentLocale).map((l) => l.code);
      if (targetLocaleCodes.length === 0) {
        strapi.log.debug(`[Strapi Localize] Only one locale exists, skipping translation: model=${model.uid}, id=${where.id}`);
        return;
      }
      strapi.log.info(`[Strapi Localize] Auto-translate triggered: model=${model.uid}, id=${where.id}, source=${currentLocale}, targets=[${targetLocaleCodes.join(", ")}]`);
      let successCount = 0;
      let failCount = 0;
      for (const targetLocale of targetLocales) {
        if (targetLocale.code === currentLocale) {
          continue;
        }
        const targetEntryKey = `${model.uid}:${where.id}:${targetLocale.code}`;
        translatingEntries.add(targetEntryKey);
        try {
          await strapi.plugin("strapi-localize").service("deepl").translateContent(where.id, model.uid, targetLocale.code, currentLocale);
          strapi.log.info(
            `[Strapi Localize] Auto-translation successful: model=${model.uid}, id=${where.id}, source=${currentLocale}, target=${targetLocale.code}`
          );
          successCount++;
        } catch (error) {
          strapi.log.error(
            `[Strapi Localize] Auto-translation failed: model=${model.uid}, id=${where.id}, target=${targetLocale.code}, error=${error.message}`
          );
          failCount++;
        } finally {
          translatingEntries.delete(targetEntryKey);
        }
      }
      strapi.log.info(`[Strapi Localize] Auto-translate completed: model=${model.uid}, id=${where.id}, successful=${successCount}, failed=${failCount}`);
    };
    return {
      translateOnUpdate
    };
  };
  return lifecycle$1;
}
var bootstrap = async ({ strapi }) => {
  strapi.log.info("[Strapi Localize] Plugin initializing...");
  const lifecycleMiddleware = requireLifecycle()({ strapi });
  const localizableModels = Object.keys(strapi.contentTypes).filter((key) => {
    const contentType = strapi.contentTypes[key];
    return contentType.kind === "collectionType" && !key.startsWith("plugin::") && !key.startsWith("strapi::") && contentType.pluginOptions?.i18n?.localized === true;
  });
  strapi.log.info(`[Strapi Localize] Found ${localizableModels.length} localizable content types`);
  if (localizableModels.length > 0) {
    strapi.log.debug(`[Strapi Localize] Localizable models: ${localizableModels.join(", ")}`);
  }
  strapi.db.lifecycles.subscribe({
    models: localizableModels,
    async afterCreate(event) {
      setTimeout(() => lifecycleMiddleware.translateOnUpdate(event), 1e3);
    },
    async afterUpdate(event) {
      setTimeout(() => lifecycleMiddleware.translateOnUpdate(event), 1e3);
    }
  });
  strapi.log.info("[Strapi Localize] Plugin initialized successfully");
};
const bootstrap$1 = /* @__PURE__ */ getDefaultExportFromCjs(bootstrap);
const destroy = ({ strapi }) => {
};
const register = ({ strapi }) => {
};
const config = {};
const contentTypes = {};
var settings$3 = ({ strapi }) => ({
  async get(ctx) {
    try {
      const settings2 = await strapi.plugin("strapi-localize").service("settings").getSettings();
      ctx.body = settings2;
    } catch (error) {
      ctx.throw(500, error);
    }
  },
  async update(ctx) {
    try {
      const newSettings = ctx.request.body;
      if (!newSettings || typeof newSettings !== "object") {
        return ctx.badRequest("Settings must be an object");
      }
      if (newSettings.apiKey !== void 0) {
        if (typeof newSettings.apiKey !== "string") {
          return ctx.badRequest("API key must be a string");
        }
        newSettings.apiKey = newSettings.apiKey.trim();
      }
      if (newSettings.autoTranslate !== void 0 && typeof newSettings.autoTranslate !== "boolean") {
        return ctx.badRequest("autoTranslate must be a boolean");
      }
      if (newSettings.contentTypes !== void 0) {
        if (typeof newSettings.contentTypes !== "object" || Array.isArray(newSettings.contentTypes)) {
          return ctx.badRequest("contentTypes must be an object");
        }
        for (const [uid, config2] of Object.entries(newSettings.contentTypes)) {
          if (typeof config2 !== "object") {
            return ctx.badRequest(`Content type config for '${uid}' must be an object`);
          }
          if (config2.enabled !== void 0 && typeof config2.enabled !== "boolean") {
            return ctx.badRequest(`enabled for '${uid}' must be a boolean`);
          }
          if (config2.autoTranslate !== void 0 && typeof config2.autoTranslate !== "boolean") {
            return ctx.badRequest(`autoTranslate for '${uid}' must be a boolean`);
          }
          if (config2.ignoredFields !== void 0) {
            if (!Array.isArray(config2.ignoredFields)) {
              return ctx.badRequest(`ignoredFields for '${uid}' must be an array`);
            }
            for (const field of config2.ignoredFields) {
              if (typeof field !== "string") {
                return ctx.badRequest(`ignoredFields for '${uid}' must contain only strings`);
              }
            }
          }
        }
      }
      if (newSettings.glossary !== void 0) {
        if (!Array.isArray(newSettings.glossary)) {
          return ctx.badRequest("glossary must be an array");
        }
        for (const entry of newSettings.glossary) {
          if (!entry.term || typeof entry.term !== "string") {
            return ctx.badRequest("Each glossary entry must have a term (string)");
          }
          if (entry.translations && typeof entry.translations !== "object") {
            return ctx.badRequest("Glossary translations must be an object");
          }
        }
      }
      const settings2 = await strapi.plugin("strapi-localize").service("settings").updateSettings(newSettings);
      if (settings2.glossary && settings2.glossary.length > 0) {
        try {
          await strapi.plugin("strapi-localize").service("deepl").syncGlossaries();
        } catch (glossaryError) {
          strapi.log.warn("Failed to sync glossaries:", glossaryError.message);
        }
      }
      ctx.body = settings2;
    } catch (error) {
      strapi.log.error("Settings update error:", error);
      ctx.throw(500, error.message || "Failed to update settings");
    }
  },
  async getContentTypes(ctx) {
    try {
      const contentTypes2 = Object.keys(strapi.contentTypes).filter((key) => {
        const contentType = strapi.contentTypes[key];
        return contentType.kind === "collectionType" && !key.startsWith("plugin::") && !key.startsWith("strapi::") && contentType.pluginOptions?.i18n?.localized === true;
      }).map((key) => {
        const contentType = strapi.contentTypes[key];
        const fields = Object.entries(contentType.attributes).filter(([fieldKey, field]) => {
          return field.type === "string" || field.type === "text" || field.type === "richtext" || field.type === "blocks";
        }).map(([fieldKey]) => fieldKey);
        return {
          uid: key,
          displayName: contentType.info?.displayName || key,
          fields
        };
      });
      ctx.body = contentTypes2;
    } catch (error) {
      ctx.throw(500, error);
    }
  },
  async testConnection(ctx) {
    try {
      const languages = await strapi.plugin("strapi-localize").service("deepl").getAvailableLanguages();
      ctx.body = {
        success: true,
        languages
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message
      };
    }
  },
  async syncGlossaries(ctx) {
    try {
      const glossaryIds = await strapi.plugin("strapi-localize").service("deepl").syncGlossaries();
      ctx.body = {
        success: true,
        glossaryIds,
        message: "Glossaries synced successfully"
      };
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message
      };
    }
  },
  async listGlossaries(ctx) {
    try {
      const glossaries = await strapi.plugin("strapi-localize").service("deepl").listGlossaries();
      ctx.body = glossaries;
    } catch (error) {
      ctx.body = {
        success: false,
        error: error.message
      };
    }
  }
});
var translate$1 = ({ strapi }) => ({
  validateContentModel(model) {
    if (!model || typeof model !== "string") {
      return { valid: false, error: "Model must be a non-empty string" };
    }
    if (!/^(api|plugin)::[a-z0-9-]+\.[a-z0-9-]+$/i.test(model)) {
      return { valid: false, error: "Invalid model format. Expected format: api::name.name" };
    }
    const contentType = strapi.contentTypes[model];
    if (!contentType) {
      return { valid: false, error: `Content type '${model}' does not exist` };
    }
    if (!contentType.pluginOptions?.i18n?.localized) {
      return { valid: false, error: `Content type '${model}' does not have i18n enabled` };
    }
    return { valid: true };
  },
  validateLocale(locale) {
    if (!locale || typeof locale !== "string") {
      return { valid: false, error: "Locale must be a non-empty string" };
    }
    if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(locale)) {
      return { valid: false, error: "Invalid locale format. Expected format: en, de, fr-FR" };
    }
    return { valid: true };
  },
  validateId(id) {
    if (!id) {
      return { valid: false, error: "ID is required" };
    }
    const numId = Number(id);
    if (isNaN(numId) || numId <= 0) {
      return { valid: false, error: "ID must be a positive number" };
    }
    return { valid: true };
  },
  async translate(ctx) {
    const startTime = Date.now();
    const { id, model, targetLocale, sourceLocale } = ctx.request.body;
    strapi.log.info(`[Strapi Localize] Translation request: model=${model}, id=${id}, target=${targetLocale}, source=${sourceLocale || "auto"}`);
    try {
      if (!id || !model || !targetLocale) {
        strapi.log.warn(`[Strapi Localize] Translation validation failed: Missing required parameters`);
        return ctx.badRequest("Missing required parameters: id, model, targetLocale");
      }
      const idValidation = this.validateId(id);
      if (!idValidation.valid) {
        strapi.log.warn(`[Strapi Localize] Translation validation failed: ${idValidation.error}`);
        return ctx.badRequest(idValidation.error);
      }
      const modelValidation = this.validateContentModel(model);
      if (!modelValidation.valid) {
        strapi.log.warn(`[Strapi Localize] Translation validation failed: ${modelValidation.error}`);
        return ctx.badRequest(modelValidation.error);
      }
      const targetLocaleValidation = this.validateLocale(targetLocale);
      if (!targetLocaleValidation.valid) {
        strapi.log.warn(`[Strapi Localize] Translation validation failed: ${targetLocaleValidation.error}`);
        return ctx.badRequest(targetLocaleValidation.error);
      }
      if (sourceLocale) {
        const sourceLocaleValidation = this.validateLocale(sourceLocale);
        if (!sourceLocaleValidation.valid) {
          strapi.log.warn(`[Strapi Localize] Translation validation failed: ${sourceLocaleValidation.error}`);
          return ctx.badRequest(sourceLocaleValidation.error);
        }
      }
      const result = await strapi.plugin("strapi-localize").service("deepl").translateContent(id, model, targetLocale, sourceLocale);
      const duration = Date.now() - startTime;
      strapi.log.info(`[Strapi Localize] Translation completed: model=${model}, id=${id}, duration=${duration}ms`);
      ctx.body = result;
    } catch (error) {
      const duration = Date.now() - startTime;
      strapi.log.error(`[Strapi Localize] Translation error: model=${model}, id=${id}, duration=${duration}ms, error=${error.message}`);
      ctx.throw(500, error.message || "Translation failed");
    }
  },
  async translateBatch(ctx) {
    const startTime = Date.now();
    const { ids, model, targetLocale, sourceLocale } = ctx.request.body;
    strapi.log.info(`[Strapi Localize] Batch translation request: model=${model}, count=${ids?.length || 0}, target=${targetLocale}, source=${sourceLocale || "auto"}`);
    try {
      if (!ids || !model || !targetLocale) {
        strapi.log.warn(`[Strapi Localize] Batch translation validation failed: Missing required parameters`);
        return ctx.badRequest("Missing required parameters: ids, model, targetLocale");
      }
      if (!Array.isArray(ids)) {
        strapi.log.warn(`[Strapi Localize] Batch translation validation failed: ids must be an array`);
        return ctx.badRequest("ids must be an array");
      }
      if (ids.length === 0) {
        strapi.log.warn(`[Strapi Localize] Batch translation validation failed: Empty array`);
        return ctx.badRequest("ids array cannot be empty");
      }
      if (ids.length > 50) {
        strapi.log.warn(`[Strapi Localize] Batch translation validation failed: Batch size ${ids.length} exceeds maximum of 50`);
        return ctx.badRequest("Maximum batch size is 50 items");
      }
      for (const id of ids) {
        const idValidation = this.validateId(id);
        if (!idValidation.valid) {
          return ctx.badRequest(`Invalid ID '${id}': ${idValidation.error}`);
        }
      }
      const modelValidation = this.validateContentModel(model);
      if (!modelValidation.valid) {
        return ctx.badRequest(modelValidation.error);
      }
      const targetLocaleValidation = this.validateLocale(targetLocale);
      if (!targetLocaleValidation.valid) {
        return ctx.badRequest(targetLocaleValidation.error);
      }
      if (sourceLocale) {
        const sourceLocaleValidation = this.validateLocale(sourceLocale);
        if (!sourceLocaleValidation.valid) {
          return ctx.badRequest(sourceLocaleValidation.error);
        }
      }
      const results = await Promise.allSettled(
        ids.map(
          (id) => strapi.plugin("strapi-localize").service("deepl").translateContent(id, model, targetLocale, sourceLocale).catch((error) => ({
            id,
            error: error.message || "Translation failed",
            status: "failed"
          }))
        )
      );
      const formattedResults = results.map((result, index2) => {
        if (result.status === "fulfilled") {
          if (result.value?.error) {
            return {
              id: ids[index2],
              status: "failed",
              error: result.value.error
            };
          }
          return {
            id: result.value.id,
            status: "success",
            data: result.value
          };
        } else {
          return {
            id: ids[index2],
            status: "failed",
            error: result.reason?.message || "Unknown error"
          };
        }
      });
      const successCount = formattedResults.filter((r) => r.status === "success").length;
      const failureCount = formattedResults.filter((r) => r.status === "failed").length;
      const duration = Date.now() - startTime;
      strapi.log.info(`[Strapi Localize] Batch translation completed: model=${model}, total=${ids.length}, successful=${successCount}, failed=${failureCount}, duration=${duration}ms`);
      if (failureCount > 0) {
        const failedIds = formattedResults.filter((r) => r.status === "failed").map((r) => r.id);
        strapi.log.warn(`[Strapi Localize] Failed translations for IDs: ${failedIds.join(", ")}`);
      }
      ctx.body = {
        results: formattedResults,
        summary: {
          total: ids.length,
          successful: successCount,
          failed: failureCount
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      strapi.log.error(`[Strapi Localize] Batch translation error: model=${model}, count=${ids?.length || 0}, duration=${duration}ms, error=${error.message}`);
      ctx.throw(500, error.message || "Batch translation failed");
    }
  },
  async getLanguages(ctx) {
    try {
      const languages = await strapi.plugin("strapi-localize").service("deepl").getAvailableLanguages();
      ctx.body = languages;
    } catch (error) {
      ctx.throw(500, error);
    }
  }
});
const settings$2 = settings$3;
const translate = translate$1;
var controllers = {
  settings: settings$2,
  translate
};
const controllers$1 = /* @__PURE__ */ getDefaultExportFromCjs(controllers);
var lifecycleExports = requireLifecycle();
const lifecycle = /* @__PURE__ */ getDefaultExportFromCjs(lifecycleExports);
const middlewares = {
  lifecycle
};
const policies = {};
var routes = {
  admin: {
    type: "admin",
    routes: [
      {
        method: "GET",
        path: "/settings",
        handler: "settings.get",
        config: {
          policies: [
            "admin::isAuthenticatedAdmin",
            {
              name: "admin::hasPermissions",
              config: {
                actions: ["plugin::strapi-localize.settings.read"]
              }
            }
          ]
        }
      },
      {
        method: "PUT",
        path: "/settings",
        handler: "settings.update",
        config: {
          policies: [
            "admin::isAuthenticatedAdmin",
            {
              name: "admin::hasPermissions",
              config: {
                actions: ["plugin::strapi-localize.settings.update"]
              }
            }
          ]
        }
      },
      {
        method: "GET",
        path: "/content-types",
        handler: "settings.getContentTypes",
        config: {
          policies: [
            "admin::isAuthenticatedAdmin",
            {
              name: "admin::hasPermissions",
              config: {
                actions: ["plugin::strapi-localize.settings.read"]
              }
            }
          ]
        }
      },
      {
        method: "POST",
        path: "/test-connection",
        handler: "settings.testConnection",
        config: {
          policies: [
            "admin::isAuthenticatedAdmin",
            {
              name: "admin::hasPermissions",
              config: {
                actions: ["plugin::strapi-localize.settings.read"]
              }
            }
          ]
        }
      },
      {
        method: "POST",
        path: "/translate",
        handler: "translate.translate",
        config: {
          policies: [
            "admin::isAuthenticatedAdmin",
            {
              name: "admin::hasPermissions",
              config: {
                actions: ["plugin::strapi-localize.translate"]
              }
            }
          ]
        }
      },
      {
        method: "POST",
        path: "/translate-batch",
        handler: "translate.translateBatch",
        config: {
          policies: [
            "admin::isAuthenticatedAdmin",
            {
              name: "admin::hasPermissions",
              config: {
                actions: ["plugin::strapi-localize.translate"]
              }
            }
          ]
        }
      },
      {
        method: "GET",
        path: "/languages",
        handler: "translate.getLanguages",
        config: {
          policies: [
            "admin::isAuthenticatedAdmin",
            {
              name: "admin::hasPermissions",
              config: {
                actions: ["plugin::strapi-localize.settings.read"]
              }
            }
          ]
        }
      },
      {
        method: "POST",
        path: "/sync-glossaries",
        handler: "settings.syncGlossaries",
        config: {
          policies: [
            "admin::isAuthenticatedAdmin",
            {
              name: "admin::hasPermissions",
              config: {
                actions: ["plugin::strapi-localize.settings.update"]
              }
            }
          ]
        }
      },
      {
        method: "GET",
        path: "/list-glossaries",
        handler: "settings.listGlossaries",
        config: {
          policies: [
            "admin::isAuthenticatedAdmin",
            {
              name: "admin::hasPermissions",
              config: {
                actions: ["plugin::strapi-localize.settings.read"]
              }
            }
          ]
        }
      }
    ]
  }
};
const routes$1 = /* @__PURE__ */ getDefaultExportFromCjs(routes);
const axios = require$$0;
var deepl = ({ strapi }) => ({
  async retryWithBackoff(fn, maxRetries = 3, initialDelay = 1e3) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
          strapi.log.warn(`[Strapi Localize] DeepL API client error: status=${error.response.status}, message=${error.message}`);
          throw error;
        }
        if (attempt === maxRetries - 1) {
          strapi.log.error(`[Strapi Localize] DeepL API request failed after ${maxRetries} attempts: ${error.message}`);
          throw error;
        }
        const delay = initialDelay * Math.pow(2, attempt);
        strapi.log.warn(`[Strapi Localize] DeepL API request failed: attempt=${attempt + 1}/${maxRetries}, retrying_in=${delay}ms, error=${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  },
  isFreeApiKey(apiKey) {
    return apiKey && apiKey.endsWith(":fx");
  },
  async getApiUrl(endpoint) {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      strapi.log.error("[Strapi Localize] DeepL API key not configured");
      throw new Error("DeepL API key not configured");
    }
    const isFree = this.isFreeApiKey(apiKey);
    const baseUrl = isFree ? "https://api-free.deepl.com" : "https://api.deepl.com";
    strapi.log.debug(`[Strapi Localize] Using DeepL API: type=${isFree ? "free" : "pro"}, endpoint=${endpoint}`);
    return `${baseUrl}/v2/${endpoint}`;
  },
  async makeDeeplRequest(endpoint, method = "GET", data = null, params = {}) {
    const startTime = Date.now();
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      strapi.log.error("[Strapi Localize] DeepL API key not configured");
      throw new Error("DeepL API key not configured");
    }
    const isFree = this.isFreeApiKey(apiKey);
    const baseUrl = isFree ? "https://api-free.deepl.com" : "https://api.deepl.com";
    const url = `${baseUrl}/v2/${endpoint}`;
    strapi.log.info(`[Strapi Localize] DeepL API request: method=${method}, endpoint=${endpoint}, api_type=${isFree ? "free" : "pro"}`);
    return await this.retryWithBackoff(async () => {
      const config2 = {
        method,
        url,
        headers: {
          "Authorization": `DeepL-Auth-Key ${apiKey}`,
          "Content-Type": "application/json"
        },
        params: method === "GET" ? { ...params, auth_key: apiKey } : params
      };
      if (data) {
        config2.data = data;
      }
      const response = await axios(config2);
      const duration = Date.now() - startTime;
      strapi.log.info(`[Strapi Localize] DeepL API response: endpoint=${endpoint}, duration=${duration}ms, status=${response.status}`);
      return response.data;
    });
  },
  async getApiKey() {
    const pluginStore = strapi.store({
      environment: "",
      type: "plugin",
      name: "strapi-localize"
    });
    const settings2 = await pluginStore.get({ key: "settings" });
    return settings2?.apiKey;
  },
  async getAvailableLanguages() {
    const startTime = Date.now();
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      strapi.log.error("[Strapi Localize] DeepL API key not configured");
      throw new Error("DeepL API key not configured");
    }
    const isFree = this.isFreeApiKey(apiKey);
    const baseUrl = isFree ? "https://api-free.deepl.com" : "https://api.deepl.com";
    strapi.log.info(`[Strapi Localize] Fetching available languages from DeepL: api_type=${isFree ? "free" : "pro"}`);
    return await this.retryWithBackoff(async () => {
      const response = await axios.get(`${baseUrl}/v2/languages`, {
        params: {
          auth_key: apiKey,
          type: "target"
        }
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
      strapi.log.error("[Strapi Localize] DeepL API key not configured");
      throw new Error("DeepL API key not configured");
    }
    const params = {
      auth_key: apiKey,
      text,
      target_lang: targetLang.toUpperCase()
    };
    if (sourceLang) {
      params.source_lang = sourceLang.toUpperCase();
    }
    const settingsService = strapi.plugin("strapi-localize").service("settings");
    const settings2 = await settingsService.getSettings();
    const glossaryIds = settings2.glossaryIds || {};
    const langPairKey = `${(sourceLang || "en").toLowerCase()}_${targetLang.toLowerCase()}`;
    const glossaryId = glossaryIds[langPairKey];
    if (glossaryId) {
      params.glossary_id = glossaryId;
      strapi.log.debug(`[Strapi Localize] Using glossary: id=${glossaryId}, lang_pair=${langPairKey}`);
    }
    const isFree = this.isFreeApiKey(apiKey);
    const baseUrl = isFree ? "https://api-free.deepl.com" : "https://api.deepl.com";
    const textPreview = text.length > 50 ? `${text.substring(0, 50)}...` : text;
    strapi.log.debug(`[Strapi Localize] Translating text: source=${sourceLang || "auto"}, target=${targetLang}, length=${text.length}, preview="${textPreview}"`);
    try {
      return await this.retryWithBackoff(async () => {
        const response = await axios.post(`${baseUrl}/v2/translate`, null, {
          params
        });
        const duration = Date.now() - startTime;
        const translatedText = response.data.translations[0].text;
        strapi.log.debug(`[Strapi Localize] Translation successful: duration=${duration}ms, chars_translated=${text.length}`);
        return translatedText;
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      strapi.log.error(`[Strapi Localize] Translation failed: source=${sourceLang || "auto"}, target=${targetLang}, duration=${duration}ms, error=${error.message}`);
      throw error;
    }
  },
  // Build proper populate strategy for Strapi v5 (supports dynamic zones and components)
  buildPopulateStrategy(modelSchema, depth = 5, maxDepth = 10) {
    if (depth <= 0 || depth > maxDepth) {
      strapi.log.debug(`[Strapi Localize] Populate depth limit reached: depth=${depth}`);
      return "*";
    }
    const populate = {};
    if (!modelSchema || !modelSchema.attributes) {
      return "*";
    }
    for (const [attributeName, attribute] of Object.entries(modelSchema.attributes)) {
      if ([
        "string",
        "text",
        "richtext",
        "email",
        "integer",
        "biginteger",
        "float",
        "decimal",
        "date",
        "time",
        "datetime",
        "timestamp",
        "boolean",
        "enumeration",
        "json",
        "password",
        "uid",
        "blocks"
      ].includes(attribute.type)) {
        continue;
      }
      if (attribute.type === "relation") {
        if (depth > 1) {
          populate[attributeName] = { populate: "*" };
        } else {
          populate[attributeName] = true;
        }
      }
      if (attribute.type === "media") {
        populate[attributeName] = true;
      }
      if (attribute.type === "component") {
        if (attribute.component && strapi.components[attribute.component]) {
          const componentSchema = strapi.components[attribute.component];
          strapi.log.debug(`[Strapi Localize] Building populate for component: ${attribute.component}, depth=${depth}`);
          if (depth > 1) {
            populate[attributeName] = {
              populate: this.buildPopulateStrategy(componentSchema, depth - 1, maxDepth)
            };
          } else {
            populate[attributeName] = { populate: "*" };
          }
        } else {
          populate[attributeName] = { populate: "*" };
        }
      }
      if (attribute.type === "dynamiczone") {
        populate[attributeName] = { on: {} };
        if (attribute.components && Array.isArray(attribute.components)) {
          for (const componentName of attribute.components) {
            if (strapi.components[componentName]) {
              const componentSchema = strapi.components[componentName];
              strapi.log.debug(`[Strapi Localize] Building populate for dynamic zone component: ${componentName}, depth=${depth}`);
              if (depth > 1) {
                populate[attributeName].on[componentName] = {
                  populate: this.buildPopulateStrategy(componentSchema, depth - 1, maxDepth)
                };
              } else {
                populate[attributeName].on[componentName] = { populate: "*" };
              }
            } else {
              strapi.log.warn(`[Strapi Localize] Component schema not found: ${componentName}`);
              populate[attributeName].on[componentName] = { populate: "*" };
            }
          }
        }
      }
    }
    return Object.keys(populate).length > 0 ? populate : "*";
  },
  async translateObject(obj, targetLang, sourceLang = null, fieldsToIgnore = [], modelSchema = null) {
    const translated = {};
    const translatableTypes = ["string", "text", "richtext", "blocks"];
    for (const [key, value] of Object.entries(obj)) {
      if (fieldsToIgnore.includes(key) || ["id", "__component", "__typename", "documentId"].includes(key)) {
        translated[key] = value;
        continue;
      }
      let shouldTranslate = false;
      let fieldSchema = null;
      if (modelSchema && modelSchema.attributes && modelSchema.attributes[key]) {
        fieldSchema = modelSchema.attributes[key];
        shouldTranslate = translatableTypes.includes(fieldSchema.type);
      } else {
        shouldTranslate = typeof value === "string";
      }
      if (shouldTranslate && typeof value === "string" && value.trim()) {
        translated[key] = await this.translate(value, targetLang, sourceLang);
      } else if (Array.isArray(value)) {
        translated[key] = await Promise.all(
          value.map(async (item) => {
            if (typeof item === "string") {
              return await this.translate(item, targetLang, sourceLang);
            } else if (typeof item === "object" && item !== null) {
              if (item.__component) {
                const componentSchema = strapi.components[item.__component];
                if (componentSchema) {
                  strapi.log.debug(`[Strapi Localize] Translating array component: ${item.__component}`);
                  return await this.translateObject(item, targetLang, sourceLang, fieldsToIgnore, componentSchema);
                } else {
                  strapi.log.warn(`[Strapi Localize] Component schema not found for: ${item.__component}`);
                  return item;
                }
              } else if (item.id && !item.__component) {
                strapi.log.debug(`[Strapi Localize] Preserving array relation: id=${item.id}`);
                return { id: item.id };
              }
              return await this.translateObject(item, targetLang, sourceLang, fieldsToIgnore, modelSchema);
            }
            return item;
          })
        );
      } else if (typeof value === "object" && value !== null && !Buffer.isBuffer(value)) {
        if (value.__component) {
          const componentSchema = strapi.components[value.__component];
          if (componentSchema) {
            strapi.log.debug(`[Strapi Localize] Translating component: ${value.__component}`);
            translated[key] = await this.translateObject(value, targetLang, sourceLang, fieldsToIgnore, componentSchema);
          } else {
            strapi.log.warn(`[Strapi Localize] Component schema not found for: ${value.__component}`);
            translated[key] = value;
          }
        } else if (value.id && !value.__component) {
          strapi.log.debug(`[Strapi Localize] Preserving relation: key=${key}, id=${value.id}`);
          translated[key] = { id: value.id };
        } else if (value.mime || value.url || value.provider) {
          strapi.log.debug(`[Strapi Localize] Preserving media field: key=${key}`);
          translated[key] = value;
        } else if (fieldSchema && fieldSchema.type === "component") {
          if (fieldSchema.component && strapi.components[fieldSchema.component]) {
            const componentSchema = strapi.components[fieldSchema.component];
            strapi.log.debug(`[Strapi Localize] Translating schema-defined component: ${fieldSchema.component}`);
            translated[key] = await this.translateObject(value, targetLang, sourceLang, fieldsToIgnore, componentSchema);
          } else {
            translated[key] = value;
          }
        } else {
          translated[key] = await this.translateObject(value, targetLang, sourceLang, fieldsToIgnore, modelSchema);
        }
      } else {
        translated[key] = value;
      }
    }
    return translated;
  },
  async translateContent(entityId, model, targetLocale, sourceLocale = null) {
    const startTime = Date.now();
    strapi.log.info(`[Strapi Localize] Starting content translation: model=${model}, id=${entityId}, source=${sourceLocale || "auto"}, target=${targetLocale}`);
    const modelSchema = strapi.getModel(model);
    if (!modelSchema) {
      strapi.log.error(`[Strapi Localize] Model schema not found: model=${model}`);
      throw new Error(`Model schema not found: ${model}`);
    }
    const populateStrategy = this.buildPopulateStrategy(modelSchema, 5, 10);
    strapi.log.debug(`[Strapi Localize] Populate strategy: ${JSON.stringify(populateStrategy).substring(0, 500)}...`);
    const entity = await strapi.entityService.findOne(model, entityId, {
      populate: populateStrategy,
      locale: sourceLocale || "en"
    });
    if (!entity) {
      strapi.log.error(`[Strapi Localize] Entity not found: model=${model}, id=${entityId}`);
      throw new Error("Entity not found");
    }
    const pluginStore = strapi.store({
      environment: "",
      type: "plugin",
      name: "strapi-localize"
    });
    const settings2 = await pluginStore.get({ key: "settings" });
    const contentTypeConfig = settings2?.contentTypes?.[model] || {};
    const fieldsToIgnore = contentTypeConfig.ignoredFields || [];
    strapi.log.debug(`[Strapi Localize] Translation config: model=${model}, ignored_fields=${fieldsToIgnore.length}`);
    const systemFields = [
      "id",
      "documentId",
      "createdAt",
      "updatedAt",
      "publishedAt",
      "createdBy",
      "updatedBy",
      "locale",
      "localizations"
    ];
    const allFieldsToIgnore = [...systemFields, ...fieldsToIgnore];
    const translatedData = await this.translateObject(
      entity,
      targetLocale,
      sourceLocale,
      allFieldsToIgnore,
      modelSchema
    );
    delete translatedData.id;
    delete translatedData.localizations;
    const relations = {};
    for (const [key, attribute] of Object.entries(modelSchema.attributes)) {
      if (attribute.type === "relation") {
        if (entity[key]) {
          if (Array.isArray(entity[key])) {
            relations[key] = entity[key].map((item) => item.id || item);
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
      // CRITICAL: Link this translation to the source entry (PDF page 5)
      localizations: [entity.id]
    };
    const existingTranslation = await strapi.entityService.findMany(model, {
      filters: {
        locale: targetLocale
      },
      populate: ["localizations"]
    });
    const existingForSource = existingTranslation.find(
      (t) => t.localizations?.some((l) => l.id === entity.id)
    );
    let result;
    if (existingForSource) {
      strapi.log.debug(`[Strapi Localize] Updating existing translation: model=${model}, translation_id=${existingForSource.id}`);
      result = await strapi.entityService.update(model, existingForSource.id, {
        data: finalData
      });
    } else {
      strapi.log.debug(`[Strapi Localize] Creating new translation: model=${model}`);
      result = await strapi.entityService.create(model, {
        data: finalData
      }, {
        // Prevent this creation from triggering lifecycle hooks again
        // This stops infinite translation loops
      });
    }
    const duration = Date.now() - startTime;
    strapi.log.info(`[Strapi Localize] Content translation completed: model=${model}, id=${entityId}, target=${targetLocale}, duration=${duration}ms, result_id=${result.id}`);
    return result;
  },
  // Glossary Management Methods
  async listGlossaries() {
    try {
      strapi.log.debug("[Strapi Localize] Listing DeepL glossaries");
      const result = await this.makeDeeplRequest("glossaries", "GET");
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
      const entriesText = entries.map((entry) => `${entry.term}	${entry.translation}`).join("\n");
      const response = await this.makeDeeplRequest("glossaries", "POST", {
        name,
        source_lang: sourceLang,
        target_lang: targetLang,
        entries: entriesText,
        entries_format: "tsv"
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
      await this.makeDeeplRequest(`glossaries/${glossaryId}`, "DELETE");
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
      const response = await this.makeDeeplRequest(`glossaries/${glossaryId}/entries`, "GET");
      strapi.log.debug(`[Strapi Localize] Fetched glossary entries: id=${glossaryId}`);
      return response;
    } catch (error) {
      strapi.log.error(`[Strapi Localize] Failed to get glossary entries for ${glossaryId}: ${error.message}`);
      return [];
    }
  },
  async syncGlossaries() {
    const startTime = Date.now();
    strapi.log.info("[Strapi Localize] Starting glossary sync with DeepL");
    const settingsService = strapi.plugin("strapi-localize").service("settings");
    const settings2 = await settingsService.getSettings();
    const glossary = settings2.glossary || [];
    if (glossary.length === 0) {
      strapi.log.info("[Strapi Localize] No glossary entries configured, skipping sync");
      return;
    }
    strapi.log.debug(`[Strapi Localize] Syncing glossary: total_entries=${glossary.length}`);
    const existingGlossaries = await this.listGlossaries();
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
          translation
        });
      }
    }
    strapi.log.info(`[Strapi Localize] Glossary language pairs to sync: count=${Object.keys(glossariesByLangPair).length}`);
    const glossaryIds = {};
    let created = 0;
    let updated = 0;
    let failed = 0;
    for (const [langPair, entries] of Object.entries(glossariesByLangPair)) {
      const [sourceLang, targetLang] = langPair.split("_");
      const glossaryName = `Strapi Glossary (${sourceLang}-${targetLang})`;
      const existing = existingGlossaries.glossaries?.find(
        (g) => g.name === glossaryName && g.source_lang === sourceLang && g.target_lang === targetLang
      );
      if (existing) {
        strapi.log.debug(`[Strapi Localize] Updating existing glossary: lang_pair=${langPair}, id=${existing.glossary_id}`);
        await this.deleteGlossary(existing.glossary_id);
        updated++;
      } else {
        created++;
      }
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
    settings2.glossaryIds = glossaryIds;
    await settingsService.updateSettings(settings2);
    const duration = Date.now() - startTime;
    strapi.log.info(`[Strapi Localize] Glossary sync completed: created=${created}, updated=${updated}, failed=${failed}, duration=${duration}ms`);
    return glossaryIds;
  }
});
const deepl$1 = /* @__PURE__ */ getDefaultExportFromCjs(deepl);
const crypto = require$$0$1;
var settings = ({ strapi }) => ({
  getEncryptionKey() {
    const key = process.env.DEEPL_ENCRYPTION_KEY || strapi.config.get("admin.apiToken.salt");
    if (!key) {
      throw new Error("Encryption key not found. Please set DEEPL_ENCRYPTION_KEY or configure admin.apiToken.salt");
    }
    return crypto.createHash("sha256").update(key).digest();
  },
  encryptApiKey(apiKey) {
    if (!apiKey) return null;
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      let encrypted = cipher.update(apiKey, "utf8", "hex");
      encrypted += cipher.final("hex");
      strapi.log.debug("[Strapi Localize] API key encrypted successfully");
      return `${iv.toString("hex")}:${encrypted}`;
    } catch (error) {
      strapi.log.error(`[Strapi Localize] Failed to encrypt API key: ${error.message}`);
      throw new Error("Failed to encrypt API key");
    }
  },
  decryptApiKey(encryptedApiKey) {
    if (!encryptedApiKey) return null;
    try {
      if (!encryptedApiKey.includes(":")) {
        strapi.log.warn("[Strapi Localize] Detected legacy unencrypted API key, will be encrypted on next save");
        return encryptedApiKey;
      }
      const key = this.getEncryptionKey();
      const [ivHex, encrypted] = encryptedApiKey.split(":");
      const iv = Buffer.from(ivHex, "hex");
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");
      strapi.log.debug("[Strapi Localize] API key decrypted successfully");
      return decrypted;
    } catch (error) {
      strapi.log.error(`[Strapi Localize] Failed to decrypt API key: ${error.message}`);
      throw new Error("Failed to decrypt API key");
    }
  },
  async getSettings() {
    const pluginStore = strapi.store({
      environment: "",
      type: "plugin",
      name: "strapi-localize"
    });
    const settings2 = await pluginStore.get({ key: "settings" });
    if (!settings2) {
      return { apiKey: "", contentTypes: {}, autoTranslate: false, glossary: [] };
    }
    if (settings2.apiKey) {
      try {
        settings2.apiKey = this.decryptApiKey(settings2.apiKey);
      } catch (error) {
        strapi.log.warn("Could not decrypt API key, it may be corrupted");
        settings2.apiKey = "";
      }
    }
    return settings2;
  },
  async updateSettings(settings2) {
    const pluginStore = strapi.store({
      environment: "",
      type: "plugin",
      name: "strapi-localize"
    });
    const settingsToStore = { ...settings2 };
    if (settingsToStore.apiKey) {
      settingsToStore.apiKey = this.encryptApiKey(settingsToStore.apiKey);
    }
    await pluginStore.set({
      key: "settings",
      value: settingsToStore
    });
    return settings2;
  },
  async getContentTypeSettings(contentType) {
    const settings2 = await this.getSettings();
    return settings2.contentTypes?.[contentType] || {
      enabled: false,
      ignoredFields: [],
      autoTranslate: false
    };
  },
  async updateContentTypeSettings(contentType, contentTypeSettings) {
    const settings2 = await this.getSettings();
    if (!settings2.contentTypes) {
      settings2.contentTypes = {};
    }
    settings2.contentTypes[contentType] = contentTypeSettings;
    return await this.updateSettings(settings2);
  },
  async getGlossary() {
    const settings2 = await this.getSettings();
    return settings2.glossary || [];
  },
  async updateGlossary(glossary) {
    const settings2 = await this.getSettings();
    settings2.glossary = glossary;
    return await this.updateSettings(settings2);
  },
  async getGlossaryForLanguagePair(sourceLanguage, targetLanguage) {
    const glossary = await this.getGlossary();
    const glossaryMap = {};
    glossary.forEach((entry) => {
      if (entry.translations && entry.translations[targetLanguage]) {
        glossaryMap[entry.term] = entry.translations[targetLanguage];
      }
    });
    return glossaryMap;
  }
});
const settings$1 = /* @__PURE__ */ getDefaultExportFromCjs(settings);
const services = {
  deepl: deepl$1,
  settings: settings$1
};
const index = {
  bootstrap: bootstrap$1,
  destroy,
  register,
  config,
  controllers: controllers$1,
  contentTypes,
  middlewares,
  policies,
  routes: routes$1,
  services
};
export {
  index as default
};
