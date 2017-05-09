'use strict';

const connection = require('../knexfile');
const knex = require('knex')(connection);

const assert = require('assert');
require('../libs/seedrandom-ext');

const isArray = require('lodash/isArray');
const union = require('lodash/union');
const isPlainObject = require('lodash/isPlainObject');

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
  delete obj.__proto__;

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

  knexResult = (await knex.select().from(User.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(User));
  let knexResultPost = new Map();
  (await knex.select().from(Post.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(Post)).map((e) => {
      if (e.createdById === null) return;
      if (!knexResultPost.has(e.createdById))
        knexResultPost.set(e.createdById, []);
      knexResultPost.get(e.createdById).push(e);
    });
  let knexResultComments = new Map();
  (await knex.select().from(Comment.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(Comment)).map((e) => {
      if (e.postId === null) return;
      if (!knexResultComments.has(e.postId))
        knexResultComments.set(e.postId, []);
      knexResultComments.get(e.postId).push(e);
    });

  for (let user of knexResult) {
    if (knexResultPost.has(user.id)) user.posts = knexResultPost.get(user.id);
    else user.posts = [];
    for (let post of user.posts) {
      if (knexResultComments.has(post.id))
        post.comments = knexResultComments.get(post.id);
      else post.comments = [];
    }
  }

  bookResult = (await User.with('posts.comments').get())
    .toJSON().map(removeProto);
  assert.deepStrictEqual(bookResult, knexResult);

  // With select.
  knexResult = (await knex.select().from(User.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(User));
  knexResultPost = new Map();
  (await knex.select().from(Post.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(Post)).map((e) => {
      if (e.createdById === null) return;
      if (!knexResultPost.has(e.createdById))
        knexResultPost.set(e.createdById, []);
      knexResultPost.get(e.createdById).push(e);
    });
  knexResultComments = new Map();
  (await knex.select(['text', 'postId']).from(Comment.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(Comment)).map((e) => {
      if (e.postId === null) return;
      if (!knexResultComments.has(e.postId))
        knexResultComments.set(e.postId, []);
      knexResultComments.get(e.postId).push(e);
    });

  for (let user of knexResult) {
    if (knexResultPost.has(user.id)) user.posts = knexResultPost.get(user.id);
    else user.posts = [];
    for (let post of user.posts) {
      if (knexResultComments.has(post.id))
        post.comments = knexResultComments.get(post.id);
      else post.comments = [];
    }
  }

  bookResult = (await User.withSelect('posts.comments',
    ['text']).get())
    .toJSON().map(removeProto);
  assert.deepStrictEqual(bookResult, knexResult);

  // Nested with.
  knexResult = (await knex.select().from(User.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(User));
  knexResultPost = new Map();
  (await knex.select(['id', 'text', 'createdById'])
    .from(Post.prototype.tableName)
    .whereNull('deletedAt')
    .where('title', 'not like', 'a%'))
    .map(bookify(Post)).map((e) => {
      if (e.createdById === null) return;
      if (!knexResultPost.has(e.createdById))
        knexResultPost.set(e.createdById, []);
      knexResultPost.get(e.createdById).push(e);
    });
  knexResultComments = new Map();
  (await knex.select(['text', 'postId']).from(Comment.prototype.tableName)
    .whereNull('deletedAt')).map(bookify(Comment)).map((e) => {
      if (e.postId === null) return;
      if (!knexResultComments.has(e.postId))
        knexResultComments.set(e.postId, []);
      knexResultComments.get(e.postId).push(e);
    });

  for (let user of knexResult) {
    if (knexResultPost.has(user.id)) user.posts = knexResultPost.get(user.id);
    else user.posts = [];
    for (let post of user.posts) {
      if (knexResultComments.has(post.id))
        post.comments = knexResultComments.get(post.id);
      else post.comments = [];
    }
  }

  bookResult = (await User.withSelect('posts', ['id', 'text'], (q) => {
    q.whereNotLike('title', 'a%');
    q.withSelect('comments', 'text');
  }).get())
    .toJSON().map(removeProto);
  assert.deepStrictEqual(bookResult, knexResult);
};
