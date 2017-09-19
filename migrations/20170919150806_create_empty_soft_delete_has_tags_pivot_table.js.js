'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('empty_soft_delete_has_tags', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.integer('emptyId').unsigned().notNullable().references('empty_soft_delete.id').onUpdate('CASCADE').onDelete('CASCADE');
    table.integer('tagId').unsigned().notNullable().references('empty_tags.id').onUpdate('CASCADE').onDelete('CASCADE');
    table.primary(['emptyId', 'tagId']);
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('empty_soft_delete_has_tags');
};
