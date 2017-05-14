'use strict';

const connection = require('../knexfile');
const knex = require('knex')(connection);

const assert = require('assert');
require('../libs/seedrandom-ext');

const isArray = require('lodash/isArray');
const isPlainObject = require('lodash/isPlainObject');
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

function bookify(Model) {
  return function(obj) {
    obj.__proto__ = null;

    // Remove hidden columns.
    if (Model != null) {
      if (Model.prototype.hidden != null) {
        for (let attr of Model.prototype.hidden) {
          delete obj[attr];
        }
      }
    }

    return obj;
  };
}

function removeProto(obj) {
  obj.__proto__ = null;

  for (let property in obj) {
    if (isArray(obj[property]))
      obj[property] = obj[property].map(removeProto);
    else if (isPlainObject(obj[property])) {
      obj[property] = ([obj[property]].map(removeProto)[0]);
    }
  }

  return obj;
}

exports.test = async function() {
  // Run the test. This function is required.
  let knexResult = null;
  let bookResult = null;

  knexResult = (await knex.select().from(Comment.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(Comment));
  let knexResultPost = new Map();
  (await knex.select().from(Post.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(Post)).map((e) => {
      if (e.id !== null) knexResultPost.set(e.id, e);
    });
  let knexResultUsers = new Map();
  (await knex.select().from(User.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(User)).map((e) => {
      if (e.id !== null) knexResultUsers.set(e.id, e);
    });

  for (let comment of knexResult) {
    if (knexResultPost.has(comment.postId)) {
      let post = knexResultPost.get(comment.postId);
      comment.post = post;
      if (knexResultUsers.has(post.createdById))
        post.createdBy = knexResultUsers.get(post.createdById);
      else post.createdBy = null;
    } else comment.post = null;

    if (knexResultUsers.has(comment.createdById)) {
      comment.createdBy = knexResultUsers.get(comment.createdById);
    } else comment.createdBy = null;
  }

  bookResult = (await Comment.with(['post.createdBy', 'createdBy']).get())
    .toJSON().map(removeProto);
  assert.deepStrictEqual(bookResult, knexResult);

  // With select.
  knexResult = (await knex.select().from(Comment.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(Comment));
  knexResultPost = new Map();
  (await knex.select().from(Post.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(Post)).map((e) => {
      if (e.id !== null) knexResultPost.set(e.id, e);
    });
  knexResultUsers = new Map();
  (await knex.select(['id', 'username']).from(User.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(User)).map((e) => {
      if (e.id !== null) knexResultUsers.set(e.id, e);
    });

  for (let comment of knexResult) {
    if (knexResultPost.has(comment.postId)) {
      let post = knexResultPost.get(comment.postId);
      comment.post = post;
      if (knexResultUsers.has(post.createdById))
        post.createdBy = knexResultUsers.get(post.createdById);
      else post.createdBy = null;
    } else comment.post = null;

    if (knexResultUsers.has(comment.createdById)) {
      comment.createdBy = knexResultUsers.get(comment.createdById);
    } else comment.createdBy = null;
  }

  bookResult = (await Comment.withSelect('post.createdBy', 'username')
    .withSelect('createdBy', 'username').get())
    .toJSON().map(removeProto);
  assert.deepStrictEqual(bookResult, knexResult);

  // Nested with.
  knexResult = (await knex.select().from(Comment.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(Comment));
  knexResultPost = new Map();
  (await knex.select(['id', 'text', 'createdById'])
    .from(Post.prototype.tableName)
    .where('title', 'not like', 'a%')
    .whereNull('deletedAt')).map(bookify(Post)).map((e) => {
      if (e.id !== null) knexResultPost.set(e.id, e);
    });
  knexResultUsers = new Map();
  (await knex.select(['id', 'username']).from(User.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(User)).map((e) => {
      if (e.id !== null) knexResultUsers.set(e.id, e);
    });

  for (let comment of knexResult) {
    if (knexResultPost.has(comment.postId)) {
      let post = knexResultPost.get(comment.postId);
      comment.post = post;
      if (knexResultUsers.has(post.createdById))
        post.createdBy = knexResultUsers.get(post.createdById);
      else post.createdBy = null;
    } else comment.post = null;

    if (knexResultUsers.has(comment.createdById)) {
      comment.createdBy = knexResultUsers.get(comment.createdById);
    } else comment.createdBy = null;
  }

  bookResult = (await Comment.withSelect('post',
  ['text', 'createdById'], (q) => {
    q.whereNotLike('title', 'a%');
    q.withSelect('createdBy', 'username');
  }).withSelect('createdBy', 'username').get())
    .toJSON().map(removeProto);
  assert.deepStrictEqual(bookResult, knexResult);

  bookResult = (await Comment.with({
    'post': (q) => {
      q.select(['text', 'createdById']);
      q.whereNotLike('title', 'a%');
      q.withSelect('createdBy', 'username');
    },
    'createdBy': (q) => {
      q.select('username');
    },
  }).get()).toJSON().map(removeProto);
  assert.deepStrictEqual(bookResult, knexResult);
};
