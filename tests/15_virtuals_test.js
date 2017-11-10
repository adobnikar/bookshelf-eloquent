'use strict';

const assert = require('assert');
const Group = require('../models/group');
const User = require('../models/user-virtuals');

exports.test = async function() {
  // Run the test. This function is required.
  // This test passes if no errors happen.
  let idAttr = 1;

  let group = await Group
    .where({idAttr: idAttr})
    .with(['user'])
    .first();

  let user = group.relations.user;

  let fullName = user.get('fullName');
  user.set('fullName', 'New Fullname');

  assert.equal(user.get('fullName'), fullName);
};
