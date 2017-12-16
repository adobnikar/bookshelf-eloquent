'use strict';

const connection = require('../knexfile');
const knex = require('knex')(connection);

const assert = require('assert');
require('../libs/seedrandom-ext');
const compare = require('../libs/comapre');

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
  let knexResultOrdered = null;
  let bookResult = null;
  let bookResultOrdered = null;

  let users = User.prototype.tableName;
  let usersId = User.forge().idAttribute;
  let userHasRole = User.prototype.roles().relatedData;
  let roles = Role.prototype.tableName;
  let rolesId = Role.prototype.idAttribute;
  let roleHasRoles = Role.prototype.roles().relatedData;
  let tags = Tag.prototype.tableName;
  let tagsId = Tag.forge().idAttribute;
  let posts = Post.prototype.tableName;
  let postsId = Post.forge().idAttribute;
  let postHasTags = Post.prototype.tags().relatedData;

  knexResult = (await knex.select().from(users)
    .whereNull('deletedAt'))
    .map(bookify(User));
  knexResultOrdered = (await knex.select().from(users)
    .whereNull('deletedAt'))
    .map(bookify(User));

  let knexResultTags = new Map();
  (await knex.select().from(tags))
    .map(bookify(Tag)).map((e) => {
      if (e[tagsId] === null) return;
      knexResultTags.set(e[tagsId], e);
    });

  let knexResultPost = new Map();
  (await knex.select().from(posts)
    .whereNull('deletedAt'))
    .map(bookify(Post)).map((e) => {
      if (e.createdById === null) return;
      if (!knexResultPost.has(e.createdById))
        knexResultPost.set(e.createdById, []);
      knexResultPost.get(e.createdById).push(e);
    });

  let knexResultPostHasTagsOrdered = new Map();
  let knexResultPostHasTags = new Map();
  (await knex.select().from(postHasTags.joinTableName)).map((e) => {
    knexResultPostHasTagsOrdered.push(e[postHasTags.foreignKey],
      e[postHasTags.otherKey]);
  });
  // order
  for (let [key, arr] of knexResultPostHasTagsOrdered) {
    knexResultPostHasTagsOrdered.set(key, arr.sort((a, b) => a - b));
    knexResultPostHasTags.set(key, Array.from(knexResultTags.values()).filter(t => arr.includes(t.id)).map(t => t.id));
  }

  let knexResultRoles = new Map();
  (await knex.select().from(roles))
    .map(bookify(Role)).map((e) => {
      if (e.idAttr === null) return;
      knexResultRoles.set(e.idAttr, e);
    });

  let knexResultRoleHasRolesOrdered = new Map();
  let knexResultRoleHasRoles = new Map();
  (await knex.select().from(roleHasRoles.joinTableName)).map((e) => {
    knexResultRoleHasRolesOrdered.push(e[roleHasRoles.foreignKey],
      e[roleHasRoles.otherKey]);
  });
  // order
  for (let [key, arr] of knexResultRoleHasRolesOrdered) {
    knexResultRoleHasRolesOrdered.set(key, arr.sort((a, b) => a - b));
    knexResultRoleHasRoles.set(key, Array.from(knexResultRoles.values()).filter(r => arr.includes(r.idAttr)).map(r => r.idAttr));
  }

  let knexResultUserHasRoleOrderd = new Map();
  let knexResultUserHasRole = new Map();
  (await knex.select().from(userHasRole.joinTableName)).map((e) => {
    knexResultUserHasRoleOrderd.push(e[userHasRole.foreignKey],
      e[userHasRole.otherKey]);


  });
  // order
  for (let [key, arr] of knexResultUserHasRoleOrderd) {
    knexResultUserHasRoleOrderd.set(key, arr.sort((a, b) => a - b));
    knexResultUserHasRole.set(key, Array.from(knexResultRoles.values()).filter(r => arr.includes(r.idAttr)).map(r => r.idAttr));
  }

  for (let user of knexResult) {
    if (knexResultPost.has(user[usersId])) user.posts = knexResultPost.get(user[usersId]);
    else user.posts = [];
    if (knexResultUserHasRoleOrderd.has(user[usersId]))
      user.roles = resolve(knexResultRoles, knexResultUserHasRoleOrderd.get(user[usersId]));
    else user.roles = [];
    for (let post of user.posts) {
      if (knexResultPostHasTags.has(post[postsId]))
        post.tags = resolve(knexResultTags, knexResultPostHasTags.get(post[postsId]));
      else post.tags = [];
    }
    for (let role of user.roles) {
      if (knexResultRoleHasRoles.has(role.idAttr))
        role.roles = resolve(knexResultRoles,
          knexResultRoleHasRoles.get(role.idAttr));
      else role.roles = [];
      for (let role2 of role.roles) {
        if (knexResultRoleHasRoles.has(role2.idAttr))
          role2.roles = resolve(knexResultRoles,
            knexResultRoleHasRoles.get(role2.idAttr));
        else role2.roles = [];
      }
    }
  }
  bookResult = (await User.with(['posts.tags', 'roles.roles.roles']).get())
    .toJSON().map(removeProto);
  knexResult = knexResult.map(removeProto);
  compare.diff(bookResult, knexResult);
  assert.deepStrictEqual(bookResult, knexResult);

  for (let user of knexResultOrdered) {
    if (knexResultPost.has(user[usersId])) user.posts = knexResultPost.get(user[usersId]);
    else user.posts = [];
    if (knexResultUserHasRoleOrderd.has(user[usersId]))
      user.roles = resolve(knexResultRoles, knexResultUserHasRoleOrderd.get(user[usersId]));
    else user.roles = [];
    for (let post of user.posts) {
      if (knexResultPostHasTagsOrdered.has(post[postsId]))
        post.tags = resolve(knexResultTags, knexResultPostHasTagsOrdered.get(post[postsId]));
      else post.tags = [];
    }
    for (let role of user.roles) {
      if (knexResultRoleHasRolesOrdered.has(role.idAttr))
        role.roles = resolve(knexResultRoles,
          knexResultRoleHasRolesOrdered.get(role.idAttr));
      else role.roles = [];
      for (let role2 of role.roles) {
        if (knexResultRoleHasRolesOrdered.has(role2.idAttr))
          role2.roles = resolve(knexResultRoles,
            knexResultRoleHasRolesOrdered.get(role2.idAttr));
        else role2.roles = [];
      }
    }
  }

  knexResultOrdered = knexResultOrdered.map(removeProto);
  bookResultOrdered = (await User.with('posts', (pq) => {
      //pq.orderBy('postIdAttr', 'asc');
      pq.with('tags', (tq) => {
        tq.orderBy('id', 'asc');
      });
    }).with('roles', (rq) => {
      rq.orderBy('idAttr', 'asc');
      rq.with('roles', (rq) => {
        rq.orderBy('idAttr', 'asc');
        rq.with('roles', (rq) => {
          rq.orderBy('idAttr', 'asc');
        });
      });
    }).get()).toJSON().map(removeProto);
  compare.diff(bookResultOrdered, knexResultOrdered);
  assert.deepStrictEqual(bookResultOrdered, knexResultOrdered);

  // Nested with.
  knexResult = (await knex.select([usersId, 'username']).from(users)
    .whereNull('deletedAt'))
    .map(bookify(User));

  knexResultUserHasRole = new Map();
  (await knex.select().from(userHasRole.joinTableName)).map((e) => {
    knexResultUserHasRole.push(e[userHasRole.foreignKey],
      e[userHasRole.otherKey]);
  });

  knexResultTags = new Map();
  (await knex.select([tagsId, 'name']).from(tags))
    .map(bookify(Tag)).map((e) => {
      if (e[tagsId] === null) return;
      knexResultTags.set(e[tagsId], e);
    });

  knexResultPost = new Map();
  (await knex.select([postsId, 'text', 'createdById']).from(posts)
    .whereNull('deletedAt')
    .where('title', 'not like', 'a%'))
    .map(bookify(Post)).map((e) => {
      if (e.createdById === null) return;
      if (!knexResultPost.has(e.createdById))
        knexResultPost.set(e.createdById, []);
      knexResultPost.get(e.createdById).push(e);
    });

  knexResultPostHasTagsOrdered = new Map();
  (await knex.select().from(postHasTags.joinTableName)).map((e) => {
    knexResultPostHasTagsOrdered.push(e[postHasTags.foreignKey],
      e[postHasTags.otherKey]);
  });

  knexResultRoles = new Map();
  (await knex.select(['idAttr', 'name']).from(roles))
    .map(bookify(Role)).map((e) => {
      if (e.idAttr === null) return;
      knexResultRoles.set(e.idAttr, e);
    });

  knexResultRoleHasRolesOrdered = new Map();
  (await knex.select().from(roleHasRoles.joinTableName)).map((e) => {
    knexResultRoleHasRolesOrdered.push(e[roleHasRoles.foreignKey],
      e[roleHasRoles.otherKey]);
  });

  for (let user of knexResult) {
    if (knexResultPost.has(user[usersId])) user.posts = knexResultPost.get(user[usersId]);
    else user.posts = [];
    if (knexResultUserHasRole.has(user[usersId]))
      user.roles = resolve(knexResultRoles, knexResultUserHasRole.get(user[usersId]));
    else user.roles = [];
    for (let post of user.posts) {
      if (knexResultPostHasTagsOrdered.has(post[postsId]))
        post.tags = resolve(knexResultTags, knexResultPostHasTagsOrdered.get(post[postsId]));
      else post.tags = [];
    }
    for (let role of user.roles) {
      if (knexResultRoleHasRolesOrdered.has(role.idAttr))
        role.roles = resolve(knexResultRoles,
          knexResultRoleHasRolesOrdered.get(role.idAttr));
      else role.roles = [];
      for (let role2 of role.roles) {
        if (knexResultRoleHasRolesOrdered.has(role2.idAttr))
          role2.roles = resolve(knexResultRoles,
            knexResultRoleHasRolesOrdered.get(role2.idAttr));
        else role2.roles = [];
      }
    }
  }

  knexResult = knexResult.map(removeProto);
  bookResult = (await User.select([usersId, 'username']).with('posts', (q) => {
    q.select([postsId, 'text']);
    q.whereNotLike('title', 'a%');
    q.withSelect('tags', ['name'], (tq) => {
      tq.orderBy('id', 'asc');
    });
  }).with('roles', (q) => {
    q.orderBy('idAttr', 'asc');
    q.select('name');
    q.withSelect('roles', ['name'], (q) => {
      q.orderBy('idAttr', 'asc');
      q.withSelect('roles', ['name'], (q) => {
        q.orderBy('idAttr', 'asc');
      });
    });
  }).get())
    .toJSON().map(removeProto);
  compare.diff(bookResult, knexResult);
  assert.deepStrictEqual(bookResult, knexResult);
};
