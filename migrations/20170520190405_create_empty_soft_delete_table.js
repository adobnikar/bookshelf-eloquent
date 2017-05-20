'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('empty_soft_delete', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('id').unsigned().primary();
    table.string('name', 64).notNullable().unique();
    table.integer('number').notNullable().defaultTo(0);

    // Soft delete.
    table.dateTime('deletedAt').nullable().index();

    // Timestamps.
    table.dateTime('createdAt').notNullable().defaultTo(knex.fn.now()).index();
    table.dateTime('updatedAt').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('empty_soft_delete');
};
