'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('ratings', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('idAttr').unsigned().primary();
    table.integer('value').unsigned().notNullable().defaultTo(0);
    table.text('comment').nullable();
    table.integer('userId').unsigned().notNullable().references('users.userIdAttr').onUpdate('CASCADE').onDelete('CASCADE');
    table.integer('postId').unsigned().notNullable().references('posts.postIdAttr').onUpdate('CASCADE').onDelete('CASCADE');

    // Timestamps.
    table.dateTime('createdAt').notNullable().defaultTo(knex.fn.now()).index();
    table.dateTime('updatedAt').notNullable().defaultTo(knex.fn.now());

    table.unique(['userId', 'postId']);
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('ratings');
};
