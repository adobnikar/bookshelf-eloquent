'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('empty', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.increments('idAttr').unsigned().primary();
    table.string('name', 64).notNullable().unique();
    table.integer('number').notNullable().defaultTo(0);

    // Different column types to test.
    table.integer('integer').nullable();
    table.bigInteger('bigInteger').nullable();
    table.text('text').nullable();
    table.string('string').nullable();
    table.float('float').nullable();
    table.decimal('decimal').nullable();
    table.boolean('boolean').nullable();
    table.date('date').nullable();
    table.dateTime('dateTime').nullable();
    table.time('time').nullable();
    table.timestamp('timestamp').nullable();

    table.binary('binary').nullable();
    table.enum('enum', ['val1', 'val2', 'val3', 4, 5]).nullable();
    table.json('json').nullable();

    // Timestamps.
    table.dateTime('createdAt').notNullable().defaultTo(knex.fn.now()).index();
    table.dateTime('updatedAt').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('empty');
};
