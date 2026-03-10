'use strict';

/**
 * Test data fixtures based on real production data
 * Source language: English (en)
 * Source: /Users/thomasperoutka/Desktop/test/strapi-test/.tmp/data.db
 */

// ============================================================================
// HELP CATEGORIES (Hierarchical structure)
// ============================================================================

const helpCategories = {
  // Root categories
  sports: {
    id: 949,
    documentId: 'cat-sports-001',
    title: 'Sports',
    description: 'Sports disciplines and timing categories',
    order: 1,
    slug: 'sports',
    locale: 'en',
    icon: null,
    parent: null,
    childs: [], // Will be populated with references
  },
  devices: {
    id: 953,
    documentId: 'cat-devices-001',
    title: 'Devices',
    description: 'Hardware devices and equipment',
    order: 2,
    slug: 'devices',
    locale: 'en',
    icon: null,
    parent: null,
    childs: [],
  },
  furtherInfo: {
    id: 1000,
    documentId: 'cat-further-001',
    title: 'Further information',
    description: 'Additional resources and documentation',
    order: 100,
    slug: 'further-information',
    locale: 'en',
    icon: null,
    parent: null,
    childs: [],
  },

  // Child categories under Sports
  biathlon: {
    id: 951,
    documentId: 'cat-biathlon-001',
    title: 'Biathlon',
    description: 'Biathlon timing and training',
    order: 1,
    slug: 'biathlon',
    locale: 'en',
    icon: null,
    parent: { documentId: 'cat-sports-001' },
    childs: [],
  },
  alpine: {
    id: 952,
    documentId: 'cat-alpine-001',
    title: 'Alpine',
    description: 'Alpine skiing timing',
    order: 2,
    slug: 'alpine',
    locale: 'en',
    icon: null,
    parent: { documentId: 'cat-sports-001' },
    childs: [],
  },
  rowingKayak: {
    id: 960,
    documentId: 'cat-rowing-001',
    title: 'Rowing & Kayak',
    description: 'Water sports timing',
    order: 3,
    slug: 'rowing-kayak',
    locale: 'en',
    icon: null,
    parent: { documentId: 'cat-sports-001' },
    childs: [],
  },

  // Child categories under Devices
  chronos: {
    id: 984,
    documentId: 'cat-chronos-001',
    title: 'CHRONOS',
    description: 'CHRONOS timing device documentation',
    order: 1,
    slug: 'chronos',
    locale: 'en',
    icon: null,
    parent: { documentId: 'cat-devices-001' },
    childs: [],
  },
  oculus: {
    id: 986,
    documentId: 'cat-oculus-001',
    title: 'OCULUS',
    description: 'OCULUS video analysis device',
    order: 2,
    slug: 'oculus',
    locale: 'en',
    icon: null,
    parent: { documentId: 'cat-devices-001' },
    childs: [],
  },
  iris: {
    id: 987,
    documentId: 'cat-iris-001',
    title: 'IRIS',
    description: 'IRIS camera system',
    order: 3,
    slug: 'iris',
    locale: 'en',
    icon: null,
    parent: { documentId: 'cat-devices-001' },
    childs: [],
  },
};

// ============================================================================
// HELP BLOCKS (Reusable content blocks with dynamic zones)
// ============================================================================

const helpBlocks = {
  createProfile: {
    id: 2524,
    documentId: 'block-create-profile-001',
    name: 'Create profile (alpine, timing)',
    locale: 'en',
    content: [
      {
        __component: 'basic.text-block',
        id: 6505,
        content: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'To create a new athlete profile, follow these steps:' },
            ],
          },
          {
            type: 'list',
            format: 'ordered',
            children: [
              { type: 'list-item', children: [{ type: 'text', text: 'Open the athlete management section' }] },
              { type: 'list-item', children: [{ type: 'text', text: 'Click on "Add New Athlete"' }] },
              { type: 'list-item', children: [{ type: 'text', text: 'Fill in the required information' }] },
            ],
          },
        ],
      },
      {
        __component: 'basic.screenshot',
        id: 3695,
        caption: 'Athlete profile creation screen',
        image: {
          id: 101,
          documentId: 'img-profile-001',
          url: '/uploads/profile_screen.png',
          mime: 'image/png',
        },
      },
    ],
  },
  identifyAthlete: {
    id: 2525,
    documentId: 'block-identify-001',
    name: 'Identify athlete and add chip to profile. (alpine, timing)',
    locale: 'en',
    content: [
      {
        __component: 'basic.text-block',
        id: 6506,
        content: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'Use NFC chips to identify athletes at the start and finish lines.' },
            ],
          },
        ],
      },
      {
        __component: 'basic.screenshot',
        id: 3696,
        caption: 'NFC chip assignment',
        image: {
          id: 102,
          documentId: 'img-nfc-001',
          url: '/uploads/nfc_chip.png',
          mime: 'image/png',
        },
      },
    ],
  },
  trackConfiguration: {
    id: 2530,
    documentId: 'block-track-config-001',
    name: 'Track configuration (Alpine, timing)',
    locale: 'en',
    content: [
      {
        __component: 'basic.text-block',
        id: 6510,
        content: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'Configure your timing track with intermediate points and finish lines.' },
            ],
          },
        ],
      },
      {
        __component: 'basic.embed-code',
        id: 3700,
        code: '<iframe src="https://example.com/track-config"></iframe>',
      },
    ],
  },
};

