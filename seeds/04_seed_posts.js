'use strict';

require('../libs/seedrandom-ext');
const faker = require('faker');

const Post = require('../models/post');
const User = require('../models/user');

exports.seed = async function(knex, Promise) {
  // Init.
  let postsCollection = Post.collection();
  // Seeded random number generator. Random but always the same.
  let rng = new Math.seedrandom('3ZJpEGPGisMIfy7pocrkFOD0v7V4G0KmJBxk0KwtW8O1SiHmfO');

  // Get all users.
  let users = (await User.select('id').get()).toJSON();

  // Seed faker.
  faker.seed(rng.int(1000000));

  // Remove two random users.
  users.splice(rng.int(users.length), 1);
  users.splice(rng.int(users.length), 1);

  // Generate a number of random posts.
  let postsCount = users.length * 2;
  while (postsCount > 0) {
    postsCount--;

    // Pick a random user.
    let user = users[rng.int(users.length)];

    // Create a random post.
    postsCollection.add({
      title: faker.lorem.sentence(),
      visible: (rng.int(5) === 1) ? false : true, // A random chance this post is not visible/published.
      text: faker.lorem.paragraphs(),
      createdById: user.id,
      deletedAt: (rng.int(5) === 1) ? (new Date()) : null, // A random chance this post was deleted.
    });
  }

  await postsCollection.insert();
};
