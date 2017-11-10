'use strict';

require('../libs/seedrandom-ext');
const faker = require('faker');

const Comment = require('../models/comment');
const Post = require('../models/post');
const User = require('../models/user');

exports.seed = async function(knex, Promise) {
  // Init.
  let commentsCollection = Comment.collection();
  // Seeded random number generator. Random but always the same.
  let rng = new Math.seedrandom('cG2kzvugGkwUL3MI7RBJ6xgQd1TQSuZI2zc4jPdabATOMLhJP6');

  // Get all users and posts.
  let users = (await User.select('idAttr').get()).toJSON();
  let posts = (await Post.select('idAttr').withTrashed().get()).toJSON();

  // Seed faker.
  faker.seed(rng.int(1000000));

  // Remove two random users.
  for (let i = 0; i < 2; i++)
    users.splice(rng.int(users.length), 1);
  // Remove three random posts.
  for (let i = 0; i < 3; i++)
    posts.splice(rng.int(posts.length), 1);

  // Generate a number of random posts.
  let commentsCount = posts.length * 2;
  while (commentsCount > 0) {
    commentsCount--;

    // Pick a random user.
    let user = users[rng.int(users.length)];
    // Pick a random post.
    let post = posts[rng.int(posts.length)];

    // Create a random post.
    commentsCollection.add({
      text: faker.lorem.sentence(),
      postId: post.idAttr,
      createdById: (rng.int(5) === 1) ? null : user.idAttr, // A random chance this comment was created by an anonymous user.
      deletedAt: (rng.int(5) === 1) ? (new Date()) : null, // A random chance this comment was deleted.
    });
  }

  await commentsCollection.insert();
};
