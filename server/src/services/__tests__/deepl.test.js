'use strict';

const axios = require('axios');

jest.mock('axios');

describe('DeepL Service', () => {
  let strapi;
  let deeplService;

  beforeEach(() => {
    // Mock Strapi instance
    strapi = {
      store: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
      })),
      log: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
      },
      entityService: {
        findOne: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      getModel: jest.fn(),
      plugin: jest.fn(() => ({
        service: jest.fn(),
      })),
    };

    // Load the service
    const serviceFactory = require('../deepl');
    deeplService = serviceFactory({ strapi });

    jest.clearAllMocks();
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const result = await deeplService.retryWithBackoff(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const result = await deeplService.retryWithBackoff(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 400 error', async () => {
      const error = new Error('Bad request');
      error.response = { status: 400 };
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(deeplService.retryWithBackoff(mockFn)).rejects.toThrow('Bad request');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 rate limit', async () => {
      const error429 = new Error('Rate limit');
      error429.response = { status: 429 };

      const mockFn = jest.fn()
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce('success');

      const result = await deeplService.retryWithBackoff(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Server error'));

      await expect(deeplService.retryWithBackoff(mockFn, 2)).rejects.toThrow('Server error');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('getApiKey', () => {
    it('should return API key from store', async () => {
      const mockStore = {
        get: jest.fn().mockResolvedValue({ apiKey: 'test-key' }),
      };
      strapi.store.mockReturnValue(mockStore);

      const apiKey = await deeplService.getApiKey();

      expect(apiKey).toBe('test-key');
      expect(mockStore.get).toHaveBeenCalledWith({ key: 'settings' });
    });

    it('should return undefined if no settings', async () => {
      const mockStore = {
        get: jest.fn().mockResolvedValue(null),
      };
      strapi.store.mockReturnValue(mockStore);

      const apiKey = await deeplService.getApiKey();

      expect(apiKey).toBeUndefined();
    });
  });

  describe('isFreeApiKey', () => {
    it('should detect free API keys with :fx suffix', () => {
      expect(deeplService.isFreeApiKey('abc123:fx')).toBe(true);
      expect(deeplService.isFreeApiKey('test-key-123:fx')).toBe(true);
    });

    it('should detect paid API keys without :fx suffix', () => {
      expect(deeplService.isFreeApiKey('abc123')).toBe(false);
      expect(deeplService.isFreeApiKey('test-key-123')).toBe(false);
    });

    it('should handle null/undefined keys', () => {
      expect(deeplService.isFreeApiKey(null)).toBe(false);
      expect(deeplService.isFreeApiKey(undefined)).toBe(false);
      expect(deeplService.isFreeApiKey('')).toBe(false);
    });
  });

  describe('getApiUrl', () => {
    it('should throw error if no API key', async () => {
      const mockStore = {
        get: jest.fn().mockResolvedValue(null),
      };
      strapi.store.mockReturnValue(mockStore);

      await expect(deeplService.getApiUrl('translate')).rejects.toThrow('DeepL API key not configured');
    });

    it('should return free API URL for free API keys', async () => {
      const mockStore = {
        get: jest.fn().mockResolvedValue({ apiKey: 'test-key:fx' }),
      };
      strapi.store.mockReturnValue(mockStore);

      const url = await deeplService.getApiUrl('translate');

      expect(url).toBe('https://api-free.deepl.com/v2/translate');
    });

    it('should return paid API URL for paid API keys', async () => {
      const mockStore = {
        get: jest.fn().mockResolvedValue({ apiKey: 'test-key' }),
      };
      strapi.store.mockReturnValue(mockStore);

      const url = await deeplService.getApiUrl('translate');

      expect(url).toBe('https://api.deepl.com/v2/translate');
    });
  });

  describe('translate', () => {
    beforeEach(() => {
      const mockStore = {
        get: jest.fn().mockResolvedValue({
          apiKey: 'test-key',
          glossaryIds: {}
        }),
      };
      strapi.store.mockReturnValue(mockStore);
      strapi.plugin.mockReturnValue({
        service: jest.fn().mockReturnValue({
          getSettings: jest.fn().mockResolvedValue({ glossaryIds: {} }),
        }),
      });
    });

    it('should return text unchanged if empty', async () => {
      const result = await deeplService.translate('', 'de');
      expect(result).toBe('');
    });

    it('should translate text successfully', async () => {
      axios.post.mockResolvedValue({
        data: {
          translations: [{ text: 'Hallo Welt' }],
        },
      });

      const result = await deeplService.translate('Hello World', 'de', 'en');

      expect(result).toBe('Hallo Welt');
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.deepl.com/v2/translate',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            text: 'Hello World',
            target_lang: 'DE',
            source_lang: 'EN',
          }),
        })
      );
    });

    it('should handle translation errors gracefully', async () => {
      const error = new Error('API Error');
      error.response = { status: 403 };
      axios.post.mockRejectedValue(error);

      await expect(deeplService.translate('Hello', 'de')).rejects.toThrow();
      expect(strapi.log.error).toHaveBeenCalled();
    });
  });

  describe('translateObject', () => {
    beforeEach(() => {
      const mockStore = {
        get: jest.fn().mockResolvedValue({
          apiKey: 'test-key',
          glossaryIds: {}
        }),
      };
      strapi.store.mockReturnValue(mockStore);
      strapi.plugin.mockReturnValue({
        service: jest.fn().mockReturnValue({
          getSettings: jest.fn().mockResolvedValue({ glossaryIds: {} }),
        }),
      });

      axios.post.mockResolvedValue({
        data: {
          translations: [{ text: 'Übersetzt' }],
        },
      });
    });

    it('should translate string fields', async () => {
      const obj = { title: 'Test', description: 'Description' };
      const result = await deeplService.translateObject(obj, 'de');

      expect(result.title).toBe('Übersetzt');
      expect(result.description).toBe('Übersetzt');
    });

    it('should preserve ignored fields', async () => {
      const obj = { title: 'Test', slug: 'test-slug' };
      const result = await deeplService.translateObject(obj, 'de', null, ['slug']);

      expect(result.slug).toBe('test-slug');
    });

    it('should preserve non-string values', async () => {
      const obj = {
        title: 'Test',
        count: 42,
        active: true,
        date: new Date('2024-01-01')
      };
      const result = await deeplService.translateObject(obj, 'de');

      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.date).toEqual(obj.date);
    });
  });
});
