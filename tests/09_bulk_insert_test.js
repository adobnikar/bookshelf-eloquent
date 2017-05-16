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

  // Clear the empty table.
  await Empty.where('id', '>', 0).delete();

  // Readme examples
  let userCollection = Empty.collection();
  let user1 = userCollection.add({name: 'Geovanny Waelchi Jr.', number: 81});
  let user2 = userCollection.add({name: 'Christ Green', number: 35});
  let user3 = userCollection.add({name: 'Timmy Windler', number: 2});

  await userCollection.insert();

  // Check if id was set.
  assert(user3.toJSON().id);

  userCollection = Empty.collection();
  user1 = userCollection.add({name: 'Christ Green', number: 89});
  user2 = userCollection.add({name: 'Nellie Ortiz', number: 13});

  userCollection.add([
      {name: 'Francisca Altenwerth DDS', number: 33},
      {name: 'Lamont Brekke I', number: 55},
      {name: 'Georgiana Frami', number: 36},
  ]);

  await userCollection.insert(true);

  let users = await Empty.select(['id', 'name', 'number']).get();

  // Clear the empty table.
  await Empty.where('id', '>', 0).delete();

  // Create a Bookshelf collection.
  userCollection = Empty.collection();

  // Add the users to the collection.
  user1 = userCollection.addMemo({name: 'Geovanny Waelchi Jr.'});
  let user2a = userCollection.addMemo({name: 'Christ Green'});
  let user2b = userCollection.addMemo({name: 'Christ Green'});
  user3 = userCollection.addMemo({name: 'Timmy Windler'});

  // Add another user with additional data.
  // We have to set the 'unique' options setting to our unique key: ['name'].
  let user4a = userCollection.addMemo({name: 'Francisca Altenwerth DDS', number: 33}, {unique: ['name']});
  let user4b = userCollection.addMemo({name: 'Francisca Altenwerth DDS', number: 44}, {unique: ['name']});

  // Add some more duplicate users as an array.
  userCollection.addMemo([
      {name: 'Francisca Altenwerth DDS', number: 55},
      {name: 'Christ Green', number: 55},
      {name: 'Timmy Windler'},
  ], {unique: ['name']});

  // Print the whole collection.
  assert.deepStrictEqual(userCollection.toJSON(), [
    {name: 'Geovanny Waelchi Jr.'},
    {name: 'Christ Green'},
    {name: 'Timmy Windler'},
    {name: 'Francisca Altenwerth DDS', number: 33},
  ]);

  assert(user2a === user2b);
  assert(user4a === user4b);

  // Clear the empty table.
  await Empty.where('id', '>', 0).delete();

  // Create a Bookshelf collection.
  userCollection = Empty.collection();

  // Add the users to the collection. First we want to fill the database with some pre-existing users.
  user1 = userCollection.add({name: 'Geovanny Waelchi Jr.', number: 81});
  user2 = userCollection.add({name: 'Christ Green', number: 35});

  // Run the normal bulk insert sql statement.
  await userCollection.insert();

  userCollection = Empty.collection();
  user1 = userCollection.add({name: 'Geovanny Waelchi Jr.', number: 5});
  user2 = userCollection.add({name: 'Christ Green'});
  user3 = userCollection.add({name: 'Timmy Windler', number: 2});

  // Run the insertBy bulk insert sql statement.
  await userCollection.insertBy(['name'], ['number']);

  // Print all users.
  console.log(userCollection.toJSON());

  /*data = [
    {name: 'Geovanny Waelchi Jr.', number: 81},
    {name: 'Christ Green', number: 35},
    {name: 'Timmy Windler', number: 2},
    {name: 'Dr. Janie Mayert', number: 81},
    {name: 'Francisca Altenwerth DDS', number: 33},
    {name: 'Lamont Brekke I', number: 55},
    {name: 'Georgiana Frami', number: 36},
    {name: 'Nellie Ortiz', number: 90},
    {name: 'Russ Volkman', number: 52},
    {name: 'Arnulfo Moore', number: 77},
  ];*/
};

exports.tearDown = async function() {
  // Clean everything after test. This is an optional function.
  // Clear the empty table.
  await Empty.where('id', '>', 0).delete();
};
