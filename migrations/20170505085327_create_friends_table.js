'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('friends', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('idAttr').unsigned().primary();
    table.integer('user1Id').unsigned().notNullable().references('users.idAttr').onUpdate('CASCADE').onDelete('CASCADE');
    table.integer('user2Id').unsigned().notNullable().references('users.idAttr').onUpdate('CASCADE').onDelete('CASCADE');

    // Timestamps.
    table.dateTime('createdAt').notNullable().defaultTo(knex.fn.now()).index();
    table.dateTime('updatedAt').notNullable().defaultTo(knex.fn.now());

    table.unique(['user1Id', 'user2Id']);
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('friends');
};
