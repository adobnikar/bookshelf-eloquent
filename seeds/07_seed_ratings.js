'use strict';

require('../libs/seedrandom-ext');
const faker = require('faker');

const Rating = require('../models/rating');
const Post = require('../models/post');
const User = require('../models/user');

exports.seed = async function(knex, Promise) {
  // Init.
  let ratingsCollection = Rating.collection();
  // Seeded random number generator. Random but always the same.
  let rng = new Math.seedrandom('qaJawrTFKQ4n3wtxx3ZJmVhRLif7NTe2M19np61fWBMP3pkIFn');

  // Get all users and posts.
  let users = (await User.select('id').get()).toJSON();
  let posts = (await Post.select('id').withDeleted().get()).toJSON();

  // Seed faker.
  faker.seed(rng.int(1000000));

  // Remove two random users.
  for (let i = 0; i < 2; i++)
    users.splice(rng.int(users.length), 1);
  // Remove three random posts.
  for (let i = 0; i < 3; i++)
    posts.splice(rng.int(posts.length), 1);

  // Generate all possible ratings pairs.
  let pairs = [];
  for (let user of users) {
    for (let post of posts) {
      pairs.push({
        userId: user.id,
        postId: post.id,
        value: rng.int(6),
        comment: faker.lorem.sentence(),
      });
    }
  }

  // Remove random pairs.
  let removeCount = Math.round(pairs.length / 2);
  while (removeCount > 0) {
    removeCount--;
    pairs.splice(rng.int(pairs.length), 1);
  }

  // Create random pairs.
  ratingsCollection.add(pairs);

  await ratingsCollection.insert();
};
