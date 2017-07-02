'use strict';

const connection = require('../knexfile');
const knex = require('knex')(connection);

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

  /*let subQuery = knex('groups')
    .where('name', 'like', '%math%')
    .where('ownerId', 5);
  let res = knex('groups').where(subQuery);
  console.log(res);
  res = await res;
  console.log(res);*/

  //let group = await Group.nameContains('math').first();
  //group.name = "asas";
  //console.log(group);

  //let groups = await Group.nameContains('math').get();
  //console.log(groups.toJSON());

  // let users2 = await User.select('username').get();

  let bbb = await User.withSelect('posts', ['id', 'text'], (q) => {
    q.whereNotLike('title', 'a%');
    q.withSelect('comments', 'text');
  }).get();

  console.log(bbb);

  let users2 = await User.select('username').get();
  console.log(users2);

  let gq = Group.collection();
  let groups = await gq.get();

  console.log(groups);

  let users = await User.with('mgroups').get(); //.with('mgroups').get({withRelated: ['groups']});
  users = users.toJSON();
  console.log(users);
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
