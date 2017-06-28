'use strict';

const Bookshelf = require('../bookshelf.js');

require('./user');
require('./user-virtuals');
require('./enrolment');

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

  user: function() {
    return this.belongsTo('UserVirtuals', 'ownerId');
  },

  members: function() {
    return this.hasMany('Enrolment', 'groupId');
  },
});
