'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('tags', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('idAttr').unsigned().primary();
    table.string('name', 64).notNullable().unique();
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('tags');
};
