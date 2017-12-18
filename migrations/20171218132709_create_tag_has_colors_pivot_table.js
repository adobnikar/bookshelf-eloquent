'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('tag_has_colors', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.string('colorHex').notNullable().index();
    table.string('tagName').notNullable().index();
    table.primary(['colorHex', 'tagName']);
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('tag_has_colors');
};
