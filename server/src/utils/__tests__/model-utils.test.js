'use strict';

const {
  getAttribute,
  isComponent,
  isDynamicZone,
  isRepeatable,
  isRelation,
  isMedia,
  isTranslatable,
  getModel,
  isLocalizable,
  isUserContentType,
  getPopulatableAttributes,
} = require('../model-utils');

describe('Model Utils', () => {
  describe('getAttribute', () => {
    it('should return undefined for empty model', () => {
      expect(getAttribute({}, 'title')).toBeUndefined();
      expect(getAttribute(null, 'title')).toBeUndefined();
      expect(getAttribute(undefined, 'title')).toBeUndefined();
    });

    it('should return undefined for model without attributes', () => {
      expect(getAttribute({ uid: 'test' }, 'title')).toBeUndefined();
    });

    it('should return attribute definition', () => {
      const model = {
        attributes: {
          title: { type: 'string' },
          content: { type: 'richtext' },
        },
      };

      expect(getAttribute(model, 'title')).toEqual({ type: 'string' });
      expect(getAttribute(model, 'content')).toEqual({ type: 'richtext' });
    });

    it('should return undefined for non-existent attribute', () => {
      const model = {
        attributes: {
          title: { type: 'string' },
        },
      };

      expect(getAttribute(model, 'nonexistent')).toBeUndefined();
    });
  });

  describe('isComponent', () => {
    it('should return true for component type', () => {
      expect(isComponent({ type: 'component', component: 'shared.seo' })).toBe(true);
    });

    it('should return false for non-component types', () => {
      expect(isComponent({ type: 'string' })).toBe(false);
      expect(isComponent({ type: 'relation' })).toBe(false);
      expect(isComponent({ type: 'dynamiczone' })).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isComponent(null)).toBe(false);
      expect(isComponent(undefined)).toBe(false);
    });
  });

  describe('isDynamicZone', () => {
    it('should return true for dynamiczone type', () => {
      expect(isDynamicZone({ type: 'dynamiczone', components: [] })).toBe(true);
    });

    it('should return false for non-dynamiczone types', () => {
      expect(isDynamicZone({ type: 'string' })).toBe(false);
      expect(isDynamicZone({ type: 'component' })).toBe(false);
    });
  });

  describe('isRepeatable', () => {
    it('should return true for repeatable component', () => {
      expect(isRepeatable({ type: 'component', repeatable: true })).toBe(true);
    });

    it('should return false for non-repeatable component', () => {
      expect(isRepeatable({ type: 'component', repeatable: false })).toBe(false);
      expect(isRepeatable({ type: 'component' })).toBe(false);
    });

    it('should return false for non-component types', () => {
      expect(isRepeatable({ type: 'string', repeatable: true })).toBe(false);
    });
  });

  describe('isRelation', () => {
    it('should return true for relation type', () => {
      expect(isRelation({ type: 'relation', target: 'api::author.author' })).toBe(true);
    });

    it('should return false for media/upload relations', () => {
      expect(isRelation({ type: 'relation', target: 'plugin::upload.file' })).toBe(false);
    });

    it('should return false for non-relation types', () => {
      expect(isRelation({ type: 'string' })).toBe(false);
      expect(isRelation({ type: 'component' })).toBe(false);
    });
  });

  describe('isMedia', () => {
    it('should return true for media type', () => {
      expect(isMedia({ type: 'media' })).toBe(true);
    });

    it('should return true for upload.file relation', () => {
      expect(isMedia({ type: 'relation', target: 'plugin::upload.file' })).toBe(true);
    });

    it('should return false for other types', () => {
      expect(isMedia({ type: 'string' })).toBe(false);
      expect(isMedia({ type: 'relation', target: 'api::author.author' })).toBe(false);
    });
  });

  describe('isTranslatable', () => {
    it('should return true for translatable field types', () => {
      expect(isTranslatable({ type: 'string' })).toBe(true);
      expect(isTranslatable({ type: 'text' })).toBe(true);
      expect(isTranslatable({ type: 'richtext' })).toBe(true);
      expect(isTranslatable({ type: 'blocks' })).toBe(true);
    });

    it('should return false for non-translatable field types', () => {
      expect(isTranslatable({ type: 'integer' })).toBe(false);
      expect(isTranslatable({ type: 'boolean' })).toBe(false);
      expect(isTranslatable({ type: 'date' })).toBe(false);
      expect(isTranslatable({ type: 'json' })).toBe(false);
      expect(isTranslatable({ type: 'relation' })).toBe(false);
      expect(isTranslatable({ type: 'component' })).toBe(false);
      expect(isTranslatable({ type: 'media' })).toBe(false);
      expect(isTranslatable({ type: 'uid' })).toBe(false);
      expect(isTranslatable({ type: 'email' })).toBe(false);
    });
  });

  describe('getModel', () => {
    it('should return content type model', () => {
      const strapi = {
        contentTypes: {
          'api::article.article': { uid: 'api::article.article' },
        },
        components: {},
      };

      expect(getModel(strapi, 'api::article.article')).toEqual({ uid: 'api::article.article' });
    });

    it('should return component model', () => {
      const strapi = {
        contentTypes: {},
        components: {
          'shared.seo': { uid: 'shared.seo' },
        },
      };

      expect(getModel(strapi, 'shared.seo')).toEqual({ uid: 'shared.seo' });
    });

    it('should return undefined for non-existent model', () => {
      const strapi = {
        contentTypes: {},
        components: {},
      };

      expect(getModel(strapi, 'nonexistent')).toBeUndefined();
    });
  });

  describe('isLocalizable', () => {
    it('should return true for localized content type', () => {
      const model = {
        pluginOptions: {
          i18n: { localized: true },
        },
      };

      expect(isLocalizable(model)).toBe(true);
    });

    it('should return false for non-localized content type', () => {
      expect(isLocalizable({ pluginOptions: { i18n: { localized: false } } })).toBe(false);
      expect(isLocalizable({ pluginOptions: {} })).toBe(false);
      expect(isLocalizable({ pluginOptions: { i18n: {} } })).toBe(false);
      expect(isLocalizable({})).toBe(false);
      expect(isLocalizable(null)).toBe(false);
    });
  });

  describe('isUserContentType', () => {
    it('should return true for user content types', () => {
      expect(isUserContentType('api::article.article')).toBe(true);
      expect(isUserContentType('api::page.page')).toBe(true);
    });

    it('should return false for system/plugin content types', () => {
      expect(isUserContentType('plugin::i18n.locale')).toBe(false);
      expect(isUserContentType('plugin::upload.file')).toBe(false);
      expect(isUserContentType('strapi::core-store')).toBe(false);
      expect(isUserContentType('admin::user')).toBe(false);
    });
  });

  describe('getPopulatableAttributes', () => {
    it('should return empty array for empty model', () => {
      expect(getPopulatableAttributes({})).toEqual([]);
      expect(getPopulatableAttributes(null)).toEqual([]);
    });

    it('should return populatable attributes', () => {
      const model = {
        attributes: {
          title: { type: 'string' },
          content: { type: 'richtext' },
          image: { type: 'media' },
          author: { type: 'relation', target: 'api::author.author' },
          seo: { type: 'component', component: 'shared.seo' },
          blocks: { type: 'dynamiczone', components: [] },
          slug: { type: 'uid' },
        },
      };

      const result = getPopulatableAttributes(model);

      expect(result).toContain('image');
      expect(result).toContain('author');
      expect(result).toContain('seo');
      expect(result).toContain('blocks');
      expect(result).not.toContain('title');
      expect(result).not.toContain('content');
      expect(result).not.toContain('slug');
    });
  });
});
