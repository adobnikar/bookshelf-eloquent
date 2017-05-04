'use strict';

const Bookshelf = require('../bookshelf.js');

require('./role');
require('./group');

module.exports = Bookshelf.model('User', {
  tableName: 'users',
  hasTimestamps: ['createdAt', 'updatedAt'],
  hidden: [
    'password',
    'jwtPasswordResetCounter',
    'deletedAt',
    'deletedUsername',
    'deletedEmail',
  ],
  softDelete: true,

  // Owned groups. The groups that this user created.
  groups: function() {
    return this.hasMany('Group', 'ownerId');
  },

  roles: function() {
    return this.belongsToMany('Role', 'user_has_roles', 'userId', 'roleId');
  },
});
