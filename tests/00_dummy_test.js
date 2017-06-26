'use strict';

const assert = require('assert');

exports.setUp = async function() {
  // Prepare the data for the test. This is an optional function.
  // ...
};

exports.test = async function() {
  // Run the test. This function is required.
  // ...

};

exports.tearDown = async function() {
  // Clean everything after test. This is an optional function.
  // ...
};

// Test only this file.
/* (async() => {
  await exports.setUp();
  await exports.test();
  await exports.tearDown();
})().catch((error) => {
  console.error(error);
}); */
