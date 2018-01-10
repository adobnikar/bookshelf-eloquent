'use strict';

const fs = require('fs');
const path = require('path');

// Load .env configuration.
require('dotenv').load({path: path.resolve(__dirname, './.env')});

module.exports = {
  client: 'mysql',
  connection: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'schema',
    charset: 'utf8',
    timezone: 'UTC',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: path.resolve(__dirname, './migrations'),
    tableName: 'migrations',
  },
  debug: process.env.KNEX_DEBUG === 'true',
};
