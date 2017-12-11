const connection = require('../knexfile');
const knex = require('knex')(connection);

const groupBy = require('lodash/groupBy');

const assert = require('assert');

const Comment = require('../models/comment');
const Post = require('../models/post');
const Tag = require('../models/tag');
const User = require('../models/user');

exports.test = async function() {
  let users = (await User.with('posts.comments.createdBy').get()).toJSON();
  let usersAlias = (await User.with('posts.comments.createdBy as pAlias.cAlias').get()).toJSON();

  for (let user of usersAlias) {
    user.posts = user.pAlias;
    delete user.pAlias;
    for (let post of user.posts) {
      post.comments = post.cAlias;
      delete post.cAlias;
    }
  }

  users = (await User.withSelect('posts.comments.createdBy', ['*']).get()).toJSON();
  usersAlias = (await User.withSelect('posts.comments.createdBy as pAlias.cAlias', ['*']).get()).toJSON();

  for (let user of usersAlias) {
    user.posts = user.pAlias;
    delete user.pAlias;
    for (let post of user.posts) {
      post.comments = post.cAlias;
      delete post.cAlias;
    }
  }

  assert.deepStrictEqual(users, usersAlias);

  users = (await User.withCount('posts.comments').get()).toJSON();
  usersAlias = (await User.withCount('posts.comments as count').get()).toJSON();
  for (let user of usersAlias) {
    user.postsCommentsCount = user.count;
    delete user.count;
  }

  assert.deepStrictEqual(users, usersAlias);
};
