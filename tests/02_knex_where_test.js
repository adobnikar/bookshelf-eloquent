'use strict';

const connection = require('../knexfile');
const knex = require('knex')(connection);

const assert = require('assert');
require('../libs/seedrandom-ext');

const Comment = require('../models/comment');
const Enrolment = require('../models/enrolment');
const Friend = require('../models/friend');
const Group = require('../models/group');
const Post = require('../models/post');
const Rating = require('../models/rating');
const Role = require('../models/role');
const Tag = require('../models/tag');
const User = require('../models/user');
const Empty = require('../models/empty');

function modelAttrs(model) {
  return model.attributes;
}

function resetProto(obj) {
  obj.__proto__ = null;
  return obj;
}

exports.test = async function() {
  // Run the test. This function is required.
  let knexResult = null;
  let bookResult = null;

  // Where test. (Get all visible posts)
  knexResult = (await knex.select().from(Post.prototype.tableName)
    .whereNull('deletedAt').where('visible', true)).map(resetProto);
  bookResult = (await Post.where('visible', true).get()).models.map(modelAttrs);
  assert.deepStrictEqual(bookResult, knexResult);

  // Or where test. (Get all invisible posts)
  knexResult = (await knex.select().from(Post.prototype.tableName)
    .whereNotNull('deletedAt').orWhere('visible', false)).map(resetProto);
  bookResult = (await Post.withDeleted().whereNotNull('deletedAt')
    .orWhere('visible', false).get()).models.map(modelAttrs);
  assert.deepStrictEqual(bookResult, knexResult);

  // Nested where test.
  knexResult = (await knex(Post.prototype.tableName).where(function() {
    this.where('title', 'like', 'a%');
    this.whereNull('deletedAt');
  }).orWhere('text', 'like', 'm%')
  .whereIn(Post.forge().idAttribute, [1, 2, 3, 4, 5, 6, 7, 8, 9])
  .whereBetween(Post.forge().idAttribute, [5, 15])).map(resetProto);
  bookResult = (await Post.withDeleted().where(function() {
    this.where('title', 'like', 'a%');
    this.whereNull('deletedAt');
  }).orWhereLike('text', 'm%')
  .whereIn(Post.forge().idAttribute, [1, 2, 3, 4, 5, 6, 7, 8, 9])
  .whereBetween(Post.forge().idAttribute, 5, 15).get()).models.map(modelAttrs);
  assert.deepStrictEqual(bookResult, knexResult);

  const whereMethods = ['orWhere', 'whereNot', 'whereIn', 'whereNotIn',
    'whereNull', 'whereNotNull', 'whereExists', 'whereNotExists',
    'whereBetween', 'whereNotBetween',
  ];
};
