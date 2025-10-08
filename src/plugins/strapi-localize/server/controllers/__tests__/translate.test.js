'use strict';

describe('Translate Controller', () => {
  let strapi;
  let controller;

  beforeEach(() => {
    // Mock Strapi instance
    strapi = {
      contentTypes: {
        'api::article.article': {
          kind: 'collectionType',
          pluginOptions: {
            i18n: { localized: true }
          }
        }
      },
      plugin: jest.fn(() => ({
        service: jest.fn(() => ({
          translateContent: jest.fn().mockResolvedValue({ id: 1, locale: 'de' }),
        })),
      })),
      log: {
        error: jest.fn(),
      },
    };

    // Load the controller
    const controllerFactory = require('../translate');
    controller = controllerFactory({ strapi });

    jest.clearAllMocks();
  });

  describe('validateContentModel', () => {
    it('should accept valid model', () => {
      const result = controller.validateContentModel('api::article.article');
      expect(result.valid).toBe(true);
    });

    it('should reject empty model', () => {
      const result = controller.validateContentModel('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-empty string');
    });

    it('should reject invalid format', () => {
      const result = controller.validateContentModel('invalid-format');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid model format');
    });

    it('should reject non-existent model', () => {
      const result = controller.validateContentModel('api::nonexistent.nonexistent');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should reject model without i18n', () => {
      strapi.contentTypes['api::noi18n.noi18n'] = {
        kind: 'collectionType',
        pluginOptions: {}
      };

      const result = controller.validateContentModel('api::noi18n.noi18n');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not have i18n enabled');
    });
  });

  describe('validateLocale', () => {
    it('should accept valid locale codes', () => {
      expect(controller.validateLocale('en').valid).toBe(true);
      expect(controller.validateLocale('de').valid).toBe(true);
      expect(controller.validateLocale('fr-FR').valid).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(controller.validateLocale('').valid).toBe(false);
      expect(controller.validateLocale('e').valid).toBe(false);
      expect(controller.validateLocale('ENG').valid).toBe(false);
      expect(controller.validateLocale('en_US').valid).toBe(false);
    });
  });

  describe('validateId', () => {
    it('should accept valid IDs', () => {
      expect(controller.validateId(1).valid).toBe(true);
      expect(controller.validateId('42').valid).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(controller.validateId(0).valid).toBe(false);
      expect(controller.validateId(-1).valid).toBe(false);
      expect(controller.validateId('abc').valid).toBe(false);
      expect(controller.validateId(null).valid).toBe(false);
    });
  });

  describe('translate', () => {
    let ctx;

    beforeEach(() => {
      ctx = {
        request: { body: {} },
        badRequest: jest.fn(),
        throw: jest.fn(),
        body: null,
      };
    });

    it('should translate successfully with valid input', async () => {
      ctx.request.body = {
        id: 1,
        model: 'api::article.article',
        targetLocale: 'de',
        sourceLocale: 'en'
      };

      await controller.translate(ctx);

      expect(ctx.body).toEqual({ id: 1, locale: 'de' });
      expect(ctx.badRequest).not.toHaveBeenCalled();
    });

    it('should reject missing parameters', async () => {
      ctx.request.body = { id: 1, model: 'api::article.article' };

      await controller.translate(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        expect.stringContaining('Missing required parameters')
      );
    });

    it('should reject invalid ID', async () => {
      ctx.request.body = {
        id: -1,
        model: 'api::article.article',
        targetLocale: 'de'
      };

      await controller.translate(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        expect.stringContaining('positive number')
      );
    });
  });

  describe('translateBatch', () => {
    let ctx;

    beforeEach(() => {
      ctx = {
        request: { body: {} },
        badRequest: jest.fn(),
        throw: jest.fn(),
        body: null,
      };
    });

    it('should reject non-array ids', async () => {
      ctx.request.body = {
        ids: 'not-an-array',
        model: 'api::article.article',
        targetLocale: 'de'
      };

      await controller.translateBatch(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith('ids must be an array');
    });

    it('should reject empty array', async () => {
      ctx.request.body = {
        ids: [],
        model: 'api::article.article',
        targetLocale: 'de'
      };

      await controller.translateBatch(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith('ids array cannot be empty');
    });

    it('should reject batch size over 50', async () => {
      ctx.request.body = {
        ids: Array(51).fill(1),
        model: 'api::article.article',
        targetLocale: 'de'
      };

      await controller.translateBatch(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith('Maximum batch size is 50 items');
    });

    it('should process valid batch', async () => {
      ctx.request.body = {
        ids: [1, 2, 3],
        model: 'api::article.article',
        targetLocale: 'de',
        sourceLocale: 'en'
      };

      await controller.translateBatch(ctx);

      expect(ctx.body).toHaveProperty('results');
      expect(ctx.body).toHaveProperty('summary');
      expect(ctx.body.summary.total).toBe(3);
    });
  });
});
