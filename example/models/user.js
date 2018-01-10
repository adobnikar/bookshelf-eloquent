'use strict';

const Bookshelf = require('../bookshelf.js');

require('./group');

module.exports = Bookshelf.model('User', {
  tableName: 'users',
  hasTimestamps: ['createdAt', 'updatedAt'],
  hidden: [
    'password',
    'deletedAt',
  ],
  softDelete: true,

  // Format data coming from the database.
  parse: function(response) {
    // NOTE: mysql does not support boolean columns
    // Example: Cast mysql tinyint column to boolean.
    if (response.allowUseOfMyContactInformation != null)
      response.allowUseOfMyContactInformation = !!+response.allowUseOfMyContactInformation;
    return response;
  },

  // Owned groups. The groups that this user created.
  groups: function() {
    return this.hasMany('Group', 'ownerId');
  },
});
