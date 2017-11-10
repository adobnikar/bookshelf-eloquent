'use strict';

const Bookshelf = require('../bookshelf');

require('./empty');
require('./empty-soft-delete');

module.exports = Bookshelf.model('EmptyTag', {
  tableName: 'empty_tags',
  idAttribute: 'idAttr',

  empties: function() {
    return this.belongsToMany('Empty', 'empty_has_tags', 'tagId', 'emptyId');
  },

  emptySoftDeletes: function() {
    return this.belongsToMany('EmptySoftDelete', 'empty_soft_delete_has_tags', 'tagId', 'emptyId');
  },
});
