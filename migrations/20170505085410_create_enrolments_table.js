'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('enrolments', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('idAttr').unsigned().primary();
    table.dateTime('approvedAt').nullable().index();
    table.integer('userId').unsigned().notNullable().references('users.userIdAttr').onUpdate('CASCADE').onDelete('CASCADE');
    table.integer('groupId').unsigned().notNullable().references('groups.idAttr').onUpdate('CASCADE').onDelete('CASCADE');

    // Timestamps.
    table.dateTime('createdAt').notNullable().defaultTo(knex.fn.now()).index();
    table.dateTime('updatedAt').notNullable().defaultTo(knex.fn.now());

    table.unique(['userId', 'groupId']);
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('enrolments');
};
