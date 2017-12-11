'use strict';

require('../libs/seedrandom-ext');

const Enrolment = require('../models/enrolment');
const Group = require('../models/group');
const User = require('../models/user');

exports.seed = async function(knex, Promise) {
  // Init.
  let enrolmentsCollection = Enrolment.collection();
  // Seeded random number generator. Random but always the same.
  let rng = new Math.seedrandom('mrdWmrNoKCLKwhN4CiyRbOaitxvVNPM0wCpQA0nXuL8gPwpIVU');

  // Get all users and posts.
  let users = (await User.select('userIdAttr').get()).toJSON();
  let groups = (await Group.select('idAttr').get()).toJSON();

  // Remove two random users.
  for (let i = 0; i < 2; i++)
    users.splice(rng.int(users.length), 1);
  // Remove one random group.
  groups.splice(rng.int(groups.length), 1);

  // Generate all possible enrolment pairs.
  let pairs = [];
  for (let user of users) {
    for (let group of groups) {
      pairs.push({
        userId: user.userIdAttr,
        groupId: group.idAttr,
        approvedAt: (rng.int(5) === 1) ? null : (new Date()), // A random chance this enrolment is not approved.
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
  enrolmentsCollection.add(pairs);

  await enrolmentsCollection.insert();
};
