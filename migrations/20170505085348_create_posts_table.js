'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('posts', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('postIdAttr').unsigned().primary();
    table.string('title').notNullable().index();
    table.boolean('visible').notNullable().index().defaultTo(true);
    table.text('text').notNullable();
    table.integer('createdById').unsigned().notNullable().references('users.userIdAttr').onUpdate('CASCADE').onDelete('RESTRICT');

    // Soft delete.
    table.dateTime('deletedAt').nullable().index();

    // Timestamps.
    table.dateTime('createdAt').notNullable().defaultTo(knex.fn.now()).index();
    table.dateTime('updatedAt').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('posts');
};