// ============================================================================
// HELP LESSONS (Complex: linked list + dynamic zones with component relations)
// ============================================================================

const helpLessons = {
  createProfileLesson: {
    id: 3145,
    documentId: 'lesson-create-profile-001',
    title: 'Create profile and identify athletes',
    lessonNumber: 1,
    slug: 'create-profile-identify-athletes',
    internal: 'alpine-timing-lesson-1',
    locale: 'en',
    category: {
      id: 952,
      documentId: 'cat-alpine-001',
      title: 'Alpine',
    },
    next_lesson: {
      documentId: 'lesson-devices-operation-001',
    },
    previous_lesson: null,
    // Dynamic zone with help.help-block component (contains relation to help-block content type)
    content: [
      {
        __component: 'help.help-block',
        id: 3509,
        block: {
          id: 2524,
          documentId: 'block-create-profile-001',
          name: 'Create profile (alpine, timing)',
        },
      },
      {
        __component: 'help.help-block',
        id: 3510,
        block: {
          id: 2525,
          documentId: 'block-identify-001',
          name: 'Identify athlete and add chip to profile. (alpine, timing)',
        },
      },
      {
        __component: 'basic.text-block',
        id: 7932,
        content: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'Additional notes for this lesson.' },
            ],
          },
        ],
      },
    ],
  },
  devicesOperationLesson: {
    id: 3146,
    documentId: 'lesson-devices-operation-001',
    title: 'Putting devices into operation',
    lessonNumber: 2,
    slug: 'putting-devices-into-operation',
    internal: 'alpine-timing-lesson-2',
    locale: 'en',
    category: {
      id: 952,
      documentId: 'cat-alpine-001',
      title: 'Alpine',
    },
    next_lesson: {
      documentId: 'lesson-create-activity-001',
    },
    previous_lesson: {
      documentId: 'lesson-create-profile-001',
    },
    content: [
      {
        __component: 'basic.text-block',
        id: 7933,
        content: [
          {
            type: 'heading',
            level: 2,
            children: [{ type: 'text', text: 'Device Setup Guide' }],
          },
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'Follow these instructions to set up your CHRONOS device.' },
            ],
          },
        ],
      },
      {
        __component: 'basic.screenshot',
        id: 3699,
        caption: 'Menu item in app',
        image: {
          id: 103,
          documentId: 'img-menu-001',
          url: '/uploads/menu_item.png',
          mime: 'image/png',
        },
      },
    ],
  },
  createActivityLesson: {
    id: 3147,
    documentId: 'lesson-create-activity-001',
    title: 'Create an activity',
    lessonNumber: 3,
    slug: 'create-an-activity',
    internal: 'alpine-timing-lesson-3',
    locale: 'en',
    category: {
      id: 952,
      documentId: 'cat-alpine-001',
      title: 'Alpine',
    },
    next_lesson: {
      documentId: 'lesson-track-config-001',
    },
    previous_lesson: {
      documentId: 'lesson-devices-operation-001',
    },
    content: [
      {
        __component: 'basic.text-block',
        id: 7934,
        content: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'Learn how to create and configure activities for timing sessions.' },
            ],
          },
        ],
      },
      {
        __component: 'basic.screenshot',
        id: 3700,
        caption: 'Press "Create new activity".',
        image: {
          id: 104,
          documentId: 'img-create-activity-001',
          url: '/uploads/create_activity.png',
          mime: 'image/png',
        },
      },
    ],
  },
  trackConfigLesson: {
    id: 3157,
    documentId: 'lesson-track-config-001',
    title: 'Track configuration',
    lessonNumber: 4,
    slug: 'track-configuration',
    internal: 'alpine-timing-lesson-4',
    locale: 'en',
    category: {
      id: 952,
      documentId: 'cat-alpine-001',
      title: 'Alpine',
    },
    next_lesson: null,
    previous_lesson: {
      documentId: 'lesson-create-activity-001',
    },
    content: [
      {
        __component: 'help.help-block',
        id: 3520,
        block: {
          id: 2530,
          documentId: 'block-track-config-001',
          name: 'Track configuration (Alpine, timing)',
        },
      },
    ],
  },
};

