'use strict';

require('../libs/seedrandom-ext');

const Friend = require('../models/friend');
const User = require('../models/user');

exports.seed = async function(knex, Promise) {
  // Init.
  let friendsCollection = Friend.collection();
  // Seeded random number generator. Random but always the same.
  let rng = new Math.seedrandom('3ZJpEGPGisMIfy7pocrkFOD0v7V4G0KmJBxk0KwtW8O1SiHmfO');

  // Get all users.
  let users = (await User.select('id').get()).toJSON();

  // Generate all possible friend pairs.
  let pairs = [];
  for (let i = 0; i < users.length - 1; i++) {
    for (let j = i + 1; j < users.length; j++) {
      pairs.push({
        user1Id: users[i].id,
        user2Id: users[j].id,
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
  friendsCollection.add(pairs);

  await friendsCollection.insert();
};
