'use strict';

const Bookshelf = require('../bookshelf.js');

module.exports = Bookshelf.model('EmptySoftDelete', {
  tableName: 'empty_soft_delete',
  hasTimestamps: ['createdAt', 'updatedAt'],
  hidden: [
    'deletedAt',
  ],
  softDelete: true,
});
