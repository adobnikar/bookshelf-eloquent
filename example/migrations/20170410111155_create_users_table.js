'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('users', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    // User data.
    table.increments('id').unsigned().primary();
    table.string('firstName', 64).notNullable();
    table.string('lastName', 64).notNullable();
    table.boolean('allowUseOfMyContactInformation').notNullable().defaultTo(true);

    // Login credentials.
    table.string('username').nullable().index();
    table.string('email').nullable().index();
    table.string('password', 128).nullable();

    // Email verification.
    table.dateTime('emailVerifiedAt').nullable().index();

    // Pictures.
    table.text('coverUrl').nullable();
    table.text('profilePictureUrl').nullable();

    // Soft delete.
    table.dateTime('deletedAt').nullable().index();

    // Timestamps.
    table.dateTime('createdAt').notNullable().defaultTo(knex.fn.now()).index();
    table.dateTime('updatedAt').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('users');
};
