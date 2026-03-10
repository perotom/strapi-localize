'use strict';

/**
 * Translation Service Tests using production schemas
 *
 * Tests the translation service's ability to:
 * - Translate content with deep nesting
 * - Handle self-referential relations
 * - Handle linked list relations
 * - Process dynamic zones with component relations
 * - Find localized versions of relations
 */

const {
  contentTypes,
  components,
  helpCategorySchema,
  helpBlockSchema,
  helpLessonSchema,
  helpStorySchema,
} = require('../../__fixtures__/schemas');

const {
  helpCategories,
  helpLessons,
  fullyPopulatedLesson,
  fullyPopulatedCategory,
} = require('../../__fixtures__/test-data');

describe('Translation Service', () => {
  let strapi;
  let translationService;
  let mockDeeplService;
  let mockI18nService;
  let mockSettingsService;
  let mockDocuments;

  beforeEach(() => {
    // Mock DeepL service
    mockDeeplService = {
      translate: jest.fn().mockImplementation((text) => Promise.resolve(`[DE] ${text}`)),
      translateObject: jest.fn().mockImplementation((obj) => {
        const result = { ...obj };
        for (const key of Object.keys(result)) {
          if (typeof result[key] === 'string' && key !== 'slug' && key !== 'internal') {
            result[key] = `[DE] ${result[key]}`;
          }
        }
        return Promise.resolve(result);
      }),
    };

    // Mock i18n service (required methods)
    mockI18nService = {
      getDefaultLocaleCode: jest.fn().mockResolvedValue('en'),
      omitSystemFields: jest.fn().mockImplementation((data) => {
        const cleaned = { ...data };
        ['id', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy', 'locale', 'localizations'].forEach(key => {
          delete cleaned[key];
        });
        return cleaned;
      }),
      dropDocumentIdExceptMedia: jest.fn().mockImplementation((data) => data),
      getExistingLocalization: jest.fn().mockResolvedValue(null),
      createLocalization: jest.fn().mockImplementation((uid, source, data, locale) =>
        Promise.resolve({ ...data, documentId: source.documentId, locale })
      ),
      updateLocalization: jest.fn().mockImplementation((uid, docId, data, locale) =>
        Promise.resolve({ ...data, documentId: docId, locale })
      ),
    };

    // Mock settings service
    mockSettingsService = {
      getSettings: jest.fn().mockResolvedValue({
        contentTypes: {
          'api::help-lesson.help-lesson': {
            enabled: true,
            autoTranslate: true,
            ignoredFields: ['slug', 'internal'],
          },
        },
      }),
      getContentTypeSettings: jest.fn().mockResolvedValue({
        enabled: true,
        autoTranslate: true,
        ignoredFields: ['slug', 'internal'],
      }),
    };

    // Mock Documents API
    mockDocuments = {
      findOne: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    // Mock Strapi instance with production schemas
    strapi = {
      contentTypes: {
        'api::help-category.help-category': helpCategorySchema,
        'api::help-block.help-block': helpBlockSchema,
        'api::help-lesson.help-lesson': helpLessonSchema,
        'api::help-story.help-story': helpStorySchema,
      },
      components: {
        'basic.text-block': components['basic.text-block'],
        'basic.image': components['basic.image'],
        'basic.screenshot': components['basic.screenshot'],
        'basic.embed-code': components['basic.embed-code'],
        'help.help-block': components['help.help-block'],
      },
      getModel: jest.fn((uid) => {
        if (strapi.contentTypes[uid]) return strapi.contentTypes[uid];
        if (strapi.components[uid]) return strapi.components[uid];
        return null;
      }),
      documents: jest.fn(() => mockDocuments),
      plugin: jest.fn(() => ({
        service: jest.fn((name) => {
          if (name === 'deepl') return mockDeeplService;
          if (name === 'i18n') return mockI18nService;
          if (name === 'settings') return mockSettingsService;
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

    // Set global strapi (needed for translation service)
    global.strapi = strapi;

    // Load the translation service
    const serviceFactory = require('../translation');
    translationService = serviceFactory({ strapi });
  });

  afterEach(() => {
    delete global.strapi;
    jest.clearAllMocks();
  });

  describe('translateContent', () => {
    it('should translate Help Lesson with category relation', async () => {
      // Setup: Source lesson exists in English
      const sourceLesson = { ...helpLessons.createProfileLesson };
      mockDocuments.findOne.mockResolvedValue(sourceLesson);

      const result = await translationService.translateContent(
        sourceLesson.documentId,
        'api::help-lesson.help-lesson',
        'de',
        'en'
      );

      expect(result).toBeDefined();
      expect(result.locale).toBe('de');
      expect(mockDocuments.findOne).toHaveBeenCalled();
      expect(mockI18nService.createLocalization).toHaveBeenCalled();
    });

    it('should throw error if source does not exist', async () => {
      mockDocuments.findOne.mockResolvedValue(null);

      await expect(translationService.translateContent(
        'non-existent-id',
        'api::help-lesson.help-lesson',
        'de',
        'en'
      )).rejects.toThrow('Entry not found');
    });

    it('should update existing localization instead of creating new', async () => {
      const sourceLesson = { ...helpLessons.createProfileLesson };
      const existingTranslation = {
        documentId: sourceLesson.documentId,
        locale: 'de',
        title: 'Old translation',
      };

      mockDocuments.findOne.mockResolvedValue(sourceLesson);
      mockI18nService.getExistingLocalization.mockResolvedValue(existingTranslation);

      const result = await translationService.translateContent(
        sourceLesson.documentId,
        'api::help-lesson.help-lesson',
        'de',
        'en'
      );

      expect(mockI18nService.updateLocalization).toHaveBeenCalled();
      expect(mockI18nService.createLocalization).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent model', async () => {
      await expect(translationService.translateContent(
        'some-id',
        'api::nonexistent.nonexistent',
        'de',
        'en'
      )).rejects.toThrow('Model schema not found');
    });
  });

  describe('translateContent with self-referential relations', () => {
    it('should handle Help Category parent/child relations', async () => {
      const sourceCategory = { ...helpCategories.alpine };
      mockDocuments.findOne.mockResolvedValue(sourceCategory);

      const result = await translationService.translateContent(
        sourceCategory.documentId,
        'api::help-category.help-category',
        'de',
        'en'
      );

      expect(result).toBeDefined();
      expect(result.locale).toBe('de');
    });
  });

  describe('translateContent with linked list relations', () => {
    it('should translate lesson with next and previous relations', async () => {
      const sourceLesson = { ...helpLessons.devicesOperationLesson };
      mockDocuments.findOne.mockResolvedValue(sourceLesson);

      const result = await translationService.translateContent(
        sourceLesson.documentId,
        'api::help-lesson.help-lesson',
        'de',
        'en'
      );

      expect(result).toBeDefined();
      expect(mockDocuments.findOne).toHaveBeenCalled();
    });
  });

  describe('translateObject helper', () => {
    it('should translate string fields', async () => {
      const obj = { title: 'Test Title', description: 'A description' };
      const schema = {
        attributes: {
          title: { type: 'string' },
          description: { type: 'text' },
        },
      };

      const result = await translationService.translateObject(
        mockDeeplService,
        obj,
        'de',
        'en',
        [],
        schema
      );

      expect(result.title).toBe('[DE] Test Title');
      expect(result.description).toBe('[DE] A description');
    });

    it('should skip ignored fields', async () => {
      const obj = { title: 'Test', slug: 'test-slug', internal: 'internal-id' };
      const schema = {
        attributes: {
          title: { type: 'string' },
          slug: { type: 'string' },
          internal: { type: 'string' },
        },
      };

      const result = await translationService.translateObject(
        mockDeeplService,
        obj,
        'de',
        'en',
        ['slug', 'internal'],
        schema
      );

      expect(result.title).toBe('[DE] Test');
      expect(result.slug).toBe('test-slug');
      expect(result.internal).toBe('internal-id');
    });

    it('should preserve non-string values', async () => {
      const obj = { title: 'Test', count: 42, active: true, data: null };
      const schema = {
        attributes: {
          title: { type: 'string' },
          count: { type: 'integer' },
          active: { type: 'boolean' },
          data: { type: 'json' },
        },
      };

      const result = await translationService.translateObject(
        mockDeeplService,
        obj,
        'de',
        'en',
        [],
        schema
      );

      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle arrays of strings', async () => {
      const obj = { tags: ['hello', 'world'] };
      const schema = { attributes: { tags: { type: 'json' } } };

      const result = await translationService.translateObject(
        mockDeeplService,
        obj,
        'de',
        'en',
        [],
        schema
      );

      expect(result.tags).toEqual(['[DE] hello', '[DE] world']);
    });
  });

  describe('shouldTranslateField', () => {
    it('should return true for translatable string types', () => {
      expect(translationService.shouldTranslateField('text', { type: 'string' })).toBe(true);
      expect(translationService.shouldTranslateField('text', { type: 'text' })).toBe(true);
      expect(translationService.shouldTranslateField('text', { type: 'richtext' })).toBe(true);
    });

    it('should return false for non-string values', () => {
      expect(translationService.shouldTranslateField(123, { type: 'string' })).toBe(false);
      expect(translationService.shouldTranslateField(null, { type: 'string' })).toBe(false);
      expect(translationService.shouldTranslateField('', { type: 'string' })).toBe(false);
    });

    it('should return false for non-translatable types', () => {
      expect(translationService.shouldTranslateField('test', { type: 'uid' })).toBe(false);
      expect(translationService.shouldTranslateField('test', { type: 'email' })).toBe(false);
    });
  });
});

describe('Translation Service - Deep Populate Integration', () => {
  let strapi;
  let translationService;

  beforeEach(() => {
    const mockDeeplService = {
      translate: jest.fn().mockImplementation((text) => Promise.resolve(`[DE] ${text}`)),
      translateObject: jest.fn().mockImplementation((obj) => Promise.resolve(obj)),
    };

    const mockI18nService = {
      getDefaultLocaleCode: jest.fn().mockResolvedValue('en'),
      omitSystemFields: jest.fn().mockImplementation((data) => data),
      dropDocumentIdExceptMedia: jest.fn().mockImplementation((data) => data),
      getExistingLocalization: jest.fn().mockResolvedValue(null),
      createLocalization: jest.fn().mockImplementation((uid, source, data, locale) =>
        Promise.resolve({ ...data, documentId: source.documentId, locale })
      ),
    };

    const mockDocuments = {
      findOne: jest.fn().mockResolvedValue(fullyPopulatedLesson),
      findMany: jest.fn(),
      create: jest.fn().mockImplementation((data) => Promise.resolve({ ...data, locale: 'de' })),
      update: jest.fn(),
    };

    strapi = {
      contentTypes: {
        'api::help-lesson.help-lesson': helpLessonSchema,
        'api::help-category.help-category': helpCategorySchema,
        'api::help-block.help-block': helpBlockSchema,
      },
      components: {
        'basic.text-block': components['basic.text-block'],
        'basic.screenshot': components['basic.screenshot'],
        'help.help-block': components['help.help-block'],
      },
      getModel: jest.fn((uid) => {
        if (strapi.contentTypes[uid]) return strapi.contentTypes[uid];
        if (strapi.components[uid]) return strapi.components[uid];
        return null;
      }),
      documents: jest.fn(() => mockDocuments),
      plugin: jest.fn(() => ({
        service: jest.fn((name) => {
          if (name === 'deepl') return mockDeeplService;
          if (name === 'i18n') return mockI18nService;
          if (name === 'settings') return {
            getSettings: jest.fn().mockResolvedValue({ contentTypes: {} }),
            getContentTypeSettings: jest.fn().mockResolvedValue({
              enabled: true,
              ignoredFields: [],
            }),
          };
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

    global.strapi = strapi;

    const serviceFactory = require('../translation');
    translationService = serviceFactory({ strapi });
  });

  afterEach(() => {
    delete global.strapi;
    jest.clearAllMocks();
  });

  it('should handle fully populated lesson with 3+ levels of nesting', async () => {
    // This test verifies that the translation service can handle
    // the complex structure of fullyPopulatedLesson which has:
    // Level 1: Lesson
    // Level 2: Category (with parent), content DZ
    // Level 3: help.help-block component -> block relation
    // Level 4: Help Block's content DZ
    // Level 5: Screenshots with media

    expect(fullyPopulatedLesson.content[0].__component).toBe('help.help-block');
    expect(fullyPopulatedLesson.content[0].block.content).toHaveLength(2);
    expect(fullyPopulatedLesson.content[0].block.content[1].image).toBeDefined();

    // Verify the lesson can be translated
    const result = await translationService.translateContent(
      fullyPopulatedLesson.documentId,
      'api::help-lesson.help-lesson',
      'de',
      'en'
    );

    expect(result).toBeDefined();
    expect(result.locale).toBe('de');
  });
});
