'use strict';

const Bookshelf = require('../bookshelf');

require('./tag');

module.exports = Bookshelf.model('Color', {
  tableName: 'colors',

  tags: function() {
    return this.belongsToMany('Tag', 'tag_has_colors', 'colorHex', 'tagName', 'hex', 'name');
  },

  tag: function() {
    return this.belongsTo('Tag', 'cname', 'name');
  },

  tags2: function() {
    return this.hasMany('Tag', 'name', 'cname');
  },
});
