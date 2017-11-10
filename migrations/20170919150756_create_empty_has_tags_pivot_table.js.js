'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('empty_has_tags', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.integer('emptyId').unsigned().notNullable().references('empty.idAttr').onUpdate('CASCADE').onDelete('CASCADE');
    table.integer('tagId').unsigned().notNullable().references('empty_tags.idAttr').onUpdate('CASCADE').onDelete('CASCADE');
    table.primary(['emptyId', 'tagId']);
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('empty_has_tags');
};
