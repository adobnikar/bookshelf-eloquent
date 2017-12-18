'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('tags', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('id').unsigned().primary();
    table.string('name', 64).notNullable().unique();
    table.boolean('isTag').notNullable().index().defaultTo(true);
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('tags');
};
