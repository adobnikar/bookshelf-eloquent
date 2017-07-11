'use strict';

const assert = require('assert');
const Group = require('../models/group');
const User = require('../models/user');

exports.test = async function() {
  // Run the test. This function is required.
  let users = await User.with('mgroups').get();
  users = users.toJSON();
  for (let user of users) {
    user.groups = user.mgroups;
    delete user.mgroups;
  }

  let usersCmp = await User.with('groups', (q) => {
    q.nameContains('math');
  }).get();
  usersCmp = usersCmp.toJSON();
  assert.deepStrictEqual(users, usersCmp);

  // TODO: maybe add some more tests.
  // tests for all different relation types.
};

// Test only this file.
/*(async() => {
  //await exports.setUp();
  await exports.test();
  //await exports.tearDown();
})().catch((error) => {
  console.error(error);
});*/
