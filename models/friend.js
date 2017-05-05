'use strict';

const Bookshelf = require('../bookshelf.js');

require('./user');

module.exports = Bookshelf.model('Friend', {
  tableName: 'friends',
  hasTimestamps: ['createdAt', 'updatedAt'],

  user1: function() {
    return this.belongsTo('User', 'userId1');
  },

  user2: function() {
    return this.belongsTo('User', 'userId2');
  },
});
