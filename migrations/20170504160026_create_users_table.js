'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('users', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    // User data.
    table.increments('idAttr').unsigned().primary();
    table.string('firstName', 64).notNullable();
    table.string('lastName', 64).notNullable();
    table.string('studentId', 64).nullable().index();

    // Login credentials.
    table.string('username').nullable().unique();
    table.string('email').nullable().unique();
    table.string('password', 128).nullable();

    // Email verification.
    table.dateTime('emailVerifiedAt').nullable().index();

    // JWT password reset counter.
    table.integer('jwtPasswordResetCounter').unsigned().notNullable().defaultTo(0);

    // Pictures.
    table.text('coverUrl').nullable();
    table.text('profilePictureUrl').nullable();

    // Soft delete.
    table.dateTime('deletedAt').nullable().index();
    table.string('deletedUsername').nullable();
    table.string('deletedEmail').nullable();

    // Timestamps.
    table.dateTime('createdAt').notNullable().defaultTo(knex.fn.now()).index();
    table.dateTime('updatedAt').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('users');
};
