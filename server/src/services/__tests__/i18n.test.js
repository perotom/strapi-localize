'use strict';

/**
 * i18n Service Tests
 *
 * Tests for locale management and localization creation/update
 * with focus on preventing duplicate translations.
 */

describe('i18n Service', () => {
  let strapi;
  let i18nService;
  let mockDocuments;

  beforeEach(() => {
    mockDocuments = {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    strapi = {
      documents: jest.fn(() => mockDocuments),
      plugin: jest.fn(() => ({
        service: jest.fn(() => ({
          find: jest.fn().mockResolvedValue([
            { code: 'en', name: 'English' },
            { code: 'de', name: 'German' },
            { code: 'fr', name: 'French' },
          ]),
          getDefaultLocale: jest.fn().mockResolvedValue('en'),
        })),
      })),
      log: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };

    const serviceFactory = require('../i18n');
    i18nService = serviceFactory({ strapi });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLocales', () => {
    it('should return all available locales', async () => {
      const locales = await i18nService.getLocales();

      expect(locales).toHaveLength(3);
      expect(locales[0].code).toBe('en');
    });
  });

  describe('getDefaultLocaleCode', () => {
    it('should return the default locale code', async () => {
      const defaultLocale = await i18nService.getDefaultLocaleCode();

      expect(defaultLocale).toBe('en');
    });
  });

  describe('localeExists', () => {
    it('should return true for existing locale', async () => {
      const exists = await i18nService.localeExists('de');

      expect(exists).toBe(true);
    });

    it('should return false for non-existing locale', async () => {
      const exists = await i18nService.localeExists('jp');

      expect(exists).toBe(false);
    });
  });

  describe('getExistingLocalization', () => {
    it('should return entry if localization exists', async () => {
      const existingEntry = {
        documentId: 'doc-123',
        locale: 'de',
        title: 'German Title',
      };
      mockDocuments.findOne.mockResolvedValue(existingEntry);

      const result = await i18nService.getExistingLocalization(
        'api::article.article',
        'doc-123',
        'de'
      );

      expect(result).toEqual(existingEntry);
      expect(mockDocuments.findOne).toHaveBeenCalledWith({
        documentId: 'doc-123',
        locale: 'de',
      });
    });

    it('should return null if localization does not exist', async () => {
      mockDocuments.findOne.mockResolvedValue(null);

      const result = await i18nService.getExistingLocalization(
        'api::article.article',
        'doc-123',
        'de'
      );

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockDocuments.findOne.mockRejectedValue(new Error('Database error'));

      const result = await i18nService.getExistingLocalization(
        'api::article.article',
        'doc-123',
        'de'
      );

      expect(result).toBeNull();
    });
  });

  describe('createLocalization', () => {
    const baseEntry = {
      documentId: 'doc-123',
      locale: 'en',
      title: 'English Title',
    };

    const newData = {
      title: 'German Title',
      description: 'German Description',
    };

    it('should create new localization when none exists', async () => {
      mockDocuments.findOne.mockResolvedValue(null); // No existing localization
      mockDocuments.create.mockResolvedValue({
        documentId: 'doc-123',
        locale: 'de',
        ...newData,
      });

      const result = await i18nService.createLocalization(
        'api::article.article',
        baseEntry,
        newData,
        'de'
      );

      expect(result.documentId).toBe('doc-123');
      expect(result.locale).toBe('de');
      expect(mockDocuments.create).toHaveBeenCalledWith({
        documentId: 'doc-123',
        locale: 'de',
        data: expect.objectContaining({
          title: 'German Title',
          publishedAt: null,
        }),
      });
    });

    it('should pass documentId to link localization to source document', async () => {
      mockDocuments.findOne.mockResolvedValue(null);
      mockDocuments.create.mockResolvedValue({ documentId: 'doc-123', locale: 'de' });

      await i18nService.createLocalization(
        'api::article.article',
        baseEntry,
        newData,
        'de'
      );

      // Verify documentId is passed to create
      expect(mockDocuments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc-123',
        })
      );
    });

    it('should update instead of create when localization already exists (prevent duplicates)', async () => {
      const existingLocalization = {
        documentId: 'doc-123',
        locale: 'de',
        title: 'Old German Title',
      };
      mockDocuments.findOne.mockResolvedValue(existingLocalization);
      mockDocuments.update.mockResolvedValue({
        documentId: 'doc-123',
        locale: 'de',
        ...newData,
      });

      const result = await i18nService.createLocalization(
        'api::article.article',
        baseEntry,
        newData,
        'de'
      );

      // Should NOT create, should update instead
      expect(mockDocuments.create).not.toHaveBeenCalled();
      expect(mockDocuments.update).toHaveBeenCalledWith({
        documentId: 'doc-123',
        locale: 'de',
        data: expect.objectContaining({
          title: 'German Title',
        }),
      });
      expect(strapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('already exists, updating instead')
      );
    });

    it('should remove system fields from data', async () => {
      mockDocuments.findOne.mockResolvedValue(null);
      mockDocuments.create.mockResolvedValue({ documentId: 'doc-123', locale: 'de' });

      const dataWithSystemFields = {
        ...newData,
        id: 999,
        documentId: 'should-be-removed',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        publishedAt: '2024-01-01',
        createdBy: { id: 1 },
        updatedBy: { id: 1 },
        locale: 'en',
        localizations: [],
      };

      await i18nService.createLocalization(
        'api::article.article',
        baseEntry,
        dataWithSystemFields,
        'de'
      );

      const createCall = mockDocuments.create.mock.calls[0][0];
      expect(createCall.data).not.toHaveProperty('id');
      expect(createCall.data).not.toHaveProperty('createdAt');
      expect(createCall.data).not.toHaveProperty('updatedAt');
      expect(createCall.data).not.toHaveProperty('createdBy');
      expect(createCall.data).not.toHaveProperty('updatedBy');
      expect(createCall.data).not.toHaveProperty('locale');
      expect(createCall.data).not.toHaveProperty('localizations');
      // publishedAt should be set to null (draft)
      expect(createCall.data.publishedAt).toBeNull();
    });

    it('should set publishedAt to null (draft mode)', async () => {
      mockDocuments.findOne.mockResolvedValue(null);
      mockDocuments.create.mockResolvedValue({ documentId: 'doc-123', locale: 'de' });

      await i18nService.createLocalization(
        'api::article.article',
        baseEntry,
        newData,
        'de'
      );

      const createCall = mockDocuments.create.mock.calls[0][0];
      expect(createCall.data.publishedAt).toBeNull();
    });
  });

  describe('updateLocalization', () => {
    it('should update existing localization', async () => {
      const updateData = {
        title: 'Updated German Title',
      };
      mockDocuments.update.mockResolvedValue({
        documentId: 'doc-123',
        locale: 'de',
        ...updateData,
      });

      const result = await i18nService.updateLocalization(
        'api::article.article',
        'doc-123',
        updateData,
        'de'
      );

      expect(result.title).toBe('Updated German Title');
      expect(mockDocuments.update).toHaveBeenCalledWith({
        documentId: 'doc-123',
        locale: 'de',
        data: expect.objectContaining({
          title: 'Updated German Title',
        }),
      });
    });

    it('should remove system fields from update data', async () => {
      mockDocuments.update.mockResolvedValue({ documentId: 'doc-123', locale: 'de' });

      const dataWithSystemFields = {
        title: 'Updated Title',
        id: 999,
        documentId: 'should-be-removed',
        createdAt: '2024-01-01',
      };

      await i18nService.updateLocalization(
        'api::article.article',
        'doc-123',
        dataWithSystemFields,
        'de'
      );

      const updateCall = mockDocuments.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('id');
      expect(updateCall.data).not.toHaveProperty('documentId');
      expect(updateCall.data).not.toHaveProperty('createdAt');
    });
  });

  describe('omitSystemFields', () => {
    it('should remove all system fields', () => {
      const data = {
        title: 'Title',
        id: 123,
        documentId: 'doc-123',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        publishedAt: '2024-01-01',
        createdBy: { id: 1 },
        updatedBy: { id: 1 },
        locale: 'en',
        localizations: [],
      };

      const cleaned = i18nService.omitSystemFields(data);

      expect(cleaned.title).toBe('Title');
      expect(cleaned).not.toHaveProperty('id');
      expect(cleaned).not.toHaveProperty('documentId');
      expect(cleaned).not.toHaveProperty('createdAt');
      expect(cleaned).not.toHaveProperty('updatedAt');
      expect(cleaned).not.toHaveProperty('publishedAt');
      expect(cleaned).not.toHaveProperty('createdBy');
      expect(cleaned).not.toHaveProperty('updatedBy');
      expect(cleaned).not.toHaveProperty('locale');
      expect(cleaned).not.toHaveProperty('localizations');
    });
  });

  describe('dropDocumentIdExceptMedia', () => {
    it('should remove documentId from regular objects', () => {
      const data = {
        title: 'Title',
        documentId: 'doc-123',
        category: {
          documentId: 'cat-123',
          name: 'Category',
        },
      };

      const result = i18nService.dropDocumentIdExceptMedia(data);

      expect(result.title).toBe('Title');
      expect(result).not.toHaveProperty('documentId');
      expect(result.category).not.toHaveProperty('documentId');
      expect(result.category.name).toBe('Category');
    });

    it('should preserve documentId in media objects', () => {
      const data = {
        title: 'Title',
        image: {
          documentId: 'img-123',
          url: '/uploads/image.jpg',
          mime: 'image/jpeg',
        },
      };

      const result = i18nService.dropDocumentIdExceptMedia(data);

      expect(result.image.documentId).toBe('img-123');
      expect(result.image.url).toBe('/uploads/image.jpg');
    });

    it('should handle nested arrays', () => {
      const data = {
        content: [
          {
            __component: 'basic.text',
            documentId: 'should-remove',
            text: 'Hello',
          },
          {
            __component: 'basic.image',
            image: {
              documentId: 'should-keep',
              url: '/uploads/img.jpg',
              mime: 'image/jpeg',
            },
          },
        ],
      };

      const result = i18nService.dropDocumentIdExceptMedia(data);

      expect(result.content[0]).not.toHaveProperty('documentId');
      expect(result.content[1].image.documentId).toBe('should-keep');
    });
  });
});

