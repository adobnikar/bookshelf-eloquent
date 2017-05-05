'use strict';

const Bookshelf = require('../bookshelf.js');

require('./user');

module.exports = Bookshelf.model('Group', {
  tableName: 'groups',
  hasTimestamps: ['createdAt', 'updatedAt'],
  hidden: [
    'deletedAt',
    'deletedNameId',
  ],
  translated: {
    'nameId': 'name',
    'descriptionId': 'description',
    'deletedNameId': 'deletedName',
  },
  softDelete: true,

  owner: function() {
    return this.belongsTo('User', 'ownerId');
  },
});
