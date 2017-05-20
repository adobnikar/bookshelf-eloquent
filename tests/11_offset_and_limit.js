'use strict';

const assert = require('assert');
require('../libs/seedrandom-ext');
const faker = require('faker');

const Empty = require('../models/empty');

exports.setUp = async function() {
  // Prepare the data for the test. This is an optional function.
  // Clear the empty table.
  await Empty.deleteAll();
};

exports.test = async function() {
  // Run the test. This function is required.
  // Seeded random number generator. Random but always the same.
  let rng = new Math.seedrandom('dDxxsB7EkFj44SHUhadTIublDZZWCqNJo2mwabwb');
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

  // Do a few skip take selects.
  for (let i = 0; i < 2; i++) {
    let limit = rng.int(500) + 1;
    let offset = rng.int(limit);
    let subdata = data.slice(offset, limit);
    limit = limit - offset;
    let data2 = (await Empty.select(['name', 'number'])
      .offset(offset).limit(limit).get()).toJSON();

    assert.deepStrictEqual(data2, subdata);
  }

  // Do a few skip take selects.
  for (let i = 0; i < 2; i++) {
    let limit = rng.int(500) + 1;
    let offset = rng.int(limit);
    let subdata = data.slice(offset, limit);
    limit = limit - offset;
    let data2 = (await Empty.select(['name', 'number'])
      .skip(offset).take(limit).get()).toJSON();

    assert.deepStrictEqual(data2, subdata);
  }

  // Do a few skip take selects.
  for (let i = 0; i < 2; i++) {
    let limit = rng.int(500) + 1;
    let offset = rng.int(limit);
    let subdata = data.slice(offset, limit);
    limit = limit - offset;
    let data2 = (await Empty.offset(offset).select(['name', 'number'])
      .limit(limit).get()).toJSON();

    assert.deepStrictEqual(data2, subdata);
  }

  // Do a few skip take selects.
  for (let i = 0; i < 2; i++) {
    let limit = rng.int(500) + 1;
    let offset = rng.int(limit);
    let subdata = data.slice(offset, limit);
    limit = limit - offset;
    let data2 = (await Empty.take(limit).select(['name', 'number'])
      .skip(offset).get()).toJSON();

    assert.deepStrictEqual(data2, subdata);
  }

  assert.equal((await Empty.select(['name', 'number']).orderBy('createdAt')
      .offset(20).limit(10).buildQuery()).query.toString(),
      'select `name`, `number` from `empty` order by ' +
      '`empty`.`createdAt` ASC limit 10 offset 20');
};

exports.tearDown = async function() {
  // Clean everything after test. This is an optional function.
  // Clear the empty table.
  await Empty.deleteAll();
};
