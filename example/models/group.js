'use strict';

const Bookshelf = require('../bookshelf.js');

require('./user');

module.exports = Bookshelf.model('Group', {
  tableName: 'groups',
  hasTimestamps: ['createdAt', 'updatedAt'],
  hidden: [
    'deletedAt',
  ],
  softDelete: true,

  // Format data coming from the database.
  parse: function(response) {
    // NOTE: mysql does not support boolean columns
    // Example: Cast mysql tinyint column to boolean.
    if (response.isPublic != null) response.isPublic = !!+response.isPublic;
    return response;
  },

  owner: function() {
    return this.belongsTo('User', 'ownerId');
  },

  scopes: {
    isOwner: function(q, ownerId) {
      q.be.where('ownerId', ownerId);
    },
    orIsOwner: function(q, ownerId) {
      q.be.orWhere('ownerId', ownerId);
    },
  },
});
