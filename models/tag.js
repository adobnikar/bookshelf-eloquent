'use strict';

const Bookshelf = require('../bookshelf');

require('./post');
require('./color');

module.exports = Bookshelf.model('Tag', {
  tableName: 'tags',

  posts: function() {
    return this.belongsToMany('Post', 'post_has_tags', 'tagId', 'postId');
  },

  colors: function() {
    return this.belongsToMany('Color', 'tag_has_colors', 'tagName', 'colorHex', 'name', 'hex');
  },

  color: function() {
    return this.belongsTo('Color', 'name', 'cname');
  },

  colors2: function() {
    return this.hasMany('Color', 'cname', 'name');
  },
});
