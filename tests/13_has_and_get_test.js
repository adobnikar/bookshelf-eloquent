'use strict';

const assert = require('assert');
const Group = require('../models/group');

exports.test = async function() {
  // Run the test. This function is required.
  // Check if bookshelf functions get and has still function properly.

  let groups = await Group.orderBy("name").get();
  for (let group of groups.models) {
    assert(group.has("name"));
    assert(group.has("description"));
    assert(group.has("idAttr"));
    assert(group.has("ownerId"));

    let gname = group.get("name");
    let gdesc = group.get("description");
    assert.equal(gdesc, gname + " description.");
  }
};
