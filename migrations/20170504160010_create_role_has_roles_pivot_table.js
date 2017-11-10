'use strict';

exports.up = async function(knex, Promise) {
  await knex.schema.createTable('role_has_roles', function(table) {
    table.charset('utf8');
    table.collate('utf8_unicode_ci');

    table.integer('fromRoleId').unsigned().notNullable().references('roles.idAttr').onUpdate('CASCADE').onDelete('CASCADE');
    table.integer('toRoleId').unsigned().notNullable().references('roles.idAttr').onUpdate('CASCADE').onDelete('CASCADE');
    table.primary(['fromRoleId', 'toRoleId']);
  });
};

exports.down = async function(knex, Promise) {
  await knex.schema.dropTable('role_has_roles');
};
