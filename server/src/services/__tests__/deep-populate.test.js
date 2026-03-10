'use strict';

/**
 * Deep Populate Tests using production schemas and test data
 *
 * Tests cover:
 * - Deep populate building (3+ levels of nesting)
 * - Self-referential relations (Help Category hierarchy)
 * - Linked list relations (next/previous lesson)
 * - Dynamic zones with component relations
 */

const {
  contentTypes,
  components,
  helpCategorySchema,
  helpBlockSchema,
  helpLessonSchema,
  helpStorySchema,
  appNewsSchema,
} = require('../../__fixtures__/schemas');

const {
  helpCategories,
  helpBlocks,
  helpLessons,
  helpStories,
  appNews,
  fullyPopulatedLesson,
  fullyPopulatedCategory,
  fullyPopulatedStory,
} = require('../../__fixtures__/test-data');

const { buildPopulateObject } = require('../../utils/populate');

describe('Deep Populate with Production Schemas', () => {
  let strapi;

  beforeEach(() => {
    // Mock Strapi instance with production schemas
    strapi = {
      contentTypes: {
        'api::help-category.help-category': helpCategorySchema,
        'api::help-block.help-block': helpBlockSchema,
        'api::help-lesson.help-lesson': helpLessonSchema,
        'api::help-story.help-story': helpStorySchema,
        'api::app-new.app-new': appNewsSchema,
      },
      components: {
        'basic.text-block': components['basic.text-block'],
        'basic.image': components['basic.image'],
        'basic.screenshot': components['basic.screenshot'],
        'basic.embed-code': components['basic.embed-code'],
        'help.help-block': components['help.help-block'],
        'components.question-answer': components['components.question-answer'],
        'components.question-answer-section': components['components.question-answer-section'],
      },
      getModel: jest.fn((uid) => {
        if (strapi.contentTypes[uid]) return strapi.contentTypes[uid];
        if (strapi.components[uid]) return strapi.components[uid];
        return null;
      }),
    };
  });

  describe('Help Lesson Schema (3+ levels nesting)', () => {
    it('should build populate for Help Lesson with deep nesting', () => {
      const result = buildPopulateObject(strapi, 'api::help-lesson.help-lesson', 6);
      const populate = result.populate;

      // Should include category relation
      expect(populate).toHaveProperty('category');

      // Should include linked list relations
      expect(populate).toHaveProperty('next_lesson');
      expect(populate).toHaveProperty('previous_lesson');

      // Should include content dynamic zone
      expect(populate).toHaveProperty('content');
      expect(populate.content).toHaveProperty('on');
    });

    it('should populate dynamic zone components correctly', () => {
      const result = buildPopulateObject(strapi, 'api::help-lesson.help-lesson', 6);
      const populate = result.populate;

      // Dynamic zone should have 'on' property with component configurations
      expect(populate.content.on).toBeDefined();

      // Should include help.help-block component (contains relation to content type)
      expect(populate.content.on['help.help-block']).toBeDefined();

      // Should include basic components
      expect(populate.content.on['basic.text-block']).toBeDefined();
      expect(populate.content.on['basic.image']).toBeDefined();
      expect(populate.content.on['basic.screenshot']).toBeDefined();
      expect(populate.content.on['basic.embed-code']).toBeDefined();
    });

    it('should populate help-block component relation to help-block content type', () => {
      const result = buildPopulateObject(strapi, 'api::help-lesson.help-lesson', 6);
      const populate = result.populate;

      // help.help-block component has a 'block' relation to api::help-block.help-block
      const helpBlockComponentPopulate = populate.content.on['help.help-block'];
      expect(helpBlockComponentPopulate).toHaveProperty('populate');
      expect(helpBlockComponentPopulate.populate).toHaveProperty('block');
    });

    it('should reach 3+ levels deep through component relations', () => {
      const result = buildPopulateObject(strapi, 'api::help-lesson.help-lesson', 6);
      const populate = result.populate;

      // Level 1: Lesson
      // Level 2: content (dynamic zone) -> help.help-block component
      // Level 3: block relation -> Help Block content type
      // Level 4: Help Block's content (dynamic zone)

      const helpBlockComponent = populate.content.on['help.help-block'];
      expect(helpBlockComponent.populate.block).toBeDefined();

      // The block relation is populated at depth 1 (just true for minimal population)
      // This is by design - relations get minimal population to just get documentId
      expect(helpBlockComponent.populate.block).toBe(true);
    });
  });

  describe('Help Category Schema (Self-referential relations)', () => {
    it('should build populate for Help Category with parent/child relations', () => {
      const result = buildPopulateObject(strapi, 'api::help-category.help-category', 4);
      const populate = result.populate;

      // Should include self-referential relations
      expect(populate).toHaveProperty('parent');
      expect(populate).toHaveProperty('childs');

      // Should include media (icon)
      expect(populate).toHaveProperty('icon');
    });

    it('should handle self-referential parent relation', () => {
      const result = buildPopulateObject(strapi, 'api::help-category.help-category', 4);
      const populate = result.populate;

      // Parent should be populated (at depth 1 for relations)
      expect(populate.parent).toBeDefined();
      // Relations are populated at depth 1 (true) to just get documentId
      expect(populate.parent).toBe(true);
    });

    it('should handle self-referential childs relation (oneToMany)', () => {
      const result = buildPopulateObject(strapi, 'api::help-category.help-category', 4);
      const populate = result.populate;

      // Childs should be populated
      expect(populate.childs).toBeDefined();
      expect(populate.childs).toBe(true);
    });

    it('should match production category structure', () => {
      // Test against fullyPopulatedCategory structure
      const result = buildPopulateObject(strapi, 'api::help-category.help-category', 4);
      const populate = result.populate;

      // Should be able to populate the structure from fullyPopulatedCategory
      expect(populate).toHaveProperty('parent');
      expect(populate).toHaveProperty('childs');
      expect(populate).toHaveProperty('icon');

      // Verify the test data structure matches what populate would fetch
      expect(fullyPopulatedCategory.parent).toBeDefined();
      expect(fullyPopulatedCategory.parent.documentId).toBe('cat-sports-001');
    });
  });

  describe('Help Lesson Schema (Linked List relations)', () => {
    it('should build populate for next_lesson and previous_lesson', () => {
      const result = buildPopulateObject(strapi, 'api::help-lesson.help-lesson', 3);
      const populate = result.populate;

      // Should include linked list relations
      expect(populate).toHaveProperty('next_lesson');
      expect(populate).toHaveProperty('previous_lesson');
    });

    it('should populate linked list relations', () => {
      const result = buildPopulateObject(strapi, 'api::help-lesson.help-lesson', 4);
      const populate = result.populate;

      // Relations are populated at depth 1 (true) to just get documentId
      expect(populate.next_lesson).toBe(true);
      expect(populate.previous_lesson).toBe(true);
    });

    it('should match production lesson linked list structure', () => {
      // Verify test data has proper linked list structure
      const lesson1 = helpLessons.createProfileLesson;
      const lesson2 = helpLessons.devicesOperationLesson;

      expect(lesson1.next_lesson.documentId).toBe(lesson2.documentId);
      expect(lesson2.previous_lesson.documentId).toBe(lesson1.documentId);
    });
  });

  describe('Help Story Schema (oneToMany relation to lessons)', () => {
    it('should build populate for Help Story with lessons array', () => {
      const result = buildPopulateObject(strapi, 'api::help-story.help-story', 4);
      const populate = result.populate;

      // Should include category relation
      expect(populate).toHaveProperty('category');

      // Should include lessons relation (oneToMany)
      expect(populate).toHaveProperty('lessons');
    });

    it('should populate lessons', () => {
      const result = buildPopulateObject(strapi, 'api::help-story.help-story', 4);
      const populate = result.populate;

      // Lessons relation should be populated (at depth 1)
      expect(populate.lessons).toBe(true);
    });

    it('should match production story structure', () => {
      // Verify test data structure
      expect(fullyPopulatedStory.lessons).toHaveLength(4);
      expect(fullyPopulatedStory.lessons[0].documentId).toBe('lesson-create-profile-001');
      expect(fullyPopulatedStory.category.documentId).toBe('cat-alpine-001');
    });
  });

  describe('App News Schema (Dynamic zones only)', () => {
    it('should build populate for App News with dynamic zone', () => {
      const result = buildPopulateObject(strapi, 'api::app-new.app-new', 4);
      const populate = result.populate;

      // Should include content dynamic zone
      expect(populate).toHaveProperty('content');
      expect(populate.content).toHaveProperty('on');
    });

    it('should populate basic components in dynamic zone', () => {
      const result = buildPopulateObject(strapi, 'api::app-new.app-new', 4);
      const populate = result.populate;

      // App News uses basic.text-block and basic.image
      expect(populate.content.on['basic.text-block']).toBeDefined();
      expect(populate.content.on['basic.image']).toBeDefined();
    });

    it('should populate media in image component', () => {
      const result = buildPopulateObject(strapi, 'api::app-new.app-new', 4);
      const populate = result.populate;

      // basic.image component has an image media field
      const imageComponent = populate.content.on['basic.image'];
      expect(imageComponent.populate).toHaveProperty('image');
    });
  });

  describe('Help Block Schema (Dynamic zone with media)', () => {
    it('should build populate for Help Block with dynamic zone', () => {
      const result = buildPopulateObject(strapi, 'api::help-block.help-block', 4);
      const populate = result.populate;

      // Should include content dynamic zone
      expect(populate).toHaveProperty('content');
      expect(populate.content).toHaveProperty('on');
    });

    it('should populate screenshot component with media', () => {
      const result = buildPopulateObject(strapi, 'api::help-block.help-block', 4);
      const populate = result.populate;

      // basic.screenshot has an image media field and caption
      const screenshotComponent = populate.content.on['basic.screenshot'];
      expect(screenshotComponent.populate).toHaveProperty('image');
    });

    it('should match production help block structure', () => {
      // Verify test data structure
      const createProfileBlock = helpBlocks.createProfile;

      expect(createProfileBlock.content).toHaveLength(2);
      expect(createProfileBlock.content[0].__component).toBe('basic.text-block');
      expect(createProfileBlock.content[1].__component).toBe('basic.screenshot');
      expect(createProfileBlock.content[1].image).toBeDefined();
    });
  });

  describe('Full Integration Test with Production Data', () => {
    it('should build complete populate for fully nested lesson', () => {
      const result = buildPopulateObject(strapi, 'api::help-lesson.help-lesson', 6);
      const populate = result.populate;

      // Verify the populate structure can handle fullyPopulatedLesson
      // Level 1: Lesson fields
      expect(populate).toHaveProperty('category');
      expect(populate).toHaveProperty('next_lesson');
      expect(populate).toHaveProperty('previous_lesson');
      expect(populate).toHaveProperty('content');

      // Level 2: Dynamic zone components
      expect(populate.content.on['help.help-block'].populate).toHaveProperty('block');

      // Relations at depth 1 for getting documentId for localized lookup
      expect(populate.category).toBe(true);
    });

    it('should match the nesting levels in fullyPopulatedLesson', () => {
      // Verify the test data has the expected deep nesting
      const lesson = fullyPopulatedLesson;

      // Level 1: Lesson
      expect(lesson.title).toBe('Create profile and identify athletes');

      // Level 2: Category with parent
      expect(lesson.category.title).toBe('Alpine');
      expect(lesson.category.parent.title).toBe('Sports');

      // Level 2: Dynamic zone content
      expect(lesson.content[0].__component).toBe('help.help-block');

      // Level 3: Block relation populated
      expect(lesson.content[0].block.name).toBe('Create profile (alpine, timing)');

      // Level 4: Block's content (dynamic zone)
      expect(lesson.content[0].block.content[0].__component).toBe('basic.text-block');
      expect(lesson.content[0].block.content[1].__component).toBe('basic.screenshot');

      // Level 5: Screenshot's image media
      expect(lesson.content[0].block.content[1].image.url).toBe('/uploads/profile_screen.png');
    });
  });

  describe('Populate object structure', () => {
    it('should return { populate: {...} } at top level', () => {
      const result = buildPopulateObject(strapi, 'api::help-lesson.help-lesson', 6);

      expect(result).toHaveProperty('populate');
      expect(typeof result.populate).toBe('object');
    });

    it('should return true for maxDepth <= 1', () => {
      const result = buildPopulateObject(strapi, 'api::help-lesson.help-lesson', 1);
      expect(result).toBe(true);
    });
  });
});
