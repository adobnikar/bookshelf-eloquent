'use strict';

const Bookshelf = require('../bookshelf');

require('./post');

module.exports = Bookshelf.model('Tag', {
  tableName: 'tags',
  idAttribute: 'idAttr',

  posts: function() {
    return this.belongsToMany('Post', 'post_has_tags', 'tagId', 'postId');
  },
});
