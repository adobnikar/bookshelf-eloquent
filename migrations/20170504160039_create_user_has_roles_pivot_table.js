'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('user_has_roles', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.integer('userId').unsigned().notNullable().references('users.userIdAttr').onUpdate('CASCADE').onDelete('CASCADE');
    table.integer('roleId').unsigned().notNullable().references('roles.idAttr').onUpdate('CASCADE').onDelete('CASCADE');
    table.primary(['userId', 'roleId']);
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('user_has_roles');
};
