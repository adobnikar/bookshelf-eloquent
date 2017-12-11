'use strict';

const connection = require('../knexfile');
const knex = require('knex')(connection);

const assert = require('assert');
require('../libs/seedrandom-ext');

const union = require('lodash/union');

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
  // List of all models for easier testing.
  let models = [Comment, Enrolment, Friend, Group, Post, Rating, Role, Tag,
    User, Empty];
  let softDeleteModels = [Comment, Group, Post, User];
  let nonSoftDeleteModels = [Enrolment, Friend, Rating, Role, Tag, Empty];
  let knexResult = null;
  let bookResult = null;

  // Just a normal select * for start.
  for (let Model of models) {
    knexResult = (await knex.select().from(Model.prototype.tableName))
      .map(resetProto);
    bookResult = (await Model.withDeleted().get()).models.map(modelAttrs);
    assert.deepStrictEqual(bookResult, knexResult);
  }

  // Get soft delete models.
  for (let Model of softDeleteModels) {
    knexResult = (await knex.select().whereNull('deletedAt')
      .from(Model.prototype.tableName)).map(resetProto);
    bookResult = (await Model.get()).models.map(modelAttrs);
    assert.deepStrictEqual(bookResult, knexResult);
  }

  // Get non soft delete models.
  for (let Model of nonSoftDeleteModels) {
    knexResult = (await knex.select().from(Model.prototype.tableName))
      .map(resetProto);
    bookResult = (await Model.get()).models.map(modelAttrs);
    assert.deepStrictEqual(bookResult, knexResult);
  }

  // Select some attributes.
  knexResult = (await knex.select(['text', 'postId'])
    .from(Comment.prototype.tableName)).map(resetProto);
  bookResult = (await Comment.select(['text', 'postId'])
    .withDeleted().get()).models.map(modelAttrs);
  assert.deepStrictEqual(bookResult, knexResult);

  // Select some attributes and idAttr.
  knexResult = (await knex.select([Comment.forge().idAttribute, 'text', 'postId'])
    .from(Comment.forge().tableName)).map(resetProto);
  bookResult = (await Comment.select([Comment.forge().idAttribute, 'text', 'postId'])
    .withDeleted().get()).models.map(modelAttrs);
  assert.deepStrictEqual(bookResult, knexResult);
};
