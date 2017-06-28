'use strict';

const assert = require('assert');
const Group = require('../models/group');
const User = require('../models/user');

exports.setUp = async function() {
  // Prepare the data for the test. This is an optional function.
  // ...
};

exports.test = async function() {
  // Run the test. This function is required.
  // ...

  let group = await Group.nameContains('math').first();
  group.name = "asas";
  console.log(group);

  let groups = await Group.nameContains('math').get();
  console.log(groups.toJSON());

  let users = await User.with('groups').get({withRelated: ['mgroups']});
  console.log(users.toJSON());
};

exports.tearDown = async function() {
  // Clean everything after test. This is an optional function.
  // ...
};

// Test only this file.
/*(async() => {
  await exports.setUp();
  await exports.test();
  await exports.tearDown();
})().catch((error) => {
  console.error(error);
});*/
