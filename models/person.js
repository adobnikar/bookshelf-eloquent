'use strict';

const Bookshelf = require('../bookshelf.js');

require('./dog');

module.exports = Bookshelf.model('Person', {
  tableName: 'person',
  idAttribute: 'idAttr',
  hasTimestamps: ['createdAt', 'updatedAt'],
  hidden: [
    'deletedAt',
  ],
  softDelete: true,

  dogs: function() {
    return this.hasMany('Dog');
  },

});
