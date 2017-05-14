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
    .select('id').buildQuery();
  let posts = await Post.whereIn('createdById', subquery.query).buildQuery();
  assert.equal(posts.query.toString(),
    'select `posts`.* from `posts` where `createdById` in (select `id` from ' +
    '`users` where `votes` > 100 and `status` = \'active\' or `name` ' +
    '= \'John\' and `users`.`deletedAt` is null) and ' +
    '`posts`.`deletedAt` is null');

  subquery = await Post.select('id').buildQuery();
  let comments = await Comment.select('name')
    .whereIn('postId', subquery.query).buildQuery();
  assert.equal(comments.query.toString(), 'select `name` from `comments` ' +
    'where `postId` in (select `id` from `posts` where `posts`.`deletedAt` ' +
    'is null) and `comments`.`deletedAt` is null');
};








