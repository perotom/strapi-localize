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
        service: jest.fn((serviceName) => {
          if (serviceName === 'translation') {
            return {
              translateContent: jest.fn().mockResolvedValue({ documentId: 'doc-123', locale: 'de' }),
            };
          }
          if (serviceName === 'deepl') {
            return {
              getAvailableLanguages: jest.fn().mockResolvedValue([{ language: 'DE' }]),
            };
          }
          return {};
        }),
      })),
      log: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
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

  describe('validateDocumentId', () => {
    it('should accept valid documentIds', () => {
      expect(controller.validateDocumentId('abc123').valid).toBe(true);
      expect(controller.validateDocumentId('doc-uuid-here').valid).toBe(true);
      expect(controller.validateDocumentId('12345').valid).toBe(true);
    });

    it('should reject invalid documentIds', () => {
      expect(controller.validateDocumentId('').valid).toBe(false);
      expect(controller.validateDocumentId('   ').valid).toBe(false);
      expect(controller.validateDocumentId(null).valid).toBe(false);
      expect(controller.validateDocumentId(undefined).valid).toBe(false);
      expect(controller.validateDocumentId(123).valid).toBe(false); // Must be string
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
        documentId: 'doc-123',
        model: 'api::article.article',
        targetLocale: 'de',
        sourceLocale: 'en'
      };

      await controller.translate(ctx);

      expect(ctx.body).toEqual({ documentId: 'doc-123', locale: 'de' });
      expect(ctx.badRequest).not.toHaveBeenCalled();
    });

    it('should reject missing parameters', async () => {
      ctx.request.body = { documentId: 'doc-123', model: 'api::article.article' };

      await controller.translate(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        expect.stringContaining('Missing required parameters')
      );
    });

    it('should reject invalid documentId (whitespace)', async () => {
      ctx.request.body = {
        documentId: '   ',
        model: 'api::article.article',
        targetLocale: 'de'
      };

      await controller.translate(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        expect.stringContaining('cannot be empty')
      );
    });

    it('should reject non-string documentId', async () => {
      ctx.request.body = {
        documentId: 123,
        model: 'api::article.article',
        targetLocale: 'de'
      };

      await controller.translate(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        expect.stringContaining('must be a string')
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

    it('should reject non-array documentIds', async () => {
      ctx.request.body = {
        documentIds: 'not-an-array',
        model: 'api::article.article',
        targetLocale: 'de'
      };

      await controller.translateBatch(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith('documentIds must be an array');
    });

    it('should reject empty array', async () => {
      ctx.request.body = {
        documentIds: [],
        model: 'api::article.article',
        targetLocale: 'de'
      };

      await controller.translateBatch(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith('documentIds array cannot be empty');
    });

    it('should reject batch size over 50', async () => {
      ctx.request.body = {
        documentIds: Array(51).fill('doc-1'),
        model: 'api::article.article',
        targetLocale: 'de'
      };

      await controller.translateBatch(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith('Maximum batch size is 50 items');
    });

    it('should process valid batch', async () => {
      ctx.request.body = {
        documentIds: ['doc-1', 'doc-2', 'doc-3'],
        model: 'api::article.article',
        targetLocale: 'de',
        sourceLocale: 'en'
      };

      await controller.translateBatch(ctx);

      expect(ctx.body).toHaveProperty('results');
      expect(ctx.body).toHaveProperty('summary');
      expect(ctx.body.summary.total).toBe(3);
    });

    it('should reject invalid documentId in batch', async () => {
      ctx.request.body = {
        documentIds: ['doc-1', '', 'doc-3'],
        model: 'api::article.article',
        targetLocale: 'de'
      };

      await controller.translateBatch(ctx);

      expect(ctx.badRequest).toHaveBeenCalledWith(
        expect.stringContaining("Invalid documentId ''")
      );
    });
  });

  describe('getLanguages', () => {
    let ctx;

    beforeEach(() => {
      ctx = {
        throw: jest.fn(),
        body: null,
      };
    });

    it('should return available languages', async () => {
      await controller.getLanguages(ctx);

      expect(ctx.body).toEqual([{ language: 'DE' }]);
    });
  });
});
