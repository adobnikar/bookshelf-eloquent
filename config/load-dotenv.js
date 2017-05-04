'use strict';

const fs = require('fs');
const path = require('path');

// Load .env configuration.
require('dotenv').load({path: path.resolve(__dirname, './.env')});

// Set the default values of env variables.
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Exported functions.
 * @type {Object}
 */
module.exports = {};
