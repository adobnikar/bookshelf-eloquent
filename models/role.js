'use strict';

const Bookshelf = require('../bookshelf');

require('./user');

module.exports = Bookshelf.model('Role', {
  tableName: 'roles',

  roles: function() {
    return this.belongsToMany('Role', 'role_has_roles', 'fromRoleId', 'toRoleId');
  },

  users: function() {
    return this.belongsToMany('User', 'user_has_roles', 'roleId', 'userId');
  },
});