// ============================================================================
// HELP STORIES (Contains oneToMany relation to lessons)
// ============================================================================

const helpStories = {
  timingWithChronos: {
    id: 821,
    documentId: 'story-timing-chronos-001',
    title: 'Timing with CHRONOS',
    order: 1,
    description: 'Have you bought your Lympik timing system and want to get started? This guide will walk you through the complete setup process.',
    locale: 'en',
    category: {
      id: 952,
      documentId: 'cat-alpine-001',
      title: 'Alpine',
    },
    lessons: [
      { documentId: 'lesson-create-profile-001', title: 'Create profile and identify athletes' },
      { documentId: 'lesson-devices-operation-001', title: 'Putting devices into operation' },
      { documentId: 'lesson-create-activity-001', title: 'Create an activity' },
      { documentId: 'lesson-track-config-001', title: 'Track configuration' },
    ],
  },
  videoAnalysisWithIris: {
    id: 822,
    documentId: 'story-video-iris-001',
    title: 'Video analysis with IRIS',
    order: 2,
    description: 'Are you already using Timing with CHRONOS and want to add video analysis? Learn how to set up IRIS for enhanced performance tracking.',
    locale: 'en',
    category: {
      id: 987,
      documentId: 'cat-iris-001',
      title: 'IRIS',
    },
    lessons: [],
  },
};

// ============================================================================
// APP NEWS (Dynamic zones)
// ============================================================================

const appNews = {
  endOfSeason: {
    id: 500,
    documentId: 'news-end-season-001',
    title: 'End of Season: Store CHRONOS correctly',
    published: '2025-04-19',
    locale: 'en',
    buttonLabel: 'More tips',
    buttonURL: 'https://example.com/storage-tips',
    buttonOpenNewWindow: true,
    content: [
      {
        __component: 'basic.text-block',
        id: 8000,
        content: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'As the season comes to an end, it\'s important to properly store your CHRONOS device to ensure longevity.' },
            ],
          },
          {
            type: 'heading',
            level: 3,
            children: [{ type: 'text', text: 'Storage Tips' }],
          },
          {
            type: 'list',
            format: 'unordered',
            children: [
              { type: 'list-item', children: [{ type: 'text', text: 'Clean the device thoroughly' }] },
              { type: 'list-item', children: [{ type: 'text', text: 'Remove batteries' }] },
              { type: 'list-item', children: [{ type: 'text', text: 'Store in a dry place' }] },
            ],
          },
        ],
      },
      {
        __component: 'basic.image',
        id: 8001,
        image: {
          id: 200,
          documentId: 'img-storage-001',
          url: '/uploads/chronos_storage.jpg',
          mime: 'image/jpeg',
        },
      },
    ],
  },
};

// ============================================================================
// FULLY POPULATED ENTRIES (For deep populate testing)
// ============================================================================

/**
 * Fully populated Help Lesson with 3+ levels of nesting:
 * Lesson > content (DZ) > help.help-block component > block relation > Help Block > content (DZ)
 */
