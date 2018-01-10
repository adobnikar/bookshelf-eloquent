'use strict';

const connection = require('./knexfile');
const Knex = require('knex')(connection);
const Bookshelf = require('bookshelf')(Knex);

// Bookshelf supported plugins.
Bookshelf.plugin('registry');
Bookshelf.plugin('visibility');

// Community plugins.
Bookshelf.plugin(require('bookshelf-paranoia'), {field: 'deletedAt'});
Bookshelf.plugin(require('bookshelf-scopes'));
Bookshelf.plugin(require('bookshelf-eloquent'));

module.exports = Bookshelf;
