'use strict';

const Bookshelf = require('../bookshelf.js');

require('./user');
require('./group');

module.exports = Bookshelf.model('Enrolment', {
  tableName: 'enrolments',
  hasTimestamps: ['createdAt', 'updatedAt'],

  user: function() {
    return this.belongsTo('User', 'userId');
  },

  group: function() {
    return this.belongsTo('Group', 'groupId');
  },
});
