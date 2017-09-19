'use strict';

const Bookshelf = require('../bookshelf.js');

require('./empty-tag');

module.exports = Bookshelf.model('EmptySoftDelete', {
  tableName: 'empty_soft_delete',
  hasTimestamps: ['createdAt', 'updatedAt'],
  hidden: [
    'deletedAt',
  ],
  softDelete: true,

  tags: function() {
    return this.belongsToMany('EmptyTag', 'empty_soft_delete_has_tags', 'emptyId', 'tagId');
  },
});
