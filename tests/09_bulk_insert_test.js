'use strict';

const assert = require('assert');
require('../libs/seedrandom-ext');
const faker = require('faker');

const Empty = require('../models/empty');

exports.setUp = async function() {
  // Prepare the data for the test. This is an optional function.
  // Clear the empty table.
  await Empty.where('id', '>', 0).delete();
};

exports.test = async function() {
  // Run the test. This function is required.
  // Seeded random number generator. Random but always the same.
  let rng = new Math.seedrandom('Ox9fPU4IoVOahI8xQ2i4G9B0nXpgOQMuqFzDh6HU');
  // Seed faker.
  faker.seed(rng.int(1000000));

  let data = [];
  for (let i = 0; i < 500; i++)
    data.push({
      name: faker.name.findName(),
      number: rng.int(1000000)}
    );

  let emptyCollection = Empty.collection();
  for (let d of data)
    emptyCollection.add(d);

  // Insert into the database.
  await emptyCollection.insert();

  let data2 = (await Empty.select(['name', 'number']).get()).toJSON();

  assert.deepStrictEqual(data2, data);

  // Clear the empty table.
  await Empty.where('id', '>', 0).delete();

  // Test with duplicate entries.
  data = [];
  for (let i = 0; i < 1000; i++)
    data.push({
      name: faker.name.findName(),
      number: rng.int(1000000)}
    );

  emptyCollection = Empty.collection();
  for (let d of data)
    emptyCollection.addMemo(d, {unique: ['name']});
  let data3 = emptyCollection.toJSON();

  // Insert into the database.
  await emptyCollection.insert();

  data2 = (await Empty.select(['name', 'number']).get()).toJSON();

  assert.deepStrictEqual(data2, data3);

  // Test ingore duplicates on insert.
  emptyCollection = Empty.collection();
  for (let d of data)
    emptyCollection.add(d);

  // Insert into the database.
  await emptyCollection.insert(true);

  data2 = (await Empty.select(['name', 'number']).get()).toJSON();

  assert.deepStrictEqual(data2, data3);

  // Insert By test
  data2 = (await Empty.select(['name', 'number', 'id']).get()).toJSON();

  emptyCollection = Empty.collection();
  for (let d of data)
    emptyCollection.addMemo(d, {unique: ['name']});

  await emptyCollection.insertBy(['name'], ['id', 'number']);
  data3 = emptyCollection.toJSON();

  assert.deepStrictEqual(data3, data2);
};

exports.tearDown = async function() {
  // Clean everything after test. This is an optional function.
  // Clear the empty table.
  await Empty.where('id', '>', 0).delete();
};