describe('i18n Service - Duplicate Prevention Integration', () => {
  let strapi;
  let i18nService;
  let mockDocuments;

  beforeEach(() => {
    mockDocuments = {
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    strapi = {
      documents: jest.fn(() => mockDocuments),
      plugin: jest.fn(() => ({
        service: jest.fn(() => ({
          find: jest.fn().mockResolvedValue([]),
          getDefaultLocale: jest.fn().mockResolvedValue('en'),
        })),
      })),
      log: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };

    const serviceFactory = require('../i18n');
    i18nService = serviceFactory({ strapi });
  });

  it('should not create duplicate when translating same content twice', async () => {
    const baseEntry = { documentId: 'doc-123', locale: 'en', title: 'English' };
    const translatedData = { title: 'German' };

    // First translation attempt - no existing localization
    mockDocuments.findOne.mockResolvedValueOnce(null);
    mockDocuments.create.mockResolvedValue({
      documentId: 'doc-123',
      locale: 'de',
      title: 'German',
    });

    await i18nService.createLocalization(
      'api::article.article',
      baseEntry,
      translatedData,
      'de'
    );

    // Reset mocks for second call
    mockDocuments.create.mockClear();

    // Second translation attempt - localization now exists
    mockDocuments.findOne.mockResolvedValueOnce({
      documentId: 'doc-123',
      locale: 'de',
      title: 'German',
    });
    mockDocuments.update.mockResolvedValue({
      documentId: 'doc-123',
      locale: 'de',
      title: 'Updated German',
    });

    await i18nService.createLocalization(
      'api::article.article',
      baseEntry,
      { title: 'Updated German' },
      'de'
    );

    // Should have called update, not create
    expect(mockDocuments.create).not.toHaveBeenCalled();
    expect(mockDocuments.update).toHaveBeenCalled();
  });

  it('should log warning when updating instead of creating', async () => {
    const baseEntry = { documentId: 'doc-123', locale: 'en' };

    mockDocuments.findOne.mockResolvedValue({
      documentId: 'doc-123',
      locale: 'de',
      title: 'Existing',
    });
    mockDocuments.update.mockResolvedValue({ documentId: 'doc-123', locale: 'de' });

    await i18nService.createLocalization(
      'api::article.article',
      baseEntry,
      { title: 'New' },
      'de'
    );

    expect(strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('already exists, updating instead')
    );
  });
});
