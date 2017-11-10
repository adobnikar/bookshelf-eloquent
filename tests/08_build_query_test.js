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

exports.test = async function() {
  // Run the test. This function is required.

  let subquery = await User.where('votes', '>', 100)
    .andWhere('status', 'active')
    .orWhere('name', 'John')
    .select('idAttr').buildQuery();
  let posts = await Post.whereIn('createdById', subquery.query).buildQuery();
  assert.equal(posts.query.toString(),
    'select `posts`.* from `posts` where `createdById` in (select `idAttr` from ' +
    '`users` where `votes` > 100 and `status` = \'active\' or `name` ' +
    '= \'John\' and `users`.`deletedAt` is null) and ' +
    '`posts`.`deletedAt` is null');

  subquery = await Post.select('idAttr').buildQuery();
  let comments = await Comment.select('name')
    .whereIn('postId', subquery.query).buildQuery();
  assert.equal(comments.query.toString(), 'select `name` from `comments` ' +
    'where `postId` in (select `idAttr` from `posts` where `posts`.`deletedAt` ' +
    'is null) and `comments`.`deletedAt` is null');

  let sync = await User.where('idAttr', 57).fakeSync();
  let knexBuilder = sync.query;
  assert.equal(knexBuilder.toString(),
    'select * from `users` where `idAttr` = 57 and `users`.`deletedAt` is null');

  sync = await User.where('idAttr', 57).buildQuery({columns: ['idAttr', 'username']});
  knexBuilder = sync.query;
  assert.equal(knexBuilder.toString(),
    'select `idAttr`, `username` from `users` where `idAttr` = 57 and ' +
    '`users`.`deletedAt` is null');

  sync = await User.where('idAttr', 57).useTableAlias('t').buildQuery();
  knexBuilder = sync.query;
  assert.equal(knexBuilder.toString(), 'select `t`.* from `users` as `t` where `idAttr` = 57 and `t`.`deletedAt` is null');
};








