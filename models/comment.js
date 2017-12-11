'use strict';

const Bookshelf = require('../bookshelf.js');

require('./user');
require('./post');

module.exports = Bookshelf.model('Comment', {
  tableName: 'comments',
  idAttribute: 'commentIdAttr',
  hasTimestamps: ['createdAt', 'updatedAt'],
  hidden: [
    'deletedAt',
  ],
  softDelete: true,

  post: function() {
    return this.hasOne('Post', 'postId');
  },

  createdBy: function() {
    return this.hasOne('User', 'createdById');
  },
});
