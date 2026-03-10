"use strict";
const require$$0 = require("axios");
const require$$0$1 = require("crypto");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const require$$0__default = /* @__PURE__ */ _interopDefault(require$$0);
const require$$0__default$1 = /* @__PURE__ */ _interopDefault(require$$0$1);
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
      const { model, result } = event;
      if (!result || !result.documentId) {
        strapi.log.debug(`[Strapi Localize] Lifecycle hook: no result or documentId`);
        return;
      }
      const documentId = result.documentId;
      const currentLocale = result.locale;
      strapi.log.debug(`[Strapi Localize] Lifecycle hook triggered: model=${model.uid}, documentId=${documentId}, locale=${currentLocale}`);
      const entryKey = `${model.uid}:${documentId}:${currentLocale}`;
      if (translatingEntries.has(entryKey)) {
        strapi.log.debug(`[Strapi Localize] Skipping - entry is being translated: ${entryKey}`);
        return;
      }
      const settings2 = await strapi.plugin("strapi-localize").service("settings").getSettings();
      if (!settings2.autoTranslate) {
        strapi.log.debug(`[Strapi Localize] Auto-translate disabled globally: model=${model.uid}, documentId=${documentId}`);
        return;
      }
      const contentTypeSettings = settings2.contentTypes?.[model.uid];
      if (!contentTypeSettings?.enabled || !contentTypeSettings?.autoTranslate) {
        strapi.log.debug(`[Strapi Localize] Auto-translate not enabled for content type: model=${model.uid}`);
        return;
      }
      const modelSchema = strapi.getModel(model.uid);
      if (!modelSchema.pluginOptions?.i18n?.localized) {
        strapi.log.debug(`[Strapi Localize] Content type not localized: model=${model.uid}`);
        return;
      }
      const i18nService = strapi.plugin("strapi-localize").service("i18n");
      const allLocales = await i18nService.getLocales();
      const targetLocales = allLocales.filter((l) => l.code !== currentLocale);
      if (targetLocales.length === 0) {
        strapi.log.debug(`[Strapi Localize] No target locales available: model=${model.uid}, documentId=${documentId}`);
        return;
      }
      const existingLocalizations = [];
      for (const locale of allLocales) {
        if (locale.code === currentLocale) continue;
        const existing = await i18nService.getExistingLocalization(model.uid, documentId, locale.code);
        if (existing) {
          existingLocalizations.push(locale.code);
        }
      }
      const localesNeedingTranslation = targetLocales.filter(
        (l) => !existingLocalizations.includes(l.code)
      );
      const localesToTranslate = localesNeedingTranslation.length > 0 ? localesNeedingTranslation : targetLocales;
      strapi.log.info(`[Strapi Localize] Auto-translate triggered: model=${model.uid}, documentId=${documentId}, source=${currentLocale}, targets=[${localesToTranslate.map((l) => l.code).join(", ")}]`);
      let successCount = 0;
      let failCount = 0;
      const translationService = strapi.plugin("strapi-localize").service("translation");
      for (const targetLocale of localesToTranslate) {
        const targetEntryKey = `${model.uid}:${documentId}:${targetLocale.code}`;
        translatingEntries.add(targetEntryKey);
        try {
          await translationService.translateContent(
            documentId,
            model.uid,
            targetLocale.code,
            currentLocale
          );
          strapi.log.info(
            `[Strapi Localize] Auto-translation successful: model=${model.uid}, documentId=${documentId}, source=${currentLocale}, target=${targetLocale.code}`
          );
          successCount++;
        } catch (error) {
          strapi.log.error(
            `[Strapi Localize] Auto-translation failed: model=${model.uid}, documentId=${documentId}, target=${targetLocale.code}, error=${error.message}`
          );
          failCount++;
        } finally {
          translatingEntries.delete(targetEntryKey);
        }
      }
      strapi.log.info(`[Strapi Localize] Auto-translate completed: model=${model.uid}, documentId=${documentId}, successful=${successCount}, failed=${failCount}`);
    };
    const markAsTranslating = (uid, documentId, locale) => {
      const key = `${uid}:${documentId}:${locale}`;
      translatingEntries.add(key);
      return key;
    };
    const unmarkAsTranslating = (key) => {
      translatingEntries.delete(key);
    };
    const isTranslating = (uid, documentId, locale) => {
      const key = `${uid}:${documentId}:${locale}`;
      return translatingEntries.has(key);
    };
    return {
      translateOnUpdate,
      markAsTranslating,
      unmarkAsTranslating,
      isTranslating
    };
  };
  return lifecycle$1;
}
var bootstrap = async ({ strapi }) => {
  strapi.log.info("[Strapi Localize] Plugin initializing...");
  requireLifecycle()({ strapi });
  const recentTranslations = /* @__PURE__ */ new Map();
  const DEBOUNCE_MS = 3e3;
  const localizableModels = Object.keys(strapi.contentTypes).filter((key) => {
    const contentType = strapi.contentTypes[key];
    return (
      // Include both collection types and single types
      (contentType.kind === "collectionType" || contentType.kind === "singleType") && // Exclude system/plugin content types
      !key.startsWith("plugin::") && !key.startsWith("strapi::") && !key.startsWith("admin::") && // Must have i18n enabled
      contentType.pluginOptions?.i18n?.localized === true
    );
  });
  strapi.log.info(`[Strapi Localize] Found ${localizableModels.length} localizable content types`);
  if (localizableModels.length > 0) {
    strapi.log.debug(`[Strapi Localize] Localizable models: ${localizableModels.join(", ")}`);
  }
  const scheduleTranslation = (event, hookType) => {
    const { model, result } = event;
    if (!result || !result.documentId) {
      return;
    }
    const cleanEvent = {
      model: { uid: model.uid },
      result: {
        documentId: result.documentId,
        locale: result.locale
      }
    };
    const translationKey = `${model.uid}:${result.documentId}:${result.locale}`;
    const lastTranslation = recentTranslations.get(translationKey);
    if (lastTranslation && Date.now() - lastTranslation < DEBOUNCE_MS) {
      strapi.log.debug(`[Strapi Localize] Debouncing ${hookType} for ${translationKey}`);
      return;
    }
    recentTranslations.set(translationKey, Date.now());
    if (recentTranslations.size > 100) {
      const now = Date.now();
      for (const [key, time] of recentTranslations.entries()) {
        if (now - time > DEBOUNCE_MS * 2) {
          recentTranslations.delete(key);
        }
      }
    }
    strapi.log.debug(`[Strapi Localize] Scheduling translation from ${hookType}: ${translationKey}`);
    process.nextTick(() => {
      setTimeout(async () => {
        try {
          await strapi.db.transaction(async () => {
            const translationService = strapi.plugin("strapi-localize").service("translation");
            const settingsService = strapi.plugin("strapi-localize").service("settings");
            const i18nService = strapi.plugin("strapi-localize").service("i18n");
            const settings2 = await settingsService.getSettings();
            if (!settings2.autoTranslate) {
              strapi.log.debug(`[Strapi Localize] Auto-translate disabled globally`);
              return;
            }
            const contentTypeSettings = settings2.contentTypes?.[cleanEvent.model.uid];
            if (!contentTypeSettings?.enabled || !contentTypeSettings?.autoTranslate) {
              strapi.log.debug(`[Strapi Localize] Auto-translate not enabled for ${cleanEvent.model.uid}`);
              return;
            }
            const allLocales = await i18nService.getLocales();
            const targetLocales = allLocales.filter((l) => l.code !== cleanEvent.result.locale);
            if (targetLocales.length === 0) {
              return;
            }
            strapi.log.info(`[Strapi Localize] Auto-translate starting: model=${cleanEvent.model.uid}, documentId=${cleanEvent.result.documentId}, source=${cleanEvent.result.locale}, targets=[${targetLocales.map((l) => l.code).join(", ")}]`);
            let successCount = 0;
            let failCount = 0;
            for (const targetLocale of targetLocales) {
              try {
                await translationService.translateContent(
                  cleanEvent.result.documentId,
                  cleanEvent.model.uid,
                  targetLocale.code,
                  cleanEvent.result.locale
                );
                strapi.log.info(`[Strapi Localize] Auto-translation successful: target=${targetLocale.code}`);
                successCount++;
              } catch (error) {
                strapi.log.error(`[Strapi Localize] Auto-translation failed: target=${targetLocale.code}, error=${error.message}`);
                failCount++;
              }
            }
            strapi.log.info(`[Strapi Localize] Auto-translate completed: successful=${successCount}, failed=${failCount}`);
          });
        } catch (error) {
          strapi.log.error(`[Strapi Localize] Error in ${hookType} hook: ${error.message}`);
        }
      }, 3e3);
    });
  };
  strapi.db.lifecycles.subscribe({
    models: localizableModels,
    /**
     * After content is created
     */
    async afterCreate(event) {
      scheduleTranslation(event, "afterCreate");
    },
    /**
     * After content is updated
     */
    async afterUpdate(event) {
      scheduleTranslation(event, "afterUpdate");
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
  /**
   * Validate documentId (v5 format - string)
   */
  validateDocumentId(documentId) {
    if (!documentId) {
      return { valid: false, error: "documentId is required" };
    }
    if (typeof documentId !== "string") {
      return { valid: false, error: "documentId must be a string" };
    }
    if (documentId.trim().length === 0) {
      return { valid: false, error: "documentId cannot be empty" };
    }
    return { valid: true };
  },
  /**
   * Translate a single entry
   * POST /admin/strapi-localize/translate
   * Body: { documentId, model, targetLocale, sourceLocale? }
   */
  async translate(ctx) {
    const startTime = Date.now();
    const { documentId, model, targetLocale, sourceLocale } = ctx.request.body;
    strapi.log.info(`[Strapi Localize] Translation request: model=${model}, documentId=${documentId}, target=${targetLocale}, source=${sourceLocale || "auto"}`);
    try {
      if (!documentId || !model || !targetLocale) {
        strapi.log.warn(`[Strapi Localize] Translation validation failed: Missing required parameters`);
        return ctx.badRequest("Missing required parameters: documentId, model, targetLocale");
      }
      const documentIdValidation = this.validateDocumentId(documentId);
      if (!documentIdValidation.valid) {
        strapi.log.warn(`[Strapi Localize] Translation validation failed: ${documentIdValidation.error}`);
        return ctx.badRequest(documentIdValidation.error);
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
      const result = await strapi.plugin("strapi-localize").service("translation").translateContent(documentId, model, targetLocale, sourceLocale);
      const duration = Date.now() - startTime;
      strapi.log.info(`[Strapi Localize] Translation completed: model=${model}, documentId=${documentId}, duration=${duration}ms`);
      ctx.body = result;
    } catch (error) {
      const duration = Date.now() - startTime;
      strapi.log.error(`[Strapi Localize] Translation error: model=${model}, documentId=${documentId}, duration=${duration}ms, error=${error.message}`);
      ctx.throw(500, error.message || "Translation failed");
    }
  },
  /**
   * Translate multiple entries
   * POST /admin/strapi-localize/translate-batch
   * Body: { documentIds, model, targetLocale, sourceLocale? }
   */
  async translateBatch(ctx) {
    const startTime = Date.now();
    const { documentIds, model, targetLocale, sourceLocale } = ctx.request.body;
    strapi.log.info(`[Strapi Localize] Batch translation request: model=${model}, count=${documentIds?.length || 0}, target=${targetLocale}, source=${sourceLocale || "auto"}`);
    try {
      if (!documentIds || !model || !targetLocale) {
        strapi.log.warn(`[Strapi Localize] Batch translation validation failed: Missing required parameters`);
        return ctx.badRequest("Missing required parameters: documentIds, model, targetLocale");
      }
      if (!Array.isArray(documentIds)) {
        strapi.log.warn(`[Strapi Localize] Batch translation validation failed: documentIds must be an array`);
        return ctx.badRequest("documentIds must be an array");
      }
      if (documentIds.length === 0) {
        strapi.log.warn(`[Strapi Localize] Batch translation validation failed: Empty array`);
        return ctx.badRequest("documentIds array cannot be empty");
      }
      if (documentIds.length > 50) {
        strapi.log.warn(`[Strapi Localize] Batch translation validation failed: Batch size ${documentIds.length} exceeds maximum of 50`);
        return ctx.badRequest("Maximum batch size is 50 items");
      }
      for (const docId of documentIds) {
        const docIdValidation = this.validateDocumentId(docId);
        if (!docIdValidation.valid) {
          return ctx.badRequest(`Invalid documentId '${docId}': ${docIdValidation.error}`);
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
      const translationService = strapi.plugin("strapi-localize").service("translation");
      const results = await Promise.allSettled(
        documentIds.map(
          (docId) => translationService.translateContent(docId, model, targetLocale, sourceLocale).catch((error) => ({
            documentId: docId,
            error: error.message || "Translation failed",
            status: "failed"
          }))
        )
      );
      const formattedResults = results.map((result, index2) => {
        if (result.status === "fulfilled") {
          if (result.value?.error) {
            return {
              documentId: documentIds[index2],
              status: "failed",
              error: result.value.error
            };
          }
          return {
            documentId: result.value.documentId,
            status: "success",
            data: result.value
          };
        } else {
          return {
            documentId: documentIds[index2],
            status: "failed",
            error: result.reason?.message || "Unknown error"
          };
        }
      });
      const successCount = formattedResults.filter((r) => r.status === "success").length;
      const failureCount = formattedResults.filter((r) => r.status === "failed").length;
      const duration = Date.now() - startTime;
      strapi.log.info(`[Strapi Localize] Batch translation completed: model=${model}, total=${documentIds.length}, successful=${successCount}, failed=${failureCount}, duration=${duration}ms`);
      if (failureCount > 0) {
        const failedIds = formattedResults.filter((r) => r.status === "failed").map((r) => r.documentId);
        strapi.log.warn(`[Strapi Localize] Failed translations for documentIds: ${failedIds.join(", ")}`);
      }
      ctx.body = {
        results: formattedResults,
        summary: {
          total: documentIds.length,
          successful: successCount,
          failed: failureCount
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      strapi.log.error(`[Strapi Localize] Batch translation error: model=${model}, count=${documentIds?.length || 0}, duration=${duration}ms, error=${error.message}`);
      ctx.throw(500, error.message || "Batch translation failed");
    }
  },
  /**
   * Get available DeepL languages
   * GET /admin/strapi-localize/languages
   */
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
          policies: ["admin::isAuthenticatedAdmin"]
        }
      },
      {
        method: "PUT",
        path: "/settings",
        handler: "settings.update",
        config: {
          policies: ["admin::isAuthenticatedAdmin"]
        }
      },
      {
        method: "GET",
        path: "/content-types",
        handler: "settings.getContentTypes",
        config: {
          policies: ["admin::isAuthenticatedAdmin"]
        }
      },
      {
        method: "POST",
        path: "/test-connection",
        handler: "settings.testConnection",
        config: {
          policies: ["admin::isAuthenticatedAdmin"]
        }
      },
      {
        method: "POST",
        path: "/translate",
        handler: "translate.translate",
        config: {
          policies: ["admin::isAuthenticatedAdmin"]
        }
      },
      {
        method: "POST",
        path: "/translate-batch",
        handler: "translate.translateBatch",
        config: {
          policies: ["admin::isAuthenticatedAdmin"]
        }
      },
      {
        method: "GET",
        path: "/languages",
        handler: "translate.getLanguages",
        config: {
          policies: ["admin::isAuthenticatedAdmin"]
        }
      },
      {
        method: "POST",
        path: "/sync-glossaries",
        handler: "settings.syncGlossaries",
        config: {
          policies: ["admin::isAuthenticatedAdmin"]
        }
      },
      {
        method: "GET",
        path: "/list-glossaries",
        handler: "settings.listGlossaries",
        config: {
          policies: ["admin::isAuthenticatedAdmin"]
        }
      }
    ]
  }
};
const routes$1 = /* @__PURE__ */ getDefaultExportFromCjs(routes);
const axios = require$$0__default.default;
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
    if (!apiKey || typeof apiKey !== "string") {
      return false;
    }
    return apiKey.endsWith(":fx");
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
    const settingsService = strapi.plugin("strapi-localize").service("settings");
    const settings2 = await settingsService.getSettings();
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
        headers: {
          "Authorization": `DeepL-Auth-Key ${apiKey}`
        },
        params: {
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
    const data = {
      text: [text],
      target_lang: targetLang.toUpperCase()
    };
    if (sourceLang) {
      data.source_lang = sourceLang.toUpperCase();
    }
    const settingsService = strapi.plugin("strapi-localize").service("settings");
    const settings2 = await settingsService.getSettings();
    const glossaryIds = settings2.glossaryIds || {};
    const langPairKey = `${(sourceLang || "en").toLowerCase()}_${targetLang.toLowerCase()}`;
    const glossaryId = glossaryIds[langPairKey];
    if (glossaryId) {
      data.glossary_id = glossaryId;
      strapi.log.debug(`[Strapi Localize] Using glossary: id=${glossaryId}, lang_pair=${langPairKey}`);
    }
    const isFree = this.isFreeApiKey(apiKey);
    const baseUrl = isFree ? "https://api-free.deepl.com" : "https://api.deepl.com";
    const textPreview = text.length > 50 ? `${text.substring(0, 50)}...` : text;
    strapi.log.debug(`[Strapi Localize] Translating text: source=${sourceLang || "auto"}, target=${targetLang}, length=${text.length}, preview="${textPreview}"`);
    try {
      return await this.retryWithBackoff(async () => {
        const response = await axios.post(`${baseUrl}/v2/translate`, data, {
          headers: {
            "Authorization": `DeepL-Auth-Key ${apiKey}`,
            "Content-Type": "application/json"
          }
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
    const populate2 = {};
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
          populate2[attributeName] = { populate: "*" };
        } else {
          populate2[attributeName] = true;
        }
      }
      if (attribute.type === "media") {
        populate2[attributeName] = true;
      }
      if (attribute.type === "component") {
        if (attribute.component && strapi.components[attribute.component]) {
          const componentSchema = strapi.components[attribute.component];
          strapi.log.debug(`[Strapi Localize] Building populate for component: ${attribute.component}, depth=${depth}`);
          if (depth > 1) {
            populate2[attributeName] = {
              populate: this.buildPopulateStrategy(componentSchema, depth - 1, maxDepth)
            };
          } else {
            populate2[attributeName] = { populate: "*" };
          }
        } else {
          populate2[attributeName] = { populate: "*" };
        }
      }
      if (attribute.type === "dynamiczone") {
        populate2[attributeName] = { on: {} };
        if (attribute.components && Array.isArray(attribute.components)) {
          for (const componentName of attribute.components) {
            if (strapi.components[componentName]) {
              const componentSchema = strapi.components[componentName];
              strapi.log.debug(`[Strapi Localize] Building populate for dynamic zone component: ${componentName}, depth=${depth}`);
              if (depth > 1) {
                populate2[attributeName].on[componentName] = {
                  populate: this.buildPopulateStrategy(componentSchema, depth - 1, maxDepth)
                };
              } else {
                populate2[attributeName].on[componentName] = { populate: "*" };
              }
            } else {
              strapi.log.warn(`[Strapi Localize] Component schema not found: ${componentName}`);
              populate2[attributeName].on[componentName] = { populate: "*" };
            }
          }
        }
      }
    }
    return Object.keys(populate2).length > 0 ? populate2 : "*";
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
      for (const [targetLang, translation2] of Object.entries(entry.translations || {})) {
        if (!translation2) continue;
        const key = `en_${targetLang}`;
        if (!glossariesByLangPair[key]) {
          glossariesByLangPair[key] = [];
        }
        glossariesByLangPair[key].push({
          term: entry.term,
          translation: translation2
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
const crypto = require$$0__default$1.default;
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
var i18n = ({ strapi }) => ({
  /**
   * Get all available locales from Strapi i18n plugin
   * @returns {Promise<Array>} Array of locale objects
   */
  async getLocales() {
    return strapi.plugin("i18n").service("locales").find();
  },
  /**
   * Get the default locale code
   * @returns {Promise<string>} Default locale code (e.g., 'en')
   */
  async getDefaultLocaleCode() {
    return strapi.plugin("i18n").service("locales").getDefaultLocale();
  },
  /**
   * Check if a locale exists in Strapi
   * @param {string} localeCode - Locale code to check
   * @returns {Promise<boolean>}
   */
  async localeExists(localeCode) {
    const locales = await this.getLocales();
    return locales.some((l) => l.code === localeCode);
  },
  /**
   * Get an entry in a specific locale using Documents API
   * @param {string} uid - Content type UID
   * @param {string} documentId - Document ID
   * @param {string} locale - Target locale
   * @param {object} populate - Population strategy
   * @returns {Promise<object|null>}
   */
  async getEntryInLocale(uid, documentId, locale, populate2 = "*") {
    try {
      const entry = await strapi.documents(uid).findOne({
        documentId,
        locale,
        populate: populate2
      });
      return entry;
    } catch (error) {
      strapi.log.debug(`[Strapi Localize] Entry not found in locale: uid=${uid}, documentId=${documentId}, locale=${locale}`);
      return null;
    }
  },
  /**
   * Create a localization for an existing entry (v5 Documents API)
   * In Strapi v5, all localizations of a document share the same documentId.
   * We need to pass the documentId when creating to link the localization properly.
   *
   * @param {string} uid - Content type UID
   * @param {object} baseEntry - Source entry (with documentId)
   * @param {object} newEntryData - Translated data
   * @param {string} targetLocale - Target locale code
   * @returns {Promise<object>}
   */
  async createLocalization(uid, baseEntry, newEntryData, targetLocale) {
    try {
      const sourceDocumentId = baseEntry.documentId;
      strapi.log.debug(`[Strapi Localize] Creating localization: uid=${uid}, documentId=${sourceDocumentId}, locale=${targetLocale}`);
      const existingLocalization = await this.getExistingLocalization(uid, sourceDocumentId, targetLocale);
      if (existingLocalization) {
        strapi.log.warn(`[Strapi Localize] Localization already exists, updating instead: uid=${uid}, documentId=${sourceDocumentId}, locale=${targetLocale}`);
        return this.updateLocalization(uid, sourceDocumentId, newEntryData, targetLocale);
      }
      const cleanData = this.omitSystemFields(newEntryData);
      cleanData.publishedAt = null;
      const createdEntry = await strapi.documents(uid).create({
        documentId: sourceDocumentId,
        locale: targetLocale,
        data: cleanData
      });
      strapi.log.info(`[Strapi Localize] Localization created: uid=${uid}, documentId=${createdEntry.documentId}, locale=${targetLocale}`);
      return createdEntry;
    } catch (error) {
      strapi.log.error(`[Strapi Localize] Failed to create localization: ${error.message}`);
      throw error;
    }
  },
  /**
   * Update an existing localization (v5 Documents API)
   * @param {string} uid - Content type UID
   * @param {string} documentId - Document ID to update
   * @param {object} data - Updated data
   * @param {string} locale - Locale of the document
   * @returns {Promise<object>}
   */
  async updateLocalization(uid, documentId, data, locale) {
    try {
      strapi.log.debug(`[Strapi Localize] Updating localization: uid=${uid}, documentId=${documentId}, locale=${locale}`);
      const cleanData = this.omitSystemFields(data);
      const updatedEntry = await strapi.documents(uid).update({
        documentId,
        locale,
        data: cleanData
      });
      strapi.log.info(`[Strapi Localize] Localization updated: uid=${uid}, documentId=${documentId}, locale=${locale}`);
      return updatedEntry;
    } catch (error) {
      strapi.log.error(`[Strapi Localize] Failed to update localization: ${error.message}`);
      throw error;
    }
  },
  /**
   * Check if a localization exists for a document in a specific locale
   * @param {string} uid - Content type UID
   * @param {string} documentId - Document ID
   * @param {string} locale - Target locale
   * @returns {Promise<object|null>}
   */
  async getExistingLocalization(uid, documentId, locale) {
    try {
      const entry = await strapi.documents(uid).findOne({
        documentId,
        locale
      });
      return entry;
    } catch (error) {
      return null;
    }
  },
  /**
   * Remove system fields that should not be copied during translation
   * @param {object} data - Data object
   * @returns {object} Cleaned data
   */
  omitSystemFields(data) {
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
    const cleaned = { ...data };
    for (const field of systemFields) {
      delete cleaned[field];
    }
    return cleaned;
  },
  /**
   * Recursively remove system fields from nested objects
   * @param {object} obj - Object to clean
   * @param {Array<string>} keys - Keys to remove
   * @returns {object} Cleaned object
   */
  omitDeep(obj, keys = ["id", "documentId", "createdAt", "updatedAt", "publishedAt", "createdBy", "updatedBy"]) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.omitDeep(item, keys));
    }
    if (obj !== null && typeof obj === "object") {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        if (keys.includes(key)) {
          continue;
        }
        result[key] = this.omitDeep(value, keys);
      }
      return result;
    }
    return obj;
  },
  /**
   * Remove documentId from all nested objects except media objects
   * Media objects need documentId preserved for proper linking
   * @param {object} obj - Object to process
   * @returns {object} Processed object
   */
  dropDocumentIdExceptMedia(obj) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.dropDocumentIdExceptMedia(item));
    }
    if (obj !== null && typeof obj === "object") {
      const isMedia2 = obj.mime || obj.url || obj.provider;
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === "documentId" && !isMedia2) {
          continue;
        }
        result[key] = this.dropDocumentIdExceptMedia(value);
      }
      return result;
    }
    return obj;
  }
});
const i18n$1 = /* @__PURE__ */ getDefaultExportFromCjs(i18n);
const DEFAULT_DEPTH = 6;
const getModelPopulationAttributes = (model) => {
  if (model.uid === "plugin::upload.file") {
    const { related, ...attributes } = model.attributes;
    return attributes;
  }
  return model.attributes;
};
const buildPopulateObject$1 = (strapi, modelUid, maxDepth = DEFAULT_DEPTH, ignore = ["localizations", "createdBy", "updatedBy"]) => {
  if (maxDepth <= 1) {
    return true;
  }
  if (modelUid === "admin::user") {
    return void 0;
  }
  const populate2 = {};
  const model = strapi.getModel(modelUid);
  if (!model) {
    return void 0;
  }
  if (ignore && !ignore.includes(model.collectionName)) {
    ignore.push(model.collectionName);
  }
  const attributes = getModelPopulationAttributes(model);
  for (const [key, value] of Object.entries(attributes)) {
    if (ignore?.includes(key)) continue;
    if (value.type === "component") {
      const componentPopulate = buildPopulateObject$1(strapi, value.component, maxDepth - 1, ignore);
      if (componentPopulate) {
        populate2[key] = componentPopulate;
      }
    } else if (value.type === "dynamiczone") {
      const dynamicPopulate = {};
      for (const componentName of value.components || []) {
        const componentPop = buildPopulateObject$1(strapi, componentName, maxDepth - 1, ignore);
        if (componentPop) {
          dynamicPopulate[componentName] = componentPop;
        }
      }
      populate2[key] = Object.keys(dynamicPopulate).length > 0 ? { on: dynamicPopulate } : true;
    } else if (value.type === "relation") {
      const relationPopulate = buildPopulateObject$1(strapi, value.target, 1, ignore);
      if (relationPopulate) {
        populate2[key] = relationPopulate;
      }
    } else if (value.type === "media") {
      populate2[key] = true;
    }
  }
  return Object.keys(populate2).length > 0 ? { populate: populate2 } : true;
};
var populate = {
  buildPopulateObject: buildPopulateObject$1
};
const getAttribute$1 = (model, attribute) => {
  if (!model || !model.attributes) {
    return void 0;
  }
  return model.attributes[attribute];
};
const isComponent$2 = (attributeObj) => {
  return attributeObj?.type === "component";
};
const isDynamicZone$2 = (attributeObj) => {
  return attributeObj?.type === "dynamiczone";
};
const isRepeatable$1 = (attributeObj) => {
  return isComponent$2(attributeObj) && !!attributeObj.repeatable;
};
const isRelation$2 = (attributeObj) => {
  return attributeObj?.type === "relation" && attributeObj?.target !== "plugin::upload.file";
};
const isMedia$1 = (attributeObj) => {
  return attributeObj?.type === "media" || attributeObj?.type === "relation" && attributeObj?.target === "plugin::upload.file";
};
const isTranslatable$1 = (attributeObj) => {
  const translatableTypes = ["string", "text", "richtext", "blocks"];
  return translatableTypes.includes(attributeObj?.type);
};
var modelUtils = {
  getAttribute: getAttribute$1,
  isComponent: isComponent$2,
  isDynamicZone: isDynamicZone$2,
  isRepeatable: isRepeatable$1,
  isRelation: isRelation$2,
  isMedia: isMedia$1,
  isTranslatable: isTranslatable$1
};
const {
  getAttribute,
  isRelation: isRelation$1,
  isComponent: isComponent$1,
  isDynamicZone: isDynamicZone$1,
  isRepeatable
} = modelUtils;
const findLocalizedRelation = async (strapi, targetUid, documentId, targetLocale) => {
  if (!documentId) {
    return null;
  }
  try {
    const localizedEntry = await strapi.documents(targetUid).findOne({
      documentId,
      locale: targetLocale
    });
    if (localizedEntry) {
      strapi.log.debug(`[Strapi Localize] Found localized relation: uid=${targetUid}, documentId=${documentId}, locale=${targetLocale}`);
      return localizedEntry;
    }
    strapi.log.debug(`[Strapi Localize] No localized relation found: uid=${targetUid}, documentId=${documentId}, locale=${targetLocale}`);
    return null;
  } catch (error) {
    strapi.log.warn(`[Strapi Localize] Failed to find localized relation: ${error.message}`);
    return null;
  }
};
const processRelations = async (strapi, data, sourceData, modelSchema, targetLocale) => {
  const result = { ...data };
  if (!modelSchema || !modelSchema.attributes) {
    return result;
  }
  for (const [key, attribute] of Object.entries(modelSchema.attributes)) {
    if (isRelation$1(attribute)) {
      const sourceValue = sourceData[key];
      if (!sourceValue) {
        continue;
      }
      const targetUid = attribute.target;
      const localizedDocumentIds = [];
      const items = Array.isArray(sourceValue) ? sourceValue : [sourceValue];
      for (const item of items) {
        if (!item || typeof item !== "object") {
          continue;
        }
        const documentId = item.documentId;
        if (!documentId) {
          continue;
        }
        const localizedEntry = await findLocalizedRelation(strapi, targetUid, documentId, targetLocale);
        if (localizedEntry) {
          localizedDocumentIds.push(localizedEntry.documentId);
        }
      }
      if (localizedDocumentIds.length > 0) {
        if (Array.isArray(sourceValue)) {
          result[key] = localizedDocumentIds;
        } else {
          result[key] = localizedDocumentIds[0];
        }
        strapi.log.debug(`[Strapi Localize] Set localized relation: key=${key}, count=${localizedDocumentIds.length}`);
      } else {
        delete result[key];
        strapi.log.debug(`[Strapi Localize] Removed relation (no localized version): key=${key}`);
      }
    }
  }
  return result;
};
const processRelationsDeep$1 = async (strapi, data, sourceData, modelSchema, targetLocale) => {
  if (!data || typeof data !== "object") {
    return data;
  }
  let result = { ...data };
  result = await processRelations(strapi, result, sourceData, modelSchema, targetLocale);
  if (!modelSchema || !modelSchema.attributes) {
    return result;
  }
  for (const [key, attribute] of Object.entries(modelSchema.attributes)) {
    if (!result[key] || !sourceData[key]) {
      continue;
    }
    if (isComponent$1(attribute)) {
      const componentSchema = strapi.components[attribute.component];
      if (!componentSchema) {
        continue;
      }
      if (isRepeatable(attribute)) {
        const processedItems = [];
        const sourceItems = Array.isArray(sourceData[key]) ? sourceData[key] : [];
        const dataItems = Array.isArray(result[key]) ? result[key] : [];
        for (let i = 0; i < dataItems.length; i++) {
          const sourceItem = sourceItems[i] || {};
          const processedItem = await processRelationsDeep$1(
            strapi,
            dataItems[i],
            sourceItem,
            componentSchema,
            targetLocale
          );
          processedItems.push(processedItem);
        }
        result[key] = processedItems;
      } else {
        result[key] = await processRelationsDeep$1(
          strapi,
          result[key],
          sourceData[key],
          componentSchema,
          targetLocale
        );
      }
    } else if (isDynamicZone$1(attribute)) {
      const processedItems = [];
      const sourceItems = Array.isArray(sourceData[key]) ? sourceData[key] : [];
      const dataItems = Array.isArray(result[key]) ? result[key] : [];
      for (let i = 0; i < dataItems.length; i++) {
        const item = dataItems[i];
        const sourceItem = sourceItems[i] || {};
        if (item && item.__component) {
          const componentSchema = strapi.components[item.__component];
          if (componentSchema) {
            const processedItem = await processRelationsDeep$1(
              strapi,
              item,
              sourceItem,
              componentSchema,
              targetLocale
            );
            processedItems.push(processedItem);
          } else {
            processedItems.push(item);
          }
        } else {
          processedItems.push(item);
        }
      }
      result[key] = processedItems;
    }
  }
  return result;
};
var relationHandler = {
  processRelationsDeep: processRelationsDeep$1
};
const { buildPopulateObject } = populate;
const { processRelationsDeep } = relationHandler;
const {
  isComponent,
  isDynamicZone,
  isTranslatable,
  isMedia,
  isRelation
} = modelUtils;
var translation = ({ strapi }) => ({
  /**
   * Translate content from source locale to target locale
   * Uses Documents API (v5 pattern)
   *
   * @param {string} documentId - Document ID to translate
   * @param {string} uid - Content type UID
   * @param {string} targetLocale - Target locale code
   * @param {string} sourceLocale - Source locale code (optional)
   * @returns {Promise<object>} Translated entry
   */
  async translateContent(documentId, uid, targetLocale, sourceLocale = null) {
    const startTime = Date.now();
    strapi.log.info(`[Strapi Localize] Starting translation: uid=${uid}, documentId=${documentId}, source=${sourceLocale || "auto"}, target=${targetLocale}`);
    const i18nService = strapi.plugin("strapi-localize").service("i18n");
    const deeplService = strapi.plugin("strapi-localize").service("deepl");
    const settingsService = strapi.plugin("strapi-localize").service("settings");
    const modelSchema = strapi.getModel(uid);
    if (!modelSchema) {
      throw new Error(`Model schema not found: ${uid}`);
    }
    const effectiveSourceLocale = sourceLocale || await i18nService.getDefaultLocaleCode();
    const populateStrategy = buildPopulateObject(strapi, uid);
    strapi.log.debug(`[Strapi Localize] Populate strategy: ${JSON.stringify(populateStrategy).substring(0, 300)}...`);
    const sourceEntry = await strapi.documents(uid).findOne({
      documentId,
      locale: effectiveSourceLocale,
      ...populateStrategy
    });
    if (!sourceEntry) {
      throw new Error(`Entry not found: uid=${uid}, documentId=${documentId}, locale=${effectiveSourceLocale}`);
    }
    strapi.log.debug(`[Strapi Localize] Fetched source entry: documentId=${sourceEntry.documentId}`);
    const settings2 = await settingsService.getSettings();
    const contentTypeConfig = settings2?.contentTypes?.[uid] || {};
    const ignoredFields = contentTypeConfig.ignoredFields || [];
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
    const allFieldsToIgnore = [.../* @__PURE__ */ new Set([...systemFields, ...ignoredFields])];
    const translatedData = await this.translateObject(
      deeplService,
      sourceEntry,
      targetLocale,
      effectiveSourceLocale,
      allFieldsToIgnore,
      modelSchema
    );
    const dataWithLocalizedRelations = await processRelationsDeep(
      strapi,
      translatedData,
      sourceEntry,
      modelSchema,
      targetLocale
    );
    const cleanedData = i18nService.omitSystemFields(dataWithLocalizedRelations);
    const finalData = i18nService.dropDocumentIdExceptMedia(cleanedData);
    const existingTranslation = await i18nService.getExistingLocalization(uid, documentId, targetLocale);
    let result;
    if (existingTranslation) {
      strapi.log.debug(`[Strapi Localize] Updating existing translation: documentId=${documentId}`);
      result = await i18nService.updateLocalization(uid, documentId, finalData, targetLocale);
    } else {
      strapi.log.debug(`[Strapi Localize] Creating new translation: documentId=${documentId}`);
      result = await i18nService.createLocalization(uid, sourceEntry, finalData, targetLocale);
    }
    const duration = Date.now() - startTime;
    strapi.log.info(`[Strapi Localize] Translation completed: uid=${uid}, documentId=${documentId}, target=${targetLocale}, duration=${duration}ms`);
    return result;
  },
  /**
   * Recursively translate an object's translatable fields
   *
   * @param {object} deeplService - DeepL service instance
   * @param {object} obj - Object to translate
   * @param {string} targetLang - Target language code
   * @param {string} sourceLang - Source language code
   * @param {Array<string>} fieldsToIgnore - Fields to skip
   * @param {object} modelSchema - Model schema
   * @returns {Promise<object>} Translated object
   */
  async translateObject(deeplService, obj, targetLang, sourceLang, fieldsToIgnore, modelSchema) {
    const translated = {};
    for (const [key, value] of Object.entries(obj)) {
      if (fieldsToIgnore.includes(key) || ["id", "__component", "__typename", "documentId"].includes(key)) {
        translated[key] = value;
        continue;
      }
      const fieldSchema = modelSchema?.attributes?.[key];
      if (this.shouldTranslateField(value, fieldSchema)) {
        translated[key] = await deeplService.translate(value, targetLang, sourceLang);
      } else if (Array.isArray(value)) {
        translated[key] = await this.translateArray(
          deeplService,
          value,
          targetLang,
          sourceLang,
          fieldsToIgnore,
          fieldSchema
        );
      } else if (typeof value === "object" && value !== null) {
        translated[key] = await this.translateNestedObject(
          deeplService,
          value,
          targetLang,
          sourceLang,
          fieldsToIgnore,
          fieldSchema
        );
      } else {
        translated[key] = value;
      }
    }
    return translated;
  },
  /**
   * Check if a field should be translated
   */
  shouldTranslateField(value, fieldSchema) {
    if (typeof value !== "string" || !value.trim()) {
      return false;
    }
    if (fieldSchema) {
      return isTranslatable(fieldSchema);
    }
    return true;
  },
  /**
   * Translate an array field
   */
  async translateArray(deeplService, array, targetLang, sourceLang, fieldsToIgnore, fieldSchema) {
    const results = [];
    for (const item of array) {
      if (typeof item === "string") {
        results.push(await deeplService.translate(item, targetLang, sourceLang));
      } else if (typeof item === "object" && item !== null) {
        if (item.__component) {
          const componentSchema = strapi.components[item.__component];
          if (componentSchema) {
            const translated = await this.translateObject(
              deeplService,
              item,
              targetLang,
              sourceLang,
              fieldsToIgnore,
              componentSchema
            );
            results.push(translated);
          } else {
            results.push(item);
          }
        } else if (item.documentId && !item.__component) {
          results.push(item);
        } else {
          results.push(item);
        }
      } else {
        results.push(item);
      }
    }
    return results;
  },
  /**
   * Translate a nested object field
   */
  async translateNestedObject(deeplService, obj, targetLang, sourceLang, fieldsToIgnore, fieldSchema) {
    if (obj.__component) {
      const componentSchema = strapi.components[obj.__component];
      if (componentSchema) {
        return await this.translateObject(
          deeplService,
          obj,
          targetLang,
          sourceLang,
          fieldsToIgnore,
          componentSchema
        );
      }
      return obj;
    }
    if (obj.documentId && !obj.__component) {
      return obj;
    }
    if (obj.mime || obj.url || obj.provider) {
      return obj;
    }
    if (fieldSchema && isComponent(fieldSchema)) {
      const componentSchema = strapi.components[fieldSchema.component];
      if (componentSchema) {
        return await this.translateObject(
          deeplService,
          obj,
          targetLang,
          sourceLang,
          fieldsToIgnore,
          componentSchema
        );
      }
    }
    if (fieldSchema && typeof obj === "object") {
      return await this.translateObject(
        deeplService,
        obj,
        targetLang,
        sourceLang,
        fieldsToIgnore,
        fieldSchema
      );
    }
    return obj;
  }
});
const translation$1 = /* @__PURE__ */ getDefaultExportFromCjs(translation);
const services = {
  deepl: deepl$1,
  settings: settings$1,
  i18n: i18n$1,
  translation: translation$1
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
module.exports = index;
