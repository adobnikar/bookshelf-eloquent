'use strict';

const Bookshelf = require('../bookshelf.js');

module.exports = Bookshelf.model('Empty', {
  tableName: 'empty',
  hasTimestamps: ['createdAt', 'updatedAt'],
});
