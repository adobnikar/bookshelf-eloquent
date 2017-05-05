'use strict';

const Bookshelf = require('../bookshelf.js');

require('./user');
require('./post');

module.exports = Bookshelf.model('Comment', {
  tableName: 'comments',
  hasTimestamps: ['createdAt', 'updatedAt'],
  hidden: [
    'deletedAt',
  ],
  softDelete: true,

  post: function() {
    return this.belongsTo('Post', 'postId');
  },

  createdBy: function() {
    return this.belongsTo('User', 'createdById');
  },
});
