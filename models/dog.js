'use strict';

const Bookshelf = require('../bookshelf.js');

require('./user');
require('./comment');
require('./tag');
require('./rating');

module.exports = Bookshelf.model('Dog', {
  tableName: 'dog',
  idAttribute: 'idAttr',
  hasTimestamps: ['createdAt', 'updatedAt'],
  hidden: [
    'deletedAt',
  ],
  softDelete: true,

});
