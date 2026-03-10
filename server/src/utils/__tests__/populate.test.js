'use strict';

const { buildPopulateObject, buildUploadPopulateObject } = require('../populate');

describe('Populate Utilities', () => {
  let strapi;

  beforeEach(() => {
    // Mock Strapi instance with content types and components
    strapi = {
      getModel: jest.fn(),
      contentTypes: {},
      components: {},
    };

    // Make strapi globally available (as it is in the actual Strapi environment)
    global.strapi = strapi;
  });

  afterEach(() => {
    delete global.strapi;
  });

  describe('buildPopulateObject', () => {
    it('should return true for maxDepth <= 1', () => {
      const result = buildPopulateObject(strapi, 'api::article.article', 1);
      expect(result).toBe(true);
    });

    it('should return undefined for admin::user', () => {
      const result = buildPopulateObject(strapi, 'admin::user', 5);
      expect(result).toBeUndefined();
    });

    it('should return undefined if model not found', () => {
      strapi.getModel.mockReturnValue(undefined);
      const result = buildPopulateObject(strapi, 'api::nonexistent.nonexistent', 5);
      expect(result).toBeUndefined();
    });

    it('should build populate for simple model with string fields only', () => {
      strapi.getModel.mockReturnValue({
        uid: 'api::article.article',
        collectionName: 'articles',
        attributes: {
          title: { type: 'string' },
          content: { type: 'richtext' },
          slug: { type: 'uid' },
        },
      });

      const result = buildPopulateObject(strapi, 'api::article.article', 5);
      // No populatable fields, should return true
      expect(result).toBe(true);
    });

    it('should build populate for model with media field', () => {
      strapi.getModel.mockReturnValue({
        uid: 'api::article.article',
        collectionName: 'articles',
        attributes: {
          title: { type: 'string' },
          image: { type: 'media' },
        },
      });

      const result = buildPopulateObject(strapi, 'api::article.article', 5);
      expect(result).toEqual({
        populate: {
          image: true,
        },
      });
    });

    it('should build populate for model with component', () => {
      // Mock article model with SEO component
      strapi.getModel.mockImplementation((uid) => {
        if (uid === 'api::article.article') {
          return {
            uid: 'api::article.article',
            collectionName: 'articles',
            attributes: {
              title: { type: 'string' },
              seo: { type: 'component', component: 'shared.seo' },
            },
          };
        }
        if (uid === 'shared.seo') {
          return {
            uid: 'shared.seo',
            collectionName: 'components_shared_seos',
            attributes: {
              metaTitle: { type: 'string' },
              metaDescription: { type: 'text' },
            },
          };
        }
        return undefined;
      });

      const result = buildPopulateObject(strapi, 'api::article.article', 5);
      expect(result).toEqual({
        populate: {
          seo: true, // No nested populatable fields
        },
      });
    });

    it('should build populate for nested components (2 levels deep)', () => {
      strapi.getModel.mockImplementation((uid) => {
        if (uid === 'api::page.page') {
          return {
            uid: 'api::page.page',
            collectionName: 'pages',
            attributes: {
              title: { type: 'string' },
              sections: { type: 'component', component: 'page.section', repeatable: true },
            },
          };
        }
        if (uid === 'page.section') {
          return {
            uid: 'page.section',
            collectionName: 'components_page_sections',
            attributes: {
              heading: { type: 'string' },
              image: { type: 'media' },
              cta: { type: 'component', component: 'page.cta' },
            },
          };
        }
        if (uid === 'page.cta') {
          return {
            uid: 'page.cta',
            collectionName: 'components_page_ctas',
            attributes: {
              text: { type: 'string' },
              url: { type: 'string' },
            },
          };
        }
        return undefined;
      });

      const result = buildPopulateObject(strapi, 'api::page.page', 5);
      expect(result).toEqual({
        populate: {
          sections: {
            populate: {
              image: true,
              cta: true, // No more nested populatable fields
            },
          },
        },
      });
    });

    it('should build populate for dynamic zone', () => {
      strapi.getModel.mockImplementation((uid) => {
        if (uid === 'api::page.page') {
          return {
            uid: 'api::page.page',
            collectionName: 'pages',
            attributes: {
              title: { type: 'string' },
              content: {
                type: 'dynamiczone',
                components: ['page.text-block', 'page.image-block'],
              },
            },
          };
        }
        if (uid === 'page.text-block') {
          return {
            uid: 'page.text-block',
            collectionName: 'components_page_text_blocks',
            attributes: {
              text: { type: 'richtext' },
            },
          };
        }
        if (uid === 'page.image-block') {
          return {
            uid: 'page.image-block',
            collectionName: 'components_page_image_blocks',
            attributes: {
              image: { type: 'media' },
              caption: { type: 'string' },
            },
          };
        }
        return undefined;
      });

      const result = buildPopulateObject(strapi, 'api::page.page', 5);
      expect(result).toEqual({
        populate: {
          content: {
            on: {
              'page.text-block': true,
              'page.image-block': {
                populate: {
                  image: true,
                },
              },
            },
          },
        },
      });
    });

    it('should build populate for relation with depth 1', () => {
      strapi.getModel.mockImplementation((uid) => {
        if (uid === 'api::article.article') {
          return {
            uid: 'api::article.article',
            collectionName: 'articles',
            attributes: {
              title: { type: 'string' },
              author: { type: 'relation', target: 'api::author.author' },
            },
          };
        }
        if (uid === 'api::author.author') {
          return {
            uid: 'api::author.author',
            collectionName: 'authors',
            attributes: {
              name: { type: 'string' },
              bio: { type: 'text' },
            },
          };
        }
        return undefined;
      });

      const result = buildPopulateObject(strapi, 'api::article.article', 5);
      // Relations are populated with depth 1 for getting documentId
      expect(result).toEqual({
        populate: {
          author: true,
        },
      });
    });

    it('should handle 3 levels deep nested components', () => {
      strapi.getModel.mockImplementation((uid) => {
        if (uid === 'api::page.page') {
          return {
            uid: 'api::page.page',
            collectionName: 'pages',
            attributes: {
              layout: { type: 'component', component: 'page.layout' },
            },
          };
        }
        if (uid === 'page.layout') {
          return {
            uid: 'page.layout',
            collectionName: 'components_page_layouts',
            attributes: {
              rows: { type: 'component', component: 'page.row', repeatable: true },
            },
          };
        }
        if (uid === 'page.row') {
          return {
            uid: 'page.row',
            collectionName: 'components_page_rows',
            attributes: {
              columns: { type: 'component', component: 'page.column', repeatable: true },
            },
          };
        }
        if (uid === 'page.column') {
          return {
            uid: 'page.column',
            collectionName: 'components_page_columns',
            attributes: {
              content: { type: 'richtext' },
              image: { type: 'media' },
            },
          };
        }
        return undefined;
      });

      const result = buildPopulateObject(strapi, 'api::page.page', 6);
      expect(result).toEqual({
        populate: {
          layout: {
            populate: {
              rows: {
                populate: {
                  columns: {
                    populate: {
                      image: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should respect maxDepth and stop recursion', () => {
      strapi.getModel.mockImplementation((uid) => {
        if (uid === 'api::page.page') {
          return {
            uid: 'api::page.page',
            collectionName: 'pages',
            attributes: {
              nested: { type: 'component', component: 'page.nested' },
            },
          };
        }
        if (uid === 'page.nested') {
          return {
            uid: 'page.nested',
            collectionName: 'components_page_nested',
            attributes: {
              deeper: { type: 'component', component: 'page.deeper' },
            },
          };
        }
        if (uid === 'page.deeper') {
          return {
            uid: 'page.deeper',
            collectionName: 'components_page_deeper',
            attributes: {
              image: { type: 'media' },
            },
          };
        }
        return undefined;
      });

      // With depth 2, should not reach page.deeper
      const result = buildPopulateObject(strapi, 'api::page.page', 2);
      expect(result).toEqual({
        populate: {
          nested: true, // Stops here due to depth
        },
      });
    });

    it('should ignore localizations and audit fields', () => {
      strapi.getModel.mockReturnValue({
        uid: 'api::article.article',
        collectionName: 'articles',
        attributes: {
          title: { type: 'string' },
          localizations: { type: 'relation', target: 'api::article.article' },
          createdBy: { type: 'relation', target: 'admin::user' },
          updatedBy: { type: 'relation', target: 'admin::user' },
          image: { type: 'media' },
        },
      });

      const result = buildPopulateObject(strapi, 'api::article.article', 5);
      expect(result).toEqual({
        populate: {
          image: true,
        },
      });
      // Should not include localizations, createdBy, or updatedBy
    });

    it('should handle complex real-world schema', () => {
      strapi.getModel.mockImplementation((uid) => {
        if (uid === 'api::blog-post.blog-post') {
          return {
            uid: 'api::blog-post.blog-post',
            collectionName: 'blog_posts',
            attributes: {
              title: { type: 'string' },
              slug: { type: 'uid' },
              content: { type: 'richtext' },
              featuredImage: { type: 'media' },
              author: { type: 'relation', target: 'api::author.author' },
              category: { type: 'relation', target: 'api::category.category' },
              tags: { type: 'relation', target: 'api::tag.tag' },
              seo: { type: 'component', component: 'shared.seo' },
              blocks: {
                type: 'dynamiczone',
                components: ['blocks.text', 'blocks.image', 'blocks.gallery'],
              },
              localizations: { type: 'relation', target: 'api::blog-post.blog-post' },
              createdBy: { type: 'relation', target: 'admin::user' },
            },
          };
        }
        if (uid === 'api::author.author') {
          return {
            uid: 'api::author.author',
            collectionName: 'authors',
            attributes: { name: { type: 'string' } },
          };
        }
        if (uid === 'api::category.category') {
          return {
            uid: 'api::category.category',
            collectionName: 'categories',
            attributes: { name: { type: 'string' } },
          };
        }
        if (uid === 'api::tag.tag') {
          return {
            uid: 'api::tag.tag',
            collectionName: 'tags',
            attributes: { name: { type: 'string' } },
          };
        }
        if (uid === 'shared.seo') {
          return {
            uid: 'shared.seo',
            collectionName: 'components_shared_seos',
            attributes: {
              metaTitle: { type: 'string' },
              metaImage: { type: 'media' },
            },
          };
        }
        if (uid === 'blocks.text') {
          return {
            uid: 'blocks.text',
            collectionName: 'components_blocks_texts',
            attributes: { content: { type: 'richtext' } },
          };
        }
        if (uid === 'blocks.image') {
          return {
            uid: 'blocks.image',
            collectionName: 'components_blocks_images',
            attributes: { image: { type: 'media' } },
          };
        }
        if (uid === 'blocks.gallery') {
          return {
            uid: 'blocks.gallery',
            collectionName: 'components_blocks_galleries',
            attributes: { images: { type: 'media' } },
          };
        }
        return undefined;
      });

      const result = buildPopulateObject(strapi, 'api::blog-post.blog-post', 5);
      expect(result).toEqual({
        populate: {
          featuredImage: true,
          author: true,
          category: true,
          tags: true,
          seo: {
            populate: {
              metaImage: true,
            },
          },
          blocks: {
            on: {
              'blocks.text': true,
              'blocks.image': {
                populate: { image: true },
              },
              'blocks.gallery': {
                populate: { images: true },
              },
            },
          },
        },
      });
    });
  });

  describe('buildUploadPopulateObject', () => {
    it('should be similar to buildPopulateObject but for upload purposes', () => {
      strapi.getModel.mockReturnValue({
        uid: 'api::article.article',
        collectionName: 'articles',
        attributes: {
          title: { type: 'string' },
          image: { type: 'media' },
          author: { type: 'relation', target: 'api::author.author' },
        },
      });

      const result = buildUploadPopulateObject(strapi, 'api::article.article', 5);
      expect(result).toEqual({
        populate: {
          image: true,
          author: true, // Relations are also included for upload
        },
      });
    });
  });
});
