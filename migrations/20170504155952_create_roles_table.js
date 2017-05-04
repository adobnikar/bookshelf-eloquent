'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('roles', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('id').unsigned().primary();
    table.string('name', 64).notNullable().unique();
    table.string('displayName', 64).notNullable();
    table.text('description').nullable();
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('roles');
};
