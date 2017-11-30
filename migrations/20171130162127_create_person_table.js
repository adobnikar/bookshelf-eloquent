'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('person', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    // User data.
    table.increments('idAttr').unsigned().primary();

    // Soft delete.
    table.dateTime('deletedAt').nullable().index();

    // Timestamps.
    table.dateTime('createdAt').notNullable().defaultTo(knex.fn.now()).index();
    table.dateTime('updatedAt').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('person');
};
