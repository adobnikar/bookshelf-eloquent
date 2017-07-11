'use strict';

const connection = require('../knexfile');
const knex = require('knex')(connection);

const assert = require('assert');
const Group = require('../models/group');
const User = require('../models/user');
const Role = require('../models/role');

const union = require('lodash/union');
const flattenDeep = require('lodash/flattenDeep');

exports.setUp = async function() {
  // Prepare the data for the test. This is an optional function.
  // ...
};

exports.test = async function() {
  // Run the test. This function is required.
  // ...
  let t1 = (await Group.nameContains('math').get()).toJSON();
  let t2 = (await Group.query('where', 'name', 'like', '%math%').get()).toJSON();
  assert.deepStrictEqual(t1, t2);

  t1 = (await User.whereAdmin().get()).toJSON();
  t2 = (await Role.where('name', 'admin').with('users').first()).toJSON();
  assert.deepStrictEqual(t1, t2.users);

  t1 = (await User.with('mgroups').get()).toJSON();
  t2 = (await Group.query('where', 'name', 'like', '%math%').with('owner').get()).toJSON();
  assert.deepStrictEqual(t1.filter((t) => { return t.mgroups.length > 0; }).map((t) => { return t.id; }).sort(),
    union(t2.map((t) => { return t.owner.id; }), []).sort());
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