const fullyPopulatedLesson = {
  id: 3145,
  documentId: 'lesson-create-profile-001',
  title: 'Create profile and identify athletes',
  lessonNumber: 1,
  slug: 'create-profile-identify-athletes',
  internal: 'alpine-timing-lesson-1',
  locale: 'en',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-06-20T14:30:00.000Z',
  publishedAt: '2024-01-16T08:00:00.000Z',

  // Relation to category (populated)
  category: {
    id: 952,
    documentId: 'cat-alpine-001',
    title: 'Alpine',
    description: 'Alpine skiing timing',
    order: 2,
    slug: 'alpine',
    locale: 'en',
    // Category's parent (self-referential)
    parent: {
      id: 949,
      documentId: 'cat-sports-001',
      title: 'Sports',
      slug: 'sports',
    },
  },

  // Linked list relations (populated)
  next_lesson: {
    id: 3146,
    documentId: 'lesson-devices-operation-001',
    title: 'Putting devices into operation',
    lessonNumber: 2,
    slug: 'putting-devices-into-operation',
    locale: 'en',
  },
  previous_lesson: null,

  // Dynamic zone content with deeply nested components
  content: [
    // Component with relation to content type (DEEP NESTING)
    {
      __component: 'help.help-block',
      id: 3509,
      // This block relation is populated with its own dynamic zone content
      block: {
        id: 2524,
        documentId: 'block-create-profile-001',
        name: 'Create profile (alpine, timing)',
        locale: 'en',
        // Nested dynamic zone inside the related content type
        content: [
          {
            __component: 'basic.text-block',
            id: 6505,
            content: [
              {
                type: 'paragraph',
                children: [
                  { type: 'text', text: 'To create a new athlete profile, follow these steps:' },
                ],
              },
            ],
          },
          {
            __component: 'basic.screenshot',
            id: 3695,
            caption: 'Athlete profile creation screen',
            image: {
              id: 101,
              documentId: 'img-profile-001',
              url: '/uploads/profile_screen.png',
              mime: 'image/png',
              provider: 'local',
            },
          },
        ],
      },
    },
    // Another help-block component
    {
      __component: 'help.help-block',
      id: 3510,
      block: {
        id: 2525,
        documentId: 'block-identify-001',
        name: 'Identify athlete and add chip to profile. (alpine, timing)',
        locale: 'en',
        content: [
          {
            __component: 'basic.text-block',
            id: 6506,
            content: [
              {
                type: 'paragraph',
                children: [
                  { type: 'text', text: 'Use NFC chips to identify athletes at the start and finish lines.' },
                ],
              },
            ],
          },
        ],
      },
    },
    // Regular text block (no relation)
    {
      __component: 'basic.text-block',
      id: 7932,
      content: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Additional notes for this lesson.' },
          ],
        },
      ],
    },
  ],
};

/**
 * Fully populated Help Category with hierarchy (self-referential)
 */
const fullyPopulatedCategory = {
  id: 952,
  documentId: 'cat-alpine-001',
  title: 'Alpine',
  description: 'Alpine skiing timing',
  order: 2,
  slug: 'alpine',
  locale: 'en',
  icon: {
    id: 50,
    documentId: 'icon-alpine-001',
    url: '/uploads/alpine_icon.svg',
    mime: 'image/svg+xml',
  },
  // Parent category (self-referential up)
  parent: {
    id: 949,
    documentId: 'cat-sports-001',
    title: 'Sports',
    description: 'Sports disciplines and timing categories',
    order: 1,
    slug: 'sports',
    locale: 'en',
    parent: null, // Root category
  },
  // Child categories (self-referential down) - empty for this example
  childs: [],
};

/**
 * Fully populated Help Story with oneToMany lessons
 */
const fullyPopulatedStory = {
  id: 821,
  documentId: 'story-timing-chronos-001',
  title: 'Timing with CHRONOS',
  order: 1,
  description: 'Have you bought your Lympik timing system and want to get started?',
  locale: 'en',
  category: {
    id: 952,
    documentId: 'cat-alpine-001',
    title: 'Alpine',
  },
  lessons: [
    {
      id: 3145,
      documentId: 'lesson-create-profile-001',
      title: 'Create profile and identify athletes',
      lessonNumber: 1,
    },
    {
      id: 3146,
      documentId: 'lesson-devices-operation-001',
      title: 'Putting devices into operation',
      lessonNumber: 2,
    },
    {
      id: 3147,
      documentId: 'lesson-create-activity-001',
      title: 'Create an activity',
      lessonNumber: 3,
    },
    {
      id: 3157,
      documentId: 'lesson-track-config-001',
      title: 'Track configuration',
      lessonNumber: 4,
    },
  ],
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Collections
  helpCategories,
  helpBlocks,
  helpLessons,
  helpStories,
  appNews,

  // Fully populated entries for deep populate testing
  fullyPopulatedLesson,
  fullyPopulatedCategory,
  fullyPopulatedStory,
};
