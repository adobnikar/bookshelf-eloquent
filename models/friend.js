'use strict';

const Bookshelf = require('../bookshelf.js');

require('./user');

module.exports = Bookshelf.model('Friend', {
  tableName: 'friends',
  idAttribute: 'idAttr',
  hasTimestamps: ['createdAt', 'updatedAt'],

  user1: function() {
    return this.belongsTo('User', 'user1Id');
  },

  user2: function() {
    return this.belongsTo('User', 'user2Id');
  },
});
