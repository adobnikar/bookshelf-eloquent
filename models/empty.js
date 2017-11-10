'use strict';

const Bookshelf = require('../bookshelf.js');

require('./empty-tag');

module.exports = Bookshelf.model('Empty', {
  tableName: 'empty',
  idAttribute: 'idAttr',
  hasTimestamps: ['createdAt', 'updatedAt'],

  tags: function() {
    return this.belongsToMany('EmptyTag', 'empty_has_tags', 'emptyId', 'tagId');
  },
});
