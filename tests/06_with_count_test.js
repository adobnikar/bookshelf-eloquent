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

exports.test = async function() {
  // Run the test. This function is required.
  let knexResult = null;
  let bookResult = null;

  let users = User.prototype.tableName;
  let usersId = User.prototype.idAttribute;
  let userHasRole = User.prototype.roles().relatedData;
  let roles = Role.prototype.tableName;
  let rolesId = Role.prototype.idAttribute;
  let roleHasRoles = Role.prototype.roles().relatedData;
  let tags = Tag.prototype.tableName;
  let posts = Post.prototype.tableName;
  let postsId = Post.prototype.idAttribute;
  let postHasTags = Post.prototype.tags().relatedData;

  let knexUserPostsMap = new Map();
  (await knex.select(['id', 'createdById']).from(posts)
  .whereNull('deletedAt')).map((e) => {
    if (!knexUserPostsMap.has(e.createdById))
      knexUserPostsMap.set(e.createdById, 0);
    knexUserPostsMap.set(e.createdById,
      knexUserPostsMap.get(e.createdById) + 1);
  });

  let bookUsers = (await User.select('id').withCount('posts').get()).toJSON();
  for (let user of bookUsers) {
    let expected = 0;
    if (knexUserPostsMap.has(user.id)) expected = knexUserPostsMap.get(user.id);
    assert.equal(user.postsCount, expected);
  }
};
