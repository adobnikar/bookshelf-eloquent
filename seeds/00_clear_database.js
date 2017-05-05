'use strict';

const Role = require('../models/role');
const User = require('../models/user');

exports.seed = async function(knex, Promise) {
  await Promise.all([
    knex('groups').delete(),
    knex('posts').delete(),
  ]);
  await Promise.all([
    knex('users').delete(),
    knex('roles').delete(),
  ]);
};
