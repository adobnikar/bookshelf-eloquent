'use strict';

const Tag = require('../models/tag');
const Color = require('../models/color');

const pick = require('lodash/pick');

exports.seed = async function(knex, Promise) {
  let data = [
    {name: 'red', hex: '#ff0000'},
    {name: 'blue', hex: '#0000ff'},
    {name: 'green', hex: '#008000'},
    {name: 'yellow', hex: '#ffff00'},
    {name: 'pink', hex: '#ffc0cb'},
    {name: 'purple', hex: '#800080'},
    {name: 'orange', hex: '#ffa500'},
    {name: 'brown', hex: '#a52a2a'},
    {name: 'black', hex: '#000000'},
    {name: 'white', hex: '#ffffff'},
    {name: 'azure', hex: '#f0ffff'},
  ];

  let tagCollection = Tag.collection();
  let colorCollection = Color.collection();
  colorCollection.add(data.map(d => {
    return {
      cname: d.name,
      hex: d.hex,
    }
  }));
  tagCollection.add(data.map(d => {
    return {
      name: d.name,
    }
  }));
  await tagCollection.insert();
  await colorCollection.insert();

  await knex("tag_has_colors").insert(data.map((d) => {
    return {
      tagName: d.name,
      colorHex: d.hex,
    };
  }));
};
