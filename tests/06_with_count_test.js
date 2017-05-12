'use strict';

const connection = require('../knexfile');
const knex = require('knex')(connection);

const assert = require('assert');
require('../libs/seedrandom-ext');

const isArray = require('lodash/isArray');
const isPlainObject = require('lodash/isPlainObject');
const union = require('lodash/union');
const clone = require('lodash/clone');

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

Map.prototype.push = function(key, value) {
  if (!this.has(key)) this.set(key, []);
  this.get(key).push(value);
};

function resolve(map, keys) {
  let results = [];
  for (let key of keys) {
    if (!map.has(key)) continue;
    results.push(clone(map.get(key)));
  }
  return results;
}

Map.prototype.increment = function(key, value) {
  if (!this.has(key)) this.set(key, 0);
  this.set(key, this.get(key) + 1);
};

Map.prototype.add = function(key, value) {
  if (!this.has(key)) this.set(key, new Set());
  this.get(key).add(value);
};

Map.prototype.getDef = function(key, defaultValue) {
  if (!this.has(key)) return defaultValue;
  return this.get(key);
};

exports.test = async function() {
  // Run the test. This function is required.
  let knexResult = null;
  let bookResult = null;

  let comments = Comment.prototype.tableName;
  let users = User.prototype.tableName;
  let friends = Friend.prototype.tableName;
  let usersId = User.prototype.idAttribute;
  let userHasRole = User.prototype.roles().relatedData;
  let roles = Role.prototype.tableName;
  let rolesId = Role.prototype.idAttribute;
  let roleHasRoles = Role.prototype.roles().relatedData;
  let tags = Tag.prototype.tableName;
  let posts = Post.prototype.tableName;
  let postsId = Post.prototype.idAttribute;
  let postHasTags = Post.prototype.tags().relatedData;

  // How many posts does each user have.
  let knexUserPostsMap = new Map();
  (await knex.select(['id', 'createdById']).from(posts)
  .whereNull('deletedAt')).map((e) => {
    knexUserPostsMap.increment(e.createdById);
  });

  let bookUsers = (await User.select('id').withCount('posts').get()).toJSON();
  for (let user of bookUsers) {
    let expected = knexUserPostsMap.getDef(user.id, 0);
    assert.equal(user.postsCount, expected);
  }

  // How many posts does each user have with deleted.
  knexUserPostsMap = new Map();
  (await knex.select(['id', 'createdById']).from(posts)
  .where('title', 'not like', '%a')).map((e) => {
    knexUserPostsMap.increment(e.createdById);
  });

  bookUsers = (await User.select('id').withCount('posts', (q) => {
    q.withDeleted();
    q.whereNotLike('title', '%a');
  }).get()).toJSON();

  for (let user of bookUsers) {
    let expected = knexUserPostsMap.getDef(user.id, 0);
    assert.equal(user.postsCount, expected);
  }

  // How many friends does each user have.
  let knexUsersMap = new Map();
  (await knex.select(['id', 'username']).from(users)
  .whereNull('deletedAt')).map((e) => {
    knexUsersMap.set(e.id, e);
  });

  let knexFriendsCount = new Map();
  (await knex.select(['user1Id', 'user2Id']).from(friends)).map((e) => {
    if (knexUsersMap.has(e.user2Id))
      knexFriendsCount.increment(e.user1Id);
  });

  bookUsers = (await (await User.select('id')
    .withCount('friends1.user2')).get()).toJSON();
  for (let user of bookUsers) {
    let expected = knexFriendsCount.getDef(user.id, 0);
    assert.equal(user.friends1User2Count, expected);
  }

  // How many post comments, post tags and commants does each user have.
  let knexPostUsersMap = new Map();
  (await knex.select(['id', 'createdById']).from(posts)
  .whereNull('deletedAt')).map((e) => {
    knexPostUsersMap.set(e.id, e.createdById);
  });

  let knexUserPostsCommentsCount = new Map();
  let knexUserCommentsCount = new Map();
  (await knex.select(['id', 'postId', 'createdById']).from(comments)
  .whereNull('deletedAt').where('text', 'not like', 'q%')).map((e) => {
    knexUserCommentsCount.increment(e.createdById);
    if (knexPostUsersMap.has(e.postId))
      knexUserPostsCommentsCount.add(knexPostUsersMap.get(e.postId), e.id);
  });

  let knexUserPostTagsCount = new Map();
  (await knex.select(['postId', 'tagId']).from('post_has_tags')).map((e) => {
    if (knexPostUsersMap.has(e.postId))
      knexUserPostTagsCount.add(knexPostUsersMap.get(e.postId), e.tagId);
  });

  bookUsers = (await User.select(['id', 'username'])
    .withCount('posts.comments', (q) => {
      q.whereNotLike('text', 'q%');
    })
    .withCount('posts.tags')
    .withCount('comments', (q) => {
      q.whereNotLike('text', 'q%');
    })
    .get()).toJSON();

  for (let user of bookUsers) {
    let expected = knexUserPostsCommentsCount.getDef(user.id, new Set()).size;
    assert.equal(user.postsCommentsCount, expected);
    expected = knexUserCommentsCount.getDef(user.id, 0);
    assert.equal(user.commentsCount, expected);
    expected = knexUserPostTagsCount.getDef(user.id, new Set()).size;
    assert.equal(user.postsTagsCount, expected);
  }

  // How many tags does a post have.
  let knexPostTagsCount = new Map();
  (await knex.select(['postId', 'tagId']).from('post_has_tags')).map((e) => {
    knexPostTagsCount.increment(e.postId);
  });

  let bookPosts = (await Post.select(['id', 'title'])
    .withCount('tags').get()).toJSON();
  for (let post of bookPosts) {
    let expected = knexPostTagsCount.getDef(post.id, 0);
    assert.equal(post.tagsCount, expected);
  }

  // How many post users does a comment have.
  knexPostUsersMap = new Map();
  (await knex.select(['id', 'createdById']).from(posts)
  .whereNull('deletedAt')).map((e) => {
    knexPostUsersMap.set(e.id, e.createdById);
  });

  let commentPostUserCount = new Map();
  (await knex.select(['id', 'postId']).from(comments)
  .whereNull('deletedAt')).map((e) => {
    if (knexPostUsersMap.has(e.postId))
      commentPostUserCount.increment(e.id);
  });

  let bookComments = (await Comment.select(['id', 'text'])
    .withCount('post.createdBy').get()).toJSON();

  for (let comment of bookComments) {
    let expected = commentPostUserCount.getDef(comment.id, 0);
    assert.equal(comment.postCreatedByCount, expected);
  }
};
