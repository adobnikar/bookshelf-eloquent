'use strict';

const assert = require('assert');
const Group = require('../models/group');
const User = require('../models/user');

exports.test = async function() {
  // Run the test. This function is required.
  let users = (await User.has('posts')
    .orWhereLike('firstName', '%Admin').get()).toJSON();
  let usersCmp = (await User.where((q) => {
    q.has('posts');
    q.orWhereLike('firstName', '%Admin');
  }).get()).toJSON();
  assert.deepStrictEqual(users, usersCmp);

  users = (await User.has('posts')
    .whereLike('firstName', '%Admin').get()).toJSON();
  usersCmp = (await User.where((q) => {
    q.has('posts');
    q.whereLike('firstName', '%Admin');
  }).get()).toJSON();
  assert.deepStrictEqual(users, usersCmp);

  users = (await User.has('posts').andWhereLike('firstName', 's%')
    .orWhereLike('firstName', '%Admin')
    .whereLike('firstName', 's%').get()).toJSON();
  usersCmp = (await User.whereLike('firstName', 's%')
    .where((q) => {
      q.has('posts');
      q.orWhereLike('firstName', '%Admin');
    }).get()).toJSON();
  assert.deepStrictEqual(users, usersCmp);

  users = (await User.has('posts')
    .orWhereLike('firstName', '%Admin').get()).toJSON();
  usersCmp = (await User.where((q) => {
    q.has('posts');
  }).orWhere((q) => {
    q.whereLike('firstName', '%Admin');
  }).get()).toJSON();
  assert.deepStrictEqual(users, usersCmp);

  users = (await User.has('posts')
    .whereLike('firstName', '%Admin').get()).toJSON();
  usersCmp = (await User.where((q) => {
    q.has('posts');
  }).andWhere((q) => {
    q.whereLike('firstName', '%Admin');
  }).get()).toJSON();
  assert.deepStrictEqual(users, usersCmp);

  // Issue example.
  /*let townId = 1;
  let id = 5;
  let Product_price = {};

  Product_price.where((query) => {
    query.whereHas('priceShop', (q) => {
      q.where('town_id', townId);
    }).orWhereHas('priceShopNet', (q) => {
      q.where('town_id', townId);
    }).orWhereHas('priceShopNet.shops', (q) => {
      q.where('town_id', townId);
    });
  }).with(['priceEdizm', 'priceShop', 'promotions_type', 'promotions'])
    .where('products_id', id)
    .get();

  */
};
