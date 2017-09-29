const connection = require('../knexfile');
const knex = require('knex')(connection);

const assert = require('assert');
require('../libs/seedrandom-ext');
const faker = require('faker');

const Empty = require('../models/empty-soft-delete');

exports.setUp = async function() {
  // Prepare the data for the test. This is an optional function.
  // Clear the empty table.
  await Empty.deleteAll({ hardDelete: true });
};

function eqSet(as, bs) {
  if (as.size !== bs.size) return false;
  for (var a of as) if (!bs.has(a)) return false;
  return true;
}

exports.test = async function() {
  // Run the test. This function is required.
  // Seeded random number generator. Random but always the same.
  let rng = new Math.seedrandom('S76sgsOoekBXyKQtUohF97ouqFqTTv1xkxZrUOop');
  // Seed faker.
  faker.seed(rng.int(1000000));

  // Init state and generate a few unique names.
  let state = new Map();
  for (let i = 0; i < 1000; i++) {
    let name = faker.name.findName();
    state.set(name, null);
  }
  let names = Array.from(state.keys());
  let setNames = new Set();

  // Use the unique key "name" for replacing.
  for (let i = 0; i < 5; i++) {
    let collection = Empty.collection();

    // Generate a few rows.
    let rownames = new Set();
    for (let i = 0; i < 500; i++) rownames.add(names[rng.int(1000000) % names.length]);
    rownames = Array.from(rownames);
    collection.add(rownames.map(name => {
      let number = rng.int(1000000);
      state.set(name, number);
      setNames.add(name);
      return {
        name: name,
        number: number,
      };
    }));

    // Replace rows.
    await collection.replace();

    // Verify state.
    let rows = await Empty.select(['name', 'number']).get();
    rows = rows.toJSON();
    for (let row of rows) {
      assert.equal(row.number, state.get(row.name));
    }
    assert(eqSet(new Set(rows.map(r => r.name)), setNames));
  }
};

exports.tearDown = async function() {
  // Clean everything after test. This is an optional function.
  // Clear the empty table.
  await Empty.deleteAll({ hardDelete: true });
};
