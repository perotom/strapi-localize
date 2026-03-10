'use strict';

/**
 * Test fixtures based on real production Strapi schemas
 * Source: /Users/thomasperoutka/Desktop/test/strapi-test/
 */

// ============================================================================
// CONTENT TYPE SCHEMAS
// ============================================================================

const helpCategorySchema = {
  uid: 'api::help-category.help-category',
  kind: 'collectionType',
  collectionName: 'help_categories',
  info: {
    singularName: 'help-category',
    pluralName: 'help-categories',
    displayName: 'Help Category',
  },
  pluginOptions: {
    i18n: { localized: true },
  },
  attributes: {
    title: {
      type: 'string',
      required: true,
      pluginOptions: { i18n: { localized: true } },
    },
    description: {
      type: 'text',
      pluginOptions: { i18n: { localized: true } },
    },
    icon: {
      type: 'media',
      multiple: false,
      allowedTypes: ['images', 'files'],
    },
    order: {
      type: 'integer',
    },
    slug: {
      type: 'string',
      required: true,
      unique: true,
    },
    // Self-referential relations (hierarchy)
    childs: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::help-category.help-category',
      mappedBy: 'parent',
    },
    parent: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::help-category.help-category',
      inversedBy: 'childs',
    },
  },
};

const helpBlockSchema = {
  uid: 'api::help-block.help-block',
  kind: 'collectionType',
  collectionName: 'help_blocks',
  info: {
    singularName: 'help-block',
    pluralName: 'help-blocks',
    displayName: 'Help Block',
  },
  pluginOptions: {
    i18n: { localized: true },
  },
  attributes: {
    name: {
      type: 'string',
      required: true,
      private: true,
    },
    content: {
      type: 'dynamiczone',
      components: ['basic.text-block', 'basic.screenshot', 'basic.image', 'basic.embed-code'],
      required: true,
      pluginOptions: { i18n: { localized: true } },
    },
  },
};

const helpLessonSchema = {
  uid: 'api::help-lesson.help-lesson',
  kind: 'collectionType',
  collectionName: 'help_lessons',
  info: {
    singularName: 'help-lesson',
    pluralName: 'help-lessons',
    displayName: 'Help Lesson',
  },
  pluginOptions: {
    i18n: { localized: true },
  },
  attributes: {
    title: {
      type: 'string',
      required: true,
      pluginOptions: { i18n: { localized: true } },
    },
    lessonNumber: {
      type: 'integer',
      required: true,
    },
    slug: {
      type: 'string',
      required: true,
      unique: true,
    },
    internal: {
      type: 'string',
      required: true,
      unique: true,
      private: true,
    },
    // Relation to category
    category: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::help-category.help-category',
    },
    // Self-referential linked list relations
    next_lesson: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::help-lesson.help-lesson',
      inversedBy: 'previous_lesson',
    },
    previous_lesson: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::help-lesson.help-lesson',
      mappedBy: 'next_lesson',
    },
    // Dynamic zone with components (including nested relation to help-block)
    content: {
      type: 'dynamiczone',
      components: ['basic.text-block', 'basic.image', 'basic.screenshot', 'help.help-block', 'basic.embed-code'],
      required: true,
      pluginOptions: { i18n: { localized: true } },
    },
  },
};

const helpStorySchema = {
  uid: 'api::help-story.help-story',
  kind: 'collectionType',
  collectionName: 'help_stories',
  info: {
    singularName: 'help-story',
    pluralName: 'help-stories',
    displayName: 'Help Story',
  },
  pluginOptions: {
    i18n: { localized: true },
  },
  attributes: {
    title: {
      type: 'string',
      required: true,
      pluginOptions: { i18n: { localized: true } },
    },
    order: {
      type: 'integer',
      required: true,
    },
    description: {
      type: 'text',
      pluginOptions: { i18n: { localized: true } },
    },
    category: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::help-category.help-category',
    },
    lessons: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::help-lesson.help-lesson',
    },
  },
};

