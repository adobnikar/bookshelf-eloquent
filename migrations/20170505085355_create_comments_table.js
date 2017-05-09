'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('comments', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('id').unsigned().primary();
    table.text('text').notNullable();
    table.integer('postId').unsigned().notNullable().references('posts.id').onUpdate('CASCADE').onDelete('CASCADE');
    table.integer('createdById').unsigned().nullable().references('users.id').onUpdate('CASCADE').onDelete('RESTRICT');

    // Soft delete.
    table.dateTime('deletedAt').nullable().index();

    // Timestamps.
    table.dateTime('createdAt').notNullable().defaultTo(knex.fn.now()).index();
    table.dateTime('updatedAt').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('comments');
};
