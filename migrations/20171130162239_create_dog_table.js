'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('dog', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('idAttr').unsigned().primary();
    table.integer('person_id').unsigned().notNullable().references('person.idAttr').onUpdate('CASCADE').onDelete('RESTRICT');

    // Soft delete.
    table.dateTime('deletedAt').nullable().index();

    // Timestamps.
    table.dateTime('createdAt').notNullable().defaultTo(knex.fn.now()).index();
    table.dateTime('updatedAt').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('dog');
};
