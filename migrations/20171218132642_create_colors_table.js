'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('colors', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('id').unsigned().primary();
    table.string('cname', 64).notNullable().unique();
    table.string('hex', 64).notNullable().unique();
    table.boolean('isColor').notNullable().index().defaultTo(true);
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('colors');
};
