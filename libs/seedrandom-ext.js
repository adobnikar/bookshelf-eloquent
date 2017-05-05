'use strict';

const seedrandom = require('seedrandom');

// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random

Math.seedrandomOriginal = Math.seedrandom;

Math.seedrandom = function(...args) {
  if (this instanceof Math.seedrandom) {
    // This function was called with the "new" keyword.
    let rng = new Math.seedrandomOriginal(...args);

    rng.originalDouble = rng.double;

    rng.double = function(min, max) {
      if (typeof max === 'undefined') {
        max = min;
        min = 0;
      }

      return Math.floor(rng.originalDouble() * (max - min)) + min;
    };

    rng.int = function(min, max) {
      if (typeof max === 'undefined') {
        max = min;
        min = 0;
      }

      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(rng.originalDouble() * (max - min)) + min;
    };

    rng.intInclusive = function(min, max) {
      if (typeof max === 'undefined') {
        max = min;
        min = 0;
      }

      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(rng.originalDouble() * (max - min + 1)) + min;
    };

    return rng;
  } else {
    return Math.seedrandomOriginal(...args);
  }
};

/**
 * Exported functions.
 * @type {Object}
 */
module.exports = seedrandom;
