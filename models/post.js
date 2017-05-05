'use strict';

const Bookshelf = require('../bookshelf.js');

require('./user');

module.exports = Bookshelf.model('Post', {
  tableName: 'posts',
  hasTimestamps: ['createdAt', 'updatedAt'],
  hidden: [
    'deletedAt',
  ],
  softDelete: true,

  createdBy: function() {
    return this.belongsTo('User', 'createdById');
  },
});
