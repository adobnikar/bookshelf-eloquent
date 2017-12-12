const connection = require('../knexfile');
const knex = require('knex')(connection);

const groupBy = require('lodash/groupBy');

const assert = require('assert');

const Comment = require('../models/comment');
const Post = require('../models/post');
const Tag = require('../models/tag');
const User = require('../models/user');

exports.test = async function() {
  let users = (await User.with('posts.comments.createdBy', (uq) => {
    uq.whereLike('username', 'a%');
  }).get()).toJSON();
  let usersAlias = (await User.with('posts.comments.createdBy as pAlias.cAlias', (uq) => {
    uq.whereLike('username', 'a%');
  }).get()).toJSON();

  for (let user of usersAlias) {
    user.posts = user.pAlias;
    delete user.pAlias;
    for (let post of user.posts) {
      post.comments = post.cAlias;
      delete post.cAlias;
    }
  }

  users = (await User.withSelect('posts.comments.createdBy', ['*'], (uq) => {
    uq.whereLike('username', 'a%');
  }).get()).toJSON();
  usersAlias = (await User.withSelect('posts.comments.createdBy as pAlias.cAlias', ['*'], (uq) => {
    uq.whereLike('username', 'a%');
  }).get()).toJSON();

  for (let user of usersAlias) {
    user.posts = user.pAlias;
    delete user.pAlias;
    for (let post of user.posts) {
      post.comments = post.cAlias;
      delete post.cAlias;
    }
  }

  assert.deepStrictEqual(users, usersAlias);

  users = (await User.withCount('posts.comments', (cq) => {
    cq.whereNotLike('text', 'a%');
  }).get()).toJSON();
  usersAlias = (await User.withCount('posts.comments as count', (cq) => {
    cq.whereNotLike('text', 'a%');
  }).get()).toJSON();
  for (let user of usersAlias) {
    user.postsCommentsCount = user.count;
    delete user.count;
  }

  assert.deepStrictEqual(users, usersAlias);
};