const appNewsSchema = {
  uid: 'api::app-new.app-new',
  kind: 'collectionType',
  collectionName: 'app_news',
  info: {
    singularName: 'app-new',
    pluralName: 'app-news',
    displayName: 'App News',
  },
  pluginOptions: {
    i18n: { localized: true },
  },
  attributes: {
    title: {
      type: 'string',
      required: true,
      pluginOptions: { i18n: { localized: true } },
    },
    published: {
      type: 'date',
      required: true,
    },
    content: {
      type: 'dynamiczone',
      components: ['basic.text-block', 'basic.image'],
      required: true,
      pluginOptions: { i18n: { localized: true } },
    },
    buttonLabel: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
    buttonURL: {
      type: 'string',
    },
    buttonOpenNewWindow: {
      type: 'boolean',
      default: true,
    },
  },
};

// ============================================================================
// COMPONENT SCHEMAS
// ============================================================================

const textBlockComponent = {
  uid: 'basic.text-block',
  collectionName: 'components_basic_text_blocks',
  info: { displayName: 'text-block' },
  attributes: {
    content: {
      type: 'blocks',
      required: true,
    },
  },
};

const imageComponent = {
  uid: 'basic.image',
  collectionName: 'components_basic_images',
  info: { displayName: 'image', icon: 'picture' },
  attributes: {
    image: {
      type: 'media',
      multiple: false,
      required: true,
      allowedTypes: ['images'],
    },
  },
};

const screenshotComponent = {
  uid: 'basic.screenshot',
  collectionName: 'components_basic_screenshots',
  info: { displayName: 'screenshot' },
  attributes: {
    image: {
      type: 'media',
      multiple: false,
      required: true,
      allowedTypes: ['files', 'images'],
    },
    caption: {
      type: 'string',
    },
  },
};

const embedCodeComponent = {
  uid: 'basic.embed-code',
  collectionName: 'components_basic_embed_codes',
  info: { displayName: 'embed-code', icon: 'code' },
  attributes: {
    code: {
      type: 'text',
      required: true,
    },
  },
};

// Component with relation to content type (key for deep populate testing)
const helpBlockComponent = {
  uid: 'help.help-block',
  collectionName: 'components_help_help_blocks',
  info: { displayName: 'help-block', icon: 'question' },
  attributes: {
    block: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::help-block.help-block',
    },
  },
};

// Nested repeatable component
const questionAnswerComponent = {
  uid: 'components.question-answer',
  collectionName: 'components_components_question_answers',
  info: { displayName: 'question-answer' },
  attributes: {
    question: {
      type: 'string',
      required: true,
    },
    answer: {
      type: 'blocks',
      required: true,
    },
  },
};

const questionAnswerSectionComponent = {
  uid: 'components.question-answer-section',
  collectionName: 'components_components_question_answer_sections',
  info: { displayName: 'question-answer-section' },
  attributes: {
    questions: {
      type: 'component',
      repeatable: true,
      component: 'components.question-answer',
      required: true,
    },
  },
};

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

const contentTypes = {
  'api::help-category.help-category': helpCategorySchema,
  'api::help-block.help-block': helpBlockSchema,
  'api::help-lesson.help-lesson': helpLessonSchema,
  'api::help-story.help-story': helpStorySchema,
  'api::app-new.app-new': appNewsSchema,
};

const components = {
  'basic.text-block': textBlockComponent,
  'basic.image': imageComponent,
  'basic.screenshot': screenshotComponent,
  'basic.embed-code': embedCodeComponent,
  'help.help-block': helpBlockComponent,
  'components.question-answer': questionAnswerComponent,
  'components.question-answer-section': questionAnswerSectionComponent,
};

module.exports = {
  contentTypes,
  components,
  // Individual exports for convenience
  helpCategorySchema,
  helpBlockSchema,
  helpLessonSchema,
  helpStorySchema,
  appNewsSchema,
  textBlockComponent,
  imageComponent,
  screenshotComponent,
  embedCodeComponent,
  helpBlockComponent,
  questionAnswerComponent,
  questionAnswerSectionComponent,
};
