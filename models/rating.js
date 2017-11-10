'use strict';

const Bookshelf = require('../bookshelf.js');

require('./user');
require('./post');

module.exports = Bookshelf.model('Rating', {
  tableName: 'ratings',
  idAttribute: 'idAttr',
  hasTimestamps: ['createdAt', 'updatedAt'],

  user: function() {
    return this.belongsTo('User', 'userId');
  },

  post: function() {
    return this.belongsTo('Post', 'postId');
  },
});
