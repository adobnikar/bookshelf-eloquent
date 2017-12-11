'use strict';

const Group = require('../models/group');
const User = require('../models/user');

let groupCollection = null;

async function createGroup(name, ownerId) {
  // Create group.
  let group = groupCollection.add({
    name: name,
    description: name + ' description.',
    coverUrl: 'img/defaut-group-cover-photo.jpg',
    ownerId: ownerId,
  });
  return group;
}

exports.seed = async function(knex, Promise) {
  // Init.
  groupCollection = Group.collection();

  // Get the super admin.
  let superAdmin = (await User.select(['userIdAttr'])
    .where('username', 'admin.super').first()).toJSON();

  // Create groups.
  let groupBiology = await createGroup('Biology', superAdmin.userIdAttr);
  let groupMathematics = await createGroup('Mathematics', superAdmin.userIdAttr);
  let groupPhysics = await createGroup('Physics', superAdmin.userIdAttr);
  let groupFirst = await createGroup('First', superAdmin.userIdAttr);
  let groupSecond = await createGroup('Second', superAdmin.userIdAttr);

  await groupCollection.insert();
};
