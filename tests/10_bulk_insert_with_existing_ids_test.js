'use strict';

const assert = require('assert');
require('../libs/seedrandom-ext');
const faker = require('faker');

const sortBy = require('lodash/sortBy');

const Empty = require('../models/empty');

exports.setUp = async function() {
  // Prepare the data for the test. This is an optional function.
  // Clear the empty table.
  await Empty.deleteAll();
};

exports.test = async function() {
  // Run the test. This function is required.

  // Insert users with existsing ids.
  let userCollection = Empty.collection();
  let user1 = userCollection.add({idAttr: 15340, name: 'Geovanny Waelchi Jr.', number: 81});
  let user2 = userCollection.add({name: 'Christ Green', number: 35});
  let user3 = userCollection.add({idAttr: 4646000, name: 'Timmy Windler', number: 2});
  let user4 = userCollection.add({name: 'Christ Green 2', number: 89});
  let user5 = userCollection.add({idAttr: 111, name: 'aaa', number: 222});
  let user6 = userCollection.add({name: 'bbb', number: 8989});

  // Check isNew.
  for (let i = 0; i < userCollection.models.length; i++) {
    let model = userCollection.models[i];
    assert.equal(model.isNew(), (i % 2) === 1);
  }

  await userCollection.insert();

  // Check isNew.
  for (let i = 0; i < userCollection.models.length; i++) {
    let model = userCollection.models[i];
    assert(!model.isNew());
  }

  let data = userCollection.toJSON();
  data = sortBy(data, 'idAttr');

  let data2 = (await Empty.select(['idAttr', 'name', 'number'])
    .orderBy('idAttr').get()).toJSON();

  assert.deepStrictEqual(data, data2);

  // Clear the empty table.
  await Empty.deleteAll();

  // InsertBy users with existsing idAttrs.
  userCollection = Empty.collection();
  user1 = userCollection.add({idAttr: 15340, name: 'Geovanny Waelchi Jr.', number: 81});
  user2 = userCollection.add({name: 'Christ Green', number: 35});
  user3 = userCollection.add({idAttr: 4646000, name: 'Timmy Windler', number: 2});
  user4 = userCollection.add({name: 'Christ Green 2', number: 89});
  user5 = userCollection.add({idAttr: 111, name: 'aaa', number: 222});
  user6 = userCollection.add({name: 'bbb', number: 8989});

  // Check isNew.
  for (let i = 0; i < userCollection.models.length; i++) {
    let model = userCollection.models[i];
    assert.equal(model.isNew(), (i % 2) === 1);
  }

  await userCollection.insertBy(['name'], ['idAttr', 'number']);

  // Check isNew.
  for (let i = 0; i < userCollection.models.length; i++) {
    let model = userCollection.models[i];
    assert(!model.isNew());
  }

  data = userCollection.toJSON();
  data = sortBy(data, 'idAttr');

  data2 = (await Empty.select(['idAttr', 'name', 'number'])
    .orderBy('idAttr').get()).toJSON();

  assert.deepStrictEqual(data, data2);
};

exports.tearDown = async function() {
  // Clean everything after test. This is an optional function.
  // Clear the empty table.
  await Empty.deleteAll();
};
