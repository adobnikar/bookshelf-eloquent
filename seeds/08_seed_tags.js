'use strict';

const Tag = require('../models/tag');

exports.seed = async function(knex, Promise) {
  let data = [
    {name: 'red'},
    {name: 'blue'},
    {name: 'green'},
    {name: 'yellow'},
    {name: 'pink'},
    {name: 'purple'},
    {name: 'orange'},
    {name: 'brown'},
    {name: 'black'},
    {name: 'white'},
    {name: 'azure'},
  ];

  let tagCollection = Tag.collection();
  tagCollection.add(data);
  tagCollection.insert();
};
