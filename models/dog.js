'use strict';

const Bookshelf = require('../bookshelf.js');

module.exports = Bookshelf.model('Dog', {
  tableName: 'dog',
  idAttribute: 'idAttr',
  hasTimestamps: ['createdAt', 'updatedAt'],
  hidden: [
    'deletedAt',
  ],
  softDelete: true,

});
