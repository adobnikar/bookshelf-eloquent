'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('groups', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('idAttr').unsigned().primary();
    table.string('name').nullable().unique();
    table.text('description').nullable();
    table.text('coverUrl').nullable();
    table.integer('ownerId').unsigned().notNullable().references('users.userIdAttr').onUpdate('CASCADE').onDelete('RESTRICT');

    // Soft delete.
    table.dateTime('deletedAt').nullable().index();
    table.string('deletedName').nullable();

    // Timestamps.
    table.dateTime('createdAt').notNullable().defaultTo(knex.fn.now()).index();
    table.dateTime('updatedAt').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('groups');
};
