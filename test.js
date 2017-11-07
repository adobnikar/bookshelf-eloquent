'use strict';

const fs = require('fs');
const path = require('path');
const scriptName = path.basename(__filename);

// Load .env configuration.
require(path.resolve(__dirname, './config/load-dotenv'));
const testsFolder = path.resolve(__dirname, './tests');

(async () => {
  // Get list of all test scripts. Skip the files ending with "_ignore.js".
  let testFileNames = fs.readdirSync(testsFolder)
    .filter(file => !file.endsWith('_ignore.js') && file.endsWith('.js') &&
    (file !== scriptName) && fs.statSync(path.join(testsFolder, file)).isFile());

  for (let testFileName of testFileNames) {
    let testName = testFileName.substr(0, testFileName.length - 3);

    // Require the seed file and run it.
    let test = require(path.join(testsFolder, testFileName));

    // Check if the test function is exported.
    if (typeof test.test !== 'function') {
      console.error('Test function not exported in file "' +
        testFileName + '".');
      process.exit(1);
    }

    let stage = 'SETUP';
    try {
      let errInner = null;
      try {
        // Test setup.
        if (typeof test.setUp === 'function') {
          let result = test.setUp();
          let isPromise = (typeof result.then === 'function');
          if (isPromise) await result;
        }

        // Call the test function.
        stage = 'TEST';
        let result = test.test();

        // Check if the result is a promise.
        // source: http://stackoverflow.com/questions/27746304/how-do-i-tell-if-an-object-is-a-promise
        let isPromise = typeof result.then == 'function';

        // If the result is a promise then await it.
        if (isPromise) await result;
      } catch (err) {
        errInner = err;
      }

      // Tear down.
      if (errInner == null) stage = 'TEARDOWN';
      if (typeof test.tearDown === 'function') {
        let result = test.tearDown();
        let isPromise = (typeof result.then === 'function');
        if (isPromise) await result;
      }
      if (errInner != null) throw errInner;
    } catch (err) {
      console.error('[FAILED on ' + stage + '] ' + testName);
      console.error(err);
      process.exit(1);
    }

    // Print success message.
    console.log('[OK] ' + testName);
  }

  process.exit();
})();
