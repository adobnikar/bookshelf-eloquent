'use strict';

const bcrypt = require('bcrypt');

const Role = require('../models/role');
const User = require('../models/user');

// Function that formats a number by padding it with preceding zeros.
function pad(num, size) {
  let s = num + '';
  while (s.length < size) s = '0' + s;
  return s;
}

// This function creates a user.
let studentIdCounter = 1;
async function createUser(firstName, lastName, username, password, studentId) {
  // Set the default values.
  if (password == null) password = '123456';
  if (typeof studentId == 'undefined') {
    studentId = '6316' + pad(studentIdCounter, 4);
    studentIdCounter++;
  }

  // Create the task to create a user.
  return {
    firstName: firstName,
    lastName: lastName,
    username: username,
    email: username + '@equiz.com',
    studentId: studentId,
    // TODO: change the built-in password !!!!!!!!!!
    password: await bcrypt.hash(password, 10),
    emailVerifiedAt: new Date(),
    // TODO: create the default cover photo and profile picture
    coverUrl: 'img/defaut-cover-photo.jpg',
    profilePictureUrl: 'img/defaut-profile-picture.jpg',
  };
}

exports.seed = async function(knex, Promise) {
  // Create roles.
  let roleCollection = Role.collection();
  let adminRole = roleCollection.forgeAdd({
    name: 'admin',
    displayName: 'Administrator',
    description: 'Built-in administrator role. This user has access to the admin panel.',
  });
  let studentRole = roleCollection.forgeAdd({
    name: 'student',
    displayName: 'Student',
    description: 'Student role. This user can join groups and solve exercises.',
  });
  let groupAdminRole = roleCollection.forgeAdd({
    name: 'admin.group',
    displayName: 'Group Administrator',
    description: 'Group admin role. This user can create a group and manage it.',
  });
  let deviceAdminRole = roleCollection.forgeAdd({
    name: 'admin.device',
    displayName: 'Device Administrator',
    description: 'Device admin role. This user can register new tablets and manage them.',
  });
  let userAdminRole = roleCollection.forgeAdd({
    name: 'admin.user',
    displayName: 'User Administrator',
    description: 'User admin role. This is the most powerful role. This user can create new users or admins and assign them roles.',
  });

  // Insert the roles to the database.
  await roleCollection.insert();

  // Connect the roles (Attach / Sync).
  // Delete any pre existing connections.
  await Promise.all([
    groupAdminRole.roles().detach(),
    deviceAdminRole.roles().detach(),
    userAdminRole.roles().detach(),
  ]);
  await Promise.all([
    groupAdminRole.roles().attach([adminRole.attributes.id]),
    deviceAdminRole.roles().attach([adminRole.attributes.id]),
    userAdminRole.roles().attach([adminRole.attributes.id]),
  ]);

  // Create users.
  let userCollection = User.collection();
  let adminUser = userCollection.forgeAdd(await createUser('Admin', 'User', 'admin', null, null));
  let groupAdminUser = userCollection.forgeAdd(await createUser('Group Admin', 'User', 'admin.group', null, null));
  let deviceAdminUser = userCollection.forgeAdd(await createUser('Device Admin', 'User', 'admin.device', null, null));
  let userAdminUser = userCollection.forgeAdd(await createUser('User Admin', 'User', 'admin.user', null, null));
  let superAdminUser = userCollection.forgeAdd(await createUser('Super Admin', 'User', 'admin.super', null, null));

  let studentUser = userCollection.forgeAdd(await createUser('Student', 'User', 'student'));
  let student2User = userCollection.forgeAdd(await createUser('Student 2', 'User', 'student.2'));
  let student3User = userCollection.forgeAdd(await createUser('Student 3', 'User', 'student.3'));
  let student4User = userCollection.forgeAdd(await createUser('Student 4', 'User', 'student.4'));

  // Insert the users to the database.
  await userCollection.insert();

  // Assign roles to users (Attach / Sync).
  // Delete any pre existing connections.
  let roleDetachTasks = [];
  for (let userModel of userCollection.models) {
    roleDetachTasks.push(userModel.roles().detach());
  }
  await Promise.all(roleDetachTasks);

  await Promise.all([
    adminUser.roles().attach([adminRole.attributes.id]),
    groupAdminUser.roles().attach([groupAdminRole.attributes.id]),
    deviceAdminUser.roles().attach([deviceAdminRole.attributes.id]),
    userAdminUser.roles().attach([userAdminRole.attributes.id]),
    superAdminUser.roles().attach([groupAdminRole.attributes.id, deviceAdminRole.attributes.id, userAdminRole.attributes.id]),
    studentUser.roles().attach([studentRole.attributes.id]),
    student2User.roles().attach([studentRole.attributes.id]),
    student3User.roles().attach([studentRole.attributes.id]),
    student4User.roles().attach([studentRole.attributes.id]),
  ]);
};
