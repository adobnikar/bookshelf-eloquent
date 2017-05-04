'use strict';

const connection = require('./knexfile');
const Knex = require('knex')(connection);
const Bookshelf = require('bookshelf')(Knex);

// Bookshelf supported plugins.
Bookshelf.plugin('registry');
Bookshelf.plugin('visibility');

// Community plugins.
Bookshelf.plugin(require('bookshelf-paranoia'), {field: 'deletedAt'});

// Load eloquent plugin.
const path = require('path');
Bookshelf.plugin(require(path.resolve(__dirname, './index')));

module.exports = Bookshelf;
