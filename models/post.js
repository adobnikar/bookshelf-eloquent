'use strict';

const Bookshelf = require('../bookshelf.js');

require('./user');
require('./comment');
require('./tag');
require('./rating');

module.exports = Bookshelf.model('Post', {
  tableName: 'posts',
  idAttribute: 'idAttr',
  hasTimestamps: ['createdAt', 'updatedAt'],
  hidden: [
    'deletedAt',
  ],
  softDelete: true,

  comments: function() {
    return this.hasMany('Comment', 'postId');
  },

  ratings: function() {
    return this.hasMany('Rating', 'postId');
  },

  createdBy: function() {
    return this.hasOne('User', 'createdById');
  },

  tags: function() {
    return this.belongsToMany('Tag', 'post_has_tags', 'postId', 'tagId');
  },
});
