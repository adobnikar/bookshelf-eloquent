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

const Person = require('../models/person');

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
  let usersId = User.forge().idAttribute;
  let userHasRole = User.prototype.roles().relatedData;
  let roles = Role.prototype.tableName;
  let rolesId = Role.prototype.idAttribute;
  let roleHasRoles = Role.prototype.roles().relatedData;
  let tags = Tag.prototype.tableName;
  let posts = Post.prototype.tableName;
  let postsId = Post.forge().idAttribute;
  let postHasTags = Post.prototype.tags().relatedData;

  // Select user which have at least one post.
  let bookUsersAll = (await User.withCount('posts')
    .withDeleted().get()).toJSON();
  let usersIndex = new Map();
  let bookUsers = (await User.whereHas('posts').get()).toJSON().map((e) => {
    usersIndex.set(e[usersId], e);
  });
  for (let user of bookUsersAll) {
    assert.equal(user.postsCount > 0 && (user.deletedAt !== null),
      usersIndex.has(user[usersId]));
  }

  assert.equal((await Person.has('dogs').buildQuery()).query.toString(),
    'select `person`.* from `person` where (exists (select * from `dog` where `person_idAttr` in (`person`.`idAttr`) and `dog`.`deletedAt` is null)) and `person`.`deletedAt` is null');

  assert.equal((await User.has('posts').buildQuery()).query.toString(),
    'select `users`.* from `users` where (exists (select * from `posts` where `createdById` in (`users`.`userIdAttr`) and `posts`.`deletedAt` is null)) and `users`.`deletedAt` is null');

  assert.equal((await User.has('posts', '>=', 5).buildQuery()).query.toString(),
    'select `users`.* from `users` where ((select count(*) from `posts` where `createdById` in (`users`.`userIdAttr`) and `posts`.`deletedAt` is null) >= 5) and `users`.`deletedAt` is null');

  assert.equal((await User.has('posts.comments').buildQuery()).query.toString(),
    'select `users`.* from `users` where (exists (select * from `comments` where `postId` in (select `postIdAttr` from `posts` where `createdById` in (`users`.`userIdAttr`) and `posts`.`deletedAt` is null) and `comments`.`deletedAt` is null)) and `users`.`deletedAt` is null');

  assert.equal((await User.whereHas('posts', (q) => {
    q.where('title', 'like', 'foo%');
  }).buildQuery()).query.toString(),
    'select `users`.* from `users` where (exists (select * from `posts` where `createdById` in (`users`.`userIdAttr`) and `title` like \'foo%\' and `posts`.`deletedAt` is null)) and `users`.`deletedAt` is null');

  assert.equal((await User.whereHas('posts', (q) => {
    q.where('title', 'like', 'foo%');
  }, '>=', 5).buildQuery()).query.toString(),
    'select `users`.* from `users` where ((select count(*) from `posts` where `createdById` in (`users`.`userIdAttr`) and `title` like \'foo%\' and `posts`.`deletedAt` is null) >= 5) and `users`.`deletedAt` is null');

  assert.equal((await User.whereHas('posts.comments', (q) => {
    q.where('text', 'like', 'bar%');
  }).buildQuery()).query.toString(),
    'select `users`.* from `users` where (exists (select * from `comments` where `postId` in (select `postIdAttr` from `posts` where `createdById` in (`users`.`userIdAttr`) and `posts`.`deletedAt` is null) and `text` like \'bar%\' and `comments`.`deletedAt` is null)) and `users`.`deletedAt` is null');

  assert.equal((await User.whereHas('posts', (q) => {
    q.where('title', 'like', 'foo%');
    q.has('comments');
  }).buildQuery()).query.toString(),
    'select `users`.* from `users` where (exists (select * from `posts` where `createdById` in (`users`.`userIdAttr`) and `title` like \'foo%\' and (exists (select * from `comments` where `postId` in (`posts`.`postIdAttr`) and `comments`.`deletedAt` is null)) and `posts`.`deletedAt` is null)) and `users`.`deletedAt` is null');
};
