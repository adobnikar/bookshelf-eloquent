'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('post_has_tags', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.integer('postId').unsigned().notNullable().references('posts.idAttr').onUpdate('CASCADE').onDelete('CASCADE');
    table.integer('tagId').unsigned().notNullable().references('tags.idAttr').onUpdate('CASCADE').onDelete('CASCADE');
    table.primary(['postId', 'tagId']);
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('post_has_tags');
};
