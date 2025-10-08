'use strict';

const crypto = require('crypto');

module.exports = ({ strapi }) => ({
  getEncryptionKey() {
    // Use Strapi's app keys or a dedicated environment variable
    const key = process.env.DEEPL_ENCRYPTION_KEY || strapi.config.get('admin.apiToken.salt');

    if (!key) {
      throw new Error('Encryption key not found. Please set DEEPL_ENCRYPTION_KEY or configure admin.apiToken.salt');
    }

    // Create a 32-byte key from the salt
    return crypto.createHash('sha256').update(key).digest();
  },

  encryptApiKey(apiKey) {
    if (!apiKey) return null;

    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

      let encrypted = cipher.update(apiKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Store IV with encrypted data (IV doesn't need to be secret)
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      strapi.log.error('Failed to encrypt API key:', error.message);
      throw new Error('Failed to encrypt API key');
    }
  },

  decryptApiKey(encryptedApiKey) {
    if (!encryptedApiKey) return null;

    try {
      // Check if already encrypted (contains IV separator)
      if (!encryptedApiKey.includes(':')) {
        // Legacy unencrypted key - encrypt it on next save
        return encryptedApiKey;
      }

      const key = this.getEncryptionKey();
      const [ivHex, encrypted] = encryptedApiKey.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      strapi.log.error('Failed to decrypt API key:', error.message);
      throw new Error('Failed to decrypt API key');
    }
  },

  async getSettings() {
    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'strapi-localize',
    });

    const settings = await pluginStore.get({ key: 'settings' });

    if (!settings) {
      return { apiKey: '', contentTypes: {}, autoTranslate: false, glossary: [] };
    }

    // Decrypt API key if present
    if (settings.apiKey) {
      try {
        settings.apiKey = this.decryptApiKey(settings.apiKey);
      } catch (error) {
        strapi.log.warn('Could not decrypt API key, it may be corrupted');
        settings.apiKey = '';
      }
    }

    return settings;
  },

  async updateSettings(settings) {
    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'strapi-localize',
    });

    // Encrypt API key before storing
    const settingsToStore = { ...settings };
    if (settingsToStore.apiKey) {
      settingsToStore.apiKey = this.encryptApiKey(settingsToStore.apiKey);
    }

    await pluginStore.set({
      key: 'settings',
      value: settingsToStore,
    });

    return settings; // Return unencrypted version for immediate use
  },

  async getContentTypeSettings(contentType) {
    const settings = await this.getSettings();
    return settings.contentTypes?.[contentType] || {
      enabled: false,
      ignoredFields: [],
      autoTranslate: false,
    };
  },

  async updateContentTypeSettings(contentType, contentTypeSettings) {
    const settings = await this.getSettings();

    if (!settings.contentTypes) {
      settings.contentTypes = {};
    }

    settings.contentTypes[contentType] = contentTypeSettings;

    return await this.updateSettings(settings);
  },

  async getGlossary() {
    const settings = await this.getSettings();
    return settings.glossary || [];
  },

  async updateGlossary(glossary) {
    const settings = await this.getSettings();
    settings.glossary = glossary;
    return await this.updateSettings(settings);
  },

  async getGlossaryForLanguagePair(sourceLanguage, targetLanguage) {
    const glossary = await this.getGlossary();
    const glossaryMap = {};

    glossary.forEach(entry => {
      if (entry.translations && entry.translations[targetLanguage]) {
        glossaryMap[entry.term] = entry.translations[targetLanguage];
      }
    });

    return glossaryMap;
  },
});