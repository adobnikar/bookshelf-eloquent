'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('groups', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('id').unsigned().primary();
    table.string('name').notNullable().index();
    table.text('description').nullable();
    table.text('coverUrl').nullable();
    table.integer('ownerId').unsigned().notNullable().references('users.id').onUpdate('CASCADE').onDelete('RESTRICT');
    table.boolean('isPublic').notNullable().defaultTo(true);

    // Soft delete.
    table.dateTime('deletedAt').nullable().index();

    // Timestamps.
    table.dateTime('createdAt').notNullable().defaultTo(knex.fn.now()).index();
    table.dateTime('updatedAt').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('groups');
};
