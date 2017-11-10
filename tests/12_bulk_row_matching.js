'use strict';

const assert = require('assert');
const Empty = require('../models/empty');

exports.setUp = async function() {
  // Prepare the data for the test. This is an optional function.
  // Clear the empty table.
  await Empty.deleteAll();
};

function serializeDate(value) {
  if (value == null) return null;
  value = new Date(value);

  // Round to nearest second.
  let ms = value.getMilliseconds();
  if (ms >= 500) {
    value = new Date(value.getTime() + 1000);
  }

  // Truncate to second.
  value.setMilliseconds(0);

  return value;
}

exports.test = async function() {
  // Run the test. This function is required.
  let collection = Empty.collection();

  let dt = new Date();
  dt.setMilliseconds(0);
  let m1 = collection.add({
    name: 1,
    integer: 15,
    bigInteger: 123,
    text: 45646464,
    string: 485,
    float: "123.45450000000",
    decimal: "12345.45450000000",
    boolean: true,
    date: dt,
    dateTime: dt,
    time: dt,
    timestamp: dt,
  });

  let m2 = collection.add({
    name: 2,
    integer: "154",
    bigInteger: "1293",
    text: " as as a a ",
    string: " as as as as   ",
    float: 123.45450000000,
    decimal: 12345.45450000000,
    boolean: 1,
    date: "2017-06-03",
    dateTime: "2017-06-03",
    time: "2017",
    timestamp: "2017-06-03",
  });

  let m3 = collection.add({
    name: 3,
    integer: "154",
    bigInteger: "1293",
    text: " as as a a ",
    string: " as as as as   ",
    float: 123.45450000000,
    decimal: 12345.45450000000,
    boolean: 1,
    date: "2017-06-03 11:05:01",
    dateTime: "2017-06-03 11:05:01",
    time: "2017-06-03 11:05:01",
    timestamp: "2017-06-03 11:05:01",
  });

  await collection.insertBy([
    "integer",
    "bigInteger",
    "text",
    "string",
    //"float",
    //"decimal",
    "boolean",
    //"date",
    "dateTime",
    //"time",
    "timestamp",
  ]);

  // Check if models got their ids.
  m1 = m1.toJSON();
  assert(m1.idAttr != null);
  m2 = m2.toJSON();
  assert(m2.idAttr != null);
  m3 = m3.toJSON();
  assert(m3.idAttr != null);

  // Clear the empty table.
  await Empty.deleteAll();

  // Test dateTime rounding.
  dt = new Date();
  collection = Empty.collection();
  for (let i = 0; i < 1000; i++) {
    dt = new Date(dt.getTime() + 1);

    let model = collection.add({
      name: i,
      integer: i,
      dateTime: dt,
      timestamp: dt,
      //date: dt,
      //time: dt,
    });
  }

  await collection.insert(true);

  // Round dates to nearest second.
  for (let model of collection.models) {
    model.set("dateTime", serializeDate(model.get("dateTime")));
    model.set("timestamp", serializeDate(model.get("timestamp")));
  }

  await collection.insertBy([
    "integer",
    "dateTime",
    "timestamp",
    //"date",
    //"time",
  ]);

  // Check if all models got resolved.
  for (let model of collection.models) {
    assert(!model.isNew());
  }
};

exports.tearDown = async function() {
  // Clean everything after test. This is an optional function.
  // Clear the empty table.
  await Empty.deleteAll();
};
