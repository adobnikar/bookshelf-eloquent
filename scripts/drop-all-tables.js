'use strict';

const chalk = require('chalk');
const moment = require('moment');

const isString = require('lodash/isString');

// Logging functions.
const log = console.log;
const logSuccess = function(text) {
  console.log(chalk.green(text));
};
const logError = function(text) {
  console.error(chalk.red(text));
};
const logWarn = function(text) {
  console.warn(chalk.yellow(text));
};

const connection = require('../knexfile');
const Knex = require('knex')(connection);

async function asyncWrapper() {
  // Get the database name.
  let dbName = Knex.client.config.connection.database;
  if (!isString(dbName) || (dbName.length <= 0))
    throw new Error('Database name not set in the "knexfile.js".');

  // Get tables.
  let tables = (await Knex.raw(
    'SELECT * FROM information_schema.TABLES WHERE ??=?',
    ['TABLE_SCHEMA', dbName]))[0];

  let tablesMap = new Map();
  tables = tables.map((t) => {
    let name = t.TABLE_NAME;
    let table = {
      name: name,
      time: moment.utc(t.CREATE_TIME),
    };
    tablesMap.set(name, table);
    return table;
  });

  function compare(a, b) {
    if (a.time.isAfter(b.time)) return -1;
    if (b.time.isAfter(a.time)) return 1;
    return 0;
  }

  let lastSize = 0;
  while (tablesMap.size != lastSize) {
    lastSize = tablesMap.size;
    for (let table of tables) {
      try {
        await Knex.schema.dropTable(table.name);
        tablesMap.delete(table.name);
        logSuccess('Table ' + table.name + ' dropped.');
      } catch (error) { }
    }
    tables = tables.filter((t) => { return tablesMap.has(t.name); });
  }

  if (tablesMap.size > 0) {
    throw new Error('Tables ' +
      Array.from(tablesMap.keys()).join(', ') +
      ' could not be dropped.');
  }
}

asyncWrapper().then((error) => {
  logSuccess('Done.');
  process.exit(0);
}).catch((error) => {
  logError(error.message);
  logError('Exit.');
  process.exit(1);
});
