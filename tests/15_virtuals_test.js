'use strict';

const assert = require('assert');
const Group = require('../models/group');
const User = require('../models/user-virtuals');

exports.setUp = async function() {
  // Prepare the data for the test. This is an optional function.
  // ...
};

exports.test = async function() {
  // Run the test. This function is required.
  // This test passes if no errors happen.

  let id = 1;

  let group = await Group
    .where({id: id})
    .with(['user'])
    .first();

  let user = group.relations.user;

  let fullName = user.get('fullName');
  user.set('fullName', 'New Fullname');

  assert.equal(user.get('fullName'), fullName);
};

exports.tearDown = async function() {
  // Clean everything after test. This is an optional function.
  // ...
};

// Test only this file.
(async() => {
  await exports.setUp();
  await exports.test();
  await exports.tearDown();
})().catch((error) => {
  console.error(error);
});
