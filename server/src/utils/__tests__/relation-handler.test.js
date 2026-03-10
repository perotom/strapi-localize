'use strict';

const {
  findLocalizedRelation,
  processRelations,
  processRelationsDeep,
} = require('../relation-handler');

const {
  contentTypes,
  components,
  helpCategorySchema,
  helpBlockSchema,
  helpLessonSchema,
  helpStorySchema,
} = require('../../__fixtures__/schemas');

const {
  helpLessons,
  helpCategories,
  fullyPopulatedLesson,
} = require('../../__fixtures__/test-data');

describe('Relation Handler', () => {
  let strapi;

  beforeEach(() => {
    strapi = {
      documents: jest.fn(),
      components: {},
      log: {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };

    global.strapi = strapi;
  });

  afterEach(() => {
    delete global.strapi;
    jest.clearAllMocks();
  });

  describe('findLocalizedRelation', () => {
    it('should return null for null documentId', async () => {
      const result = await findLocalizedRelation(strapi, 'api::author.author', null, 'de');
      expect(result).toBeNull();
    });

    it('should return null for undefined documentId', async () => {
      const result = await findLocalizedRelation(strapi, 'api::author.author', undefined, 'de');
      expect(result).toBeNull();
    });

    it('should find localized relation successfully', async () => {
      const mockLocalizedEntry = {
        documentId: 'abc123',
        name: 'Author Name (German)',
        locale: 'de',
      };

      const findOneMock = jest.fn().mockResolvedValue(mockLocalizedEntry);
      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const result = await findLocalizedRelation(strapi, 'api::author.author', 'abc123', 'de');

      expect(result).toEqual(mockLocalizedEntry);
      expect(strapi.documents).toHaveBeenCalledWith('api::author.author');
      expect(findOneMock).toHaveBeenCalledWith({
        documentId: 'abc123',
        locale: 'de',
      });
    });

    it('should return null when no localized version exists', async () => {
      const findOneMock = jest.fn().mockResolvedValue(null);
      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const result = await findLocalizedRelation(strapi, 'api::author.author', 'abc123', 'de');

      expect(result).toBeNull();
      expect(strapi.log.debug).toHaveBeenCalled();
    });

    it('should return null and log warning on error', async () => {
      const findOneMock = jest.fn().mockRejectedValue(new Error('Database error'));
      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const result = await findLocalizedRelation(strapi, 'api::author.author', 'abc123', 'de');

      expect(result).toBeNull();
      expect(strapi.log.warn).toHaveBeenCalled();
    });
  });

  describe('processRelations', () => {
    it('should return data unchanged if no modelSchema', async () => {
      const data = { title: 'Test' };
      const result = await processRelations(strapi, data, data, null, 'de');
      expect(result).toEqual(data);
    });

    it('should return data unchanged if modelSchema has no attributes', async () => {
      const data = { title: 'Test' };
      const result = await processRelations(strapi, data, data, {}, 'de');
      expect(result).toEqual(data);
    });

    it('should process single relation and find localized version', async () => {
      const modelSchema = {
        attributes: {
          title: { type: 'string' },
          author: { type: 'relation', target: 'api::author.author' },
        },
      };

      const sourceData = {
        title: 'Article Title',
        author: {
          documentId: 'author-123',
          name: 'John Doe',
        },
      };

      const translatedData = {
        title: 'Artikel Titel',
        author: sourceData.author, // Still has original relation
      };

      const localizedAuthor = {
        documentId: 'author-123',
        name: 'Johann Doe',
        locale: 'de',
      };

      const findOneMock = jest.fn().mockResolvedValue(localizedAuthor);
      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const result = await processRelations(strapi, translatedData, sourceData, modelSchema, 'de');

      expect(result.author).toBe('author-123'); // Should be just the documentId
    });

    it('should process array relations', async () => {
      const modelSchema = {
        attributes: {
          tags: { type: 'relation', target: 'api::tag.tag' },
        },
      };

      const sourceData = {
        tags: [
          { documentId: 'tag-1', name: 'Tech' },
          { documentId: 'tag-2', name: 'News' },
        ],
      };

      const findOneMock = jest.fn()
        .mockResolvedValueOnce({ documentId: 'tag-1', name: 'Technik', locale: 'de' })
        .mockResolvedValueOnce({ documentId: 'tag-2', name: 'Nachrichten', locale: 'de' });

      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const result = await processRelations(strapi, { tags: sourceData.tags }, sourceData, modelSchema, 'de');

      expect(result.tags).toEqual(['tag-1', 'tag-2']);
    });

    it('should remove relation if no localized version exists', async () => {
      const modelSchema = {
        attributes: {
          author: { type: 'relation', target: 'api::author.author' },
        },
      };

      const sourceData = {
        author: { documentId: 'author-123', name: 'John' },
      };

      const findOneMock = jest.fn().mockResolvedValue(null);
      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const result = await processRelations(strapi, { author: sourceData.author }, sourceData, modelSchema, 'de');

      expect(result.author).toBeUndefined();
    });

    it('should skip relation if sourceValue is null/undefined', async () => {
      const modelSchema = {
        attributes: {
          author: { type: 'relation', target: 'api::author.author' },
        },
      };

      const result = await processRelations(strapi, { author: null }, { author: null }, modelSchema, 'de');

      expect(result.author).toBeNull();
      expect(strapi.documents).not.toHaveBeenCalled();
    });

    it('should not process media relations (upload plugin)', async () => {
      const modelSchema = {
        attributes: {
          image: { type: 'relation', target: 'plugin::upload.file' },
        },
      };

      const sourceData = {
        image: { documentId: 'img-123', url: '/uploads/image.jpg' },
      };

      const result = await processRelations(strapi, { image: sourceData.image }, sourceData, modelSchema, 'de');

      // isRelation returns false for plugin::upload.file, so image should remain unchanged
      expect(result.image).toEqual(sourceData.image);
    });
  });

  describe('processRelationsDeep', () => {
    it('should return data unchanged for non-object', async () => {
      const result = await processRelationsDeep(strapi, 'string', 'string', {}, 'de');
      expect(result).toBe('string');
    });

    it('should return data unchanged for null', async () => {
      const result = await processRelationsDeep(strapi, null, null, {}, 'de');
      expect(result).toBeNull();
    });

    it('should process relations in nested components', async () => {
      const modelSchema = {
        attributes: {
          title: { type: 'string' },
          seo: { type: 'component', component: 'shared.seo' },
        },
      };

      strapi.components = {
        'shared.seo': {
          attributes: {
            metaTitle: { type: 'string' },
            author: { type: 'relation', target: 'api::author.author' },
          },
        },
      };

      const sourceData = {
        title: 'Article',
        seo: {
          metaTitle: 'SEO Title',
          author: { documentId: 'author-123', name: 'John' },
        },
      };

      const translatedData = {
        title: 'Artikel',
        seo: {
          metaTitle: 'SEO Titel',
          author: sourceData.seo.author,
        },
      };

      const findOneMock = jest.fn().mockResolvedValue({ documentId: 'author-123', locale: 'de' });
      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const result = await processRelationsDeep(strapi, translatedData, sourceData, modelSchema, 'de');

      expect(result.seo.author).toBe('author-123');
    });

    it('should process relations in repeatable components', async () => {
      const modelSchema = {
        attributes: {
          sections: { type: 'component', component: 'page.section', repeatable: true },
        },
      };

      strapi.components = {
        'page.section': {
          attributes: {
            heading: { type: 'string' },
            linkedArticle: { type: 'relation', target: 'api::article.article' },
          },
        },
      };

      const sourceData = {
        sections: [
          { heading: 'Section 1', linkedArticle: { documentId: 'art-1' } },
          { heading: 'Section 2', linkedArticle: { documentId: 'art-2' } },
        ],
      };

      const translatedData = {
        sections: [
          { heading: 'Abschnitt 1', linkedArticle: sourceData.sections[0].linkedArticle },
          { heading: 'Abschnitt 2', linkedArticle: sourceData.sections[1].linkedArticle },
        ],
      };

      const findOneMock = jest.fn()
        .mockResolvedValueOnce({ documentId: 'art-1', locale: 'de' })
        .mockResolvedValueOnce({ documentId: 'art-2', locale: 'de' });

      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const result = await processRelationsDeep(strapi, translatedData, sourceData, modelSchema, 'de');

      expect(result.sections[0].linkedArticle).toBe('art-1');
      expect(result.sections[1].linkedArticle).toBe('art-2');
    });

    it('should process relations in dynamic zones', async () => {
      const modelSchema = {
        attributes: {
          blocks: { type: 'dynamiczone', components: ['blocks.text', 'blocks.featured'] },
        },
      };

      strapi.components = {
        'blocks.text': {
          attributes: {
            content: { type: 'richtext' },
          },
        },
        'blocks.featured': {
          attributes: {
            title: { type: 'string' },
            article: { type: 'relation', target: 'api::article.article' },
          },
        },
      };

      const sourceData = {
        blocks: [
          { __component: 'blocks.text', content: 'Hello' },
          { __component: 'blocks.featured', title: 'Featured', article: { documentId: 'art-1' } },
        ],
      };

      const translatedData = {
        blocks: [
          { __component: 'blocks.text', content: 'Hallo' },
          { __component: 'blocks.featured', title: 'Vorgestellt', article: sourceData.blocks[1].article },
        ],
      };

      const findOneMock = jest.fn().mockResolvedValue({ documentId: 'art-1', locale: 'de' });
      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const result = await processRelationsDeep(strapi, translatedData, sourceData, modelSchema, 'de');

      expect(result.blocks[1].article).toBe('art-1');
    });

    it('should handle 3 levels deep nested relations', async () => {
      const modelSchema = {
        attributes: {
          layout: { type: 'component', component: 'page.layout' },
        },
      };

      strapi.components = {
        'page.layout': {
          attributes: {
            rows: { type: 'component', component: 'page.row', repeatable: true },
          },
        },
        'page.row': {
          attributes: {
            columns: { type: 'component', component: 'page.column', repeatable: true },
          },
        },
        'page.column': {
          attributes: {
            content: { type: 'richtext' },
            link: { type: 'relation', target: 'api::page.page' },
          },
        },
      };

      const sourceData = {
        layout: {
          rows: [
            {
              columns: [
                { content: 'Col 1', link: { documentId: 'page-1' } },
                { content: 'Col 2', link: { documentId: 'page-2' } },
              ],
            },
          ],
        },
      };

      const translatedData = {
        layout: {
          rows: [
            {
              columns: [
                { content: 'Spalte 1', link: sourceData.layout.rows[0].columns[0].link },
                { content: 'Spalte 2', link: sourceData.layout.rows[0].columns[1].link },
              ],
            },
          ],
        },
      };

      const findOneMock = jest.fn()
        .mockResolvedValueOnce({ documentId: 'page-1', locale: 'de' })
        .mockResolvedValueOnce({ documentId: 'page-2', locale: 'de' });

      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const result = await processRelationsDeep(strapi, translatedData, sourceData, modelSchema, 'de');

      expect(result.layout.rows[0].columns[0].link).toBe('page-1');
      expect(result.layout.rows[0].columns[1].link).toBe('page-2');
    });
  });
});

/**
 * Production Schema Tests
 * Tests using real Strapi schemas from a production system
 */
describe('Relation Handler with Production Schemas', () => {
  let strapi;

  beforeEach(() => {
    strapi = {
      documents: jest.fn(),
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
      log: {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };

    global.strapi = strapi;
  });

  afterEach(() => {
    delete global.strapi;
    jest.clearAllMocks();
  });

  describe('Self-referential relations (Help Category)', () => {
    it('should find localized parent category', async () => {
      const localizedParent = {
        documentId: 'cat-sports-001',
        title: 'Sport',
        locale: 'de',
      };

      const findOneMock = jest.fn().mockResolvedValue(localizedParent);
      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const sourceData = {
        title: 'Alpine',
        parent: { documentId: 'cat-sports-001', title: 'Sports' },
        childs: [],
      };

      const translatedData = {
        title: 'Alpin',
        parent: sourceData.parent,
        childs: [],
      };

      const result = await processRelations(
        strapi,
        translatedData,
        sourceData,
        helpCategorySchema,
        'de'
      );

      expect(result.parent).toBe('cat-sports-001');
      expect(findOneMock).toHaveBeenCalledWith({
        documentId: 'cat-sports-001',
        locale: 'de',
      });
    });

    it('should find localized child categories', async () => {
      const findOneMock = jest.fn()
        .mockResolvedValueOnce({ documentId: 'cat-biathlon-001', locale: 'de' })
        .mockResolvedValueOnce({ documentId: 'cat-alpine-001', locale: 'de' });

      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const sourceData = {
        title: 'Sports',
        parent: null,
        childs: [
          { documentId: 'cat-biathlon-001', title: 'Biathlon' },
          { documentId: 'cat-alpine-001', title: 'Alpine' },
        ],
      };

      const translatedData = {
        title: 'Sport',
        parent: null,
        childs: sourceData.childs,
      };

      const result = await processRelations(
        strapi,
        translatedData,
        sourceData,
        helpCategorySchema,
        'de'
      );

      expect(result.childs).toEqual(['cat-biathlon-001', 'cat-alpine-001']);
    });

    it('should handle missing localized parent gracefully', async () => {
      const findOneMock = jest.fn().mockResolvedValue(null);
      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const sourceData = {
        title: 'Alpine',
        parent: { documentId: 'cat-sports-001', title: 'Sports' },
      };

      const result = await processRelations(
        strapi,
        { ...sourceData },
        sourceData,
        helpCategorySchema,
        'de'
      );

      // Parent should be removed if no localized version exists
      expect(result.parent).toBeUndefined();
    });
  });

  describe('Linked list relations (Help Lesson)', () => {
    it('should find localized next_lesson', async () => {
      const localizedNext = {
        documentId: 'lesson-devices-operation-001',
        title: 'Geräte in Betrieb nehmen',
        locale: 'de',
      };

      const findOneMock = jest.fn().mockResolvedValue(localizedNext);
      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const sourceLesson = helpLessons.createProfileLesson;

      const result = await processRelations(
        strapi,
        { ...sourceLesson },
        sourceLesson,
        helpLessonSchema,
        'de'
      );

      expect(result.next_lesson).toBe('lesson-devices-operation-001');
    });

    it('should find localized previous_lesson', async () => {
      const localizedPrevious = {
        documentId: 'lesson-create-profile-001',
        locale: 'de',
      };

      const findOneMock = jest.fn()
        .mockResolvedValueOnce({ documentId: 'cat-alpine-001', locale: 'de' }) // category
        .mockResolvedValueOnce({ documentId: 'lesson-create-activity-001', locale: 'de' }) // next
        .mockResolvedValueOnce(localizedPrevious); // previous

      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const sourceLesson = helpLessons.devicesOperationLesson;

      const result = await processRelations(
        strapi,
        { ...sourceLesson },
        sourceLesson,
        helpLessonSchema,
        'de'
      );

      expect(result.previous_lesson).toBe('lesson-create-profile-001');
    });

    it('should handle end of linked list (null next_lesson)', async () => {
      const sourceLesson = helpLessons.trackConfigLesson; // Last lesson, next_lesson is null

      const findOneMock = jest.fn()
        .mockResolvedValueOnce({ documentId: 'cat-alpine-001', locale: 'de' }) // category
        .mockResolvedValueOnce({ documentId: 'lesson-create-activity-001', locale: 'de' }); // previous

      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const result = await processRelations(
        strapi,
        { ...sourceLesson },
        sourceLesson,
        helpLessonSchema,
        'de'
      );

      // next_lesson should remain null
      expect(result.next_lesson).toBeNull();
    });

    it('should handle start of linked list (null previous_lesson)', async () => {
      const sourceLesson = helpLessons.createProfileLesson; // First lesson, previous_lesson is null

      const findOneMock = jest.fn()
        .mockResolvedValueOnce({ documentId: 'cat-alpine-001', locale: 'de' }) // category
        .mockResolvedValueOnce({ documentId: 'lesson-devices-operation-001', locale: 'de' }); // next

      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const result = await processRelations(
        strapi,
        { ...sourceLesson },
        sourceLesson,
        helpLessonSchema,
        'de'
      );

      // previous_lesson should remain null
      expect(result.previous_lesson).toBeNull();
    });
  });

  describe('Dynamic zones with component relations (Help Lesson)', () => {
    it('should process help.help-block component with block relation', async () => {
      const localizedBlock = {
        documentId: 'block-create-profile-001',
        name: 'Profil erstellen (Alpin, Zeitmessung)',
        locale: 'de',
      };

      const findOneMock = jest.fn().mockResolvedValue(localizedBlock);
      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const sourceData = {
        content: [
          {
            __component: 'help.help-block',
            id: 3509,
            block: {
              documentId: 'block-create-profile-001',
              name: 'Create profile (alpine, timing)',
            },
          },
        ],
      };

      const translatedData = { ...sourceData };

      const result = await processRelationsDeep(
        strapi,
        translatedData,
        sourceData,
        helpLessonSchema,
        'de'
      );

      expect(result.content[0].block).toBe('block-create-profile-001');
    });

    it('should process multiple help.help-block components', async () => {
      const findOneMock = jest.fn()
        .mockResolvedValueOnce({ documentId: 'block-create-profile-001', locale: 'de' })
        .mockResolvedValueOnce({ documentId: 'block-identify-001', locale: 'de' });

      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const sourceData = {
        content: [
          {
            __component: 'help.help-block',
            block: { documentId: 'block-create-profile-001' },
          },
          {
            __component: 'help.help-block',
            block: { documentId: 'block-identify-001' },
          },
        ],
      };

      const result = await processRelationsDeep(
        strapi,
        { ...sourceData },
        sourceData,
        helpLessonSchema,
        'de'
      );

      expect(result.content[0].block).toBe('block-create-profile-001');
      expect(result.content[1].block).toBe('block-identify-001');
    });

    it('should preserve non-relation components in dynamic zone', async () => {
      const findOneMock = jest.fn();
      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const sourceData = {
        content: [
          {
            __component: 'basic.text-block',
            id: 7932,
            content: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] }],
          },
        ],
      };

      const translatedData = {
        content: [
          {
            __component: 'basic.text-block',
            id: 7932,
            content: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hallo' }] }],
          },
        ],
      };

      const result = await processRelationsDeep(
        strapi,
        translatedData,
        sourceData,
        helpLessonSchema,
        'de'
      );

      // Text content should be preserved (no relations to process)
      expect(result.content[0].content[0].children[0].text).toBe('Hallo');
      expect(findOneMock).not.toHaveBeenCalled();
    });

    it('should handle mixed component types in dynamic zone', async () => {
      const findOneMock = jest.fn()
        .mockResolvedValueOnce({ documentId: 'block-create-profile-001', locale: 'de' });

      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const sourceData = {
        content: [
          {
            __component: 'help.help-block',
            block: { documentId: 'block-create-profile-001' },
          },
          {
            __component: 'basic.text-block',
            content: [{ type: 'paragraph', children: [{ type: 'text', text: 'Notes' }] }],
          },
          {
            __component: 'basic.screenshot',
            caption: 'Screenshot',
            image: { documentId: 'img-001', url: '/uploads/screen.png' },
          },
        ],
      };

      const result = await processRelationsDeep(
        strapi,
        { ...sourceData },
        sourceData,
        helpLessonSchema,
        'de'
      );

      // help.help-block relation should be processed
      expect(result.content[0].block).toBe('block-create-profile-001');

      // basic.text-block should be unchanged (no relations)
      expect(result.content[1].content).toBeDefined();

      // basic.screenshot image is media (plugin::upload.file), not processed as relation
      expect(result.content[2].image).toEqual(sourceData.content[2].image);
    });
  });

  describe('Deep populate through component relations', () => {
    it('should process fullyPopulatedLesson with 3+ levels of nesting', async () => {
      // Setup mocks for all the relations in fullyPopulatedLesson
      const findOneMock = jest.fn()
        // Category relation
        .mockResolvedValueOnce({ documentId: 'cat-alpine-001', locale: 'de' })
        // next_lesson relation
        .mockResolvedValueOnce({ documentId: 'lesson-devices-operation-001', locale: 'de' })
        // First help.help-block component's block relation
        .mockResolvedValueOnce({ documentId: 'block-create-profile-001', locale: 'de' })
        // Second help.help-block component's block relation
        .mockResolvedValueOnce({ documentId: 'block-identify-001', locale: 'de' });

      strapi.documents.mockReturnValue({ findOne: findOneMock });

      const result = await processRelationsDeep(
        strapi,
        { ...fullyPopulatedLesson },
        fullyPopulatedLesson,
        helpLessonSchema,
        'de'
      );

      // Verify category relation was processed
      expect(result.category).toBe('cat-alpine-001');

      // Verify next_lesson relation was processed
      expect(result.next_lesson).toBe('lesson-devices-operation-001');

      // Verify previous_lesson remains null (start of linked list)
      expect(result.previous_lesson).toBeNull();

      // Verify dynamic zone component relations were processed
      expect(result.content[0].block).toBe('block-create-profile-001');
      expect(result.content[1].block).toBe('block-identify-001');
    });
  });
});
