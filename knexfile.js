'use strict';

const path = require('path');

// Load .env configuration.
require(path.resolve(__dirname, './config/load-dotenv'));

module.exports = {
  client: 'mysql',
  connection: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'bookshelf_eloquent',
    charset: 'utf8',
    timezone: '+01:00',
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
