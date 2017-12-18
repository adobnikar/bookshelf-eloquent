const connection = require('../knexfile');
const knex = require('knex')(connection);

const groupBy = require('lodash/groupBy');

const assert = require('assert');

const Comment = require('../models/comment');
const Post = require('../models/post');
const Tag = require('../models/tag');
const User = require('../models/user');
const Color = require('../models/color');

exports.test = async function() {
  let pqFilter = function(pq) {
    pq.whereNotLike('text', 'd%');
  };

  let rawPosts = await Post.where(pqFilter).get();
  rawPosts = rawPosts.toJSON();
  rawPosts = groupBy(rawPosts, 'createdById');

  let posts = await Post.where(pqFilter).withSelect('relatedPosts', 'postIdAttr', pqFilter).withCount('relatedPosts as rpCount', pqFilter).withCount('relatedPosts', pqFilter).get();
  posts = posts.toJSON();

  for (let post of posts) {
    let rawPostGroup = rawPosts[post.createdById].map(p => p.postIdAttr);
    let relatedPosts = post.relatedPosts.map(p => p.postIdAttr);
    assert.deepEqual(relatedPosts, rawPostGroup);
    assert.equal(post.rpCount, rawPostGroup.length)
    assert.equal(post.relatedPostsCount, rawPostGroup.length)
  }

  // Test the whereHas function.
  let resultsCount = 1;
  let minCount = 0;
  while (resultsCount > 0) {
    let whereHasPosts = await Post.where(pqFilter).select('postIdAttr').whereHas('relatedPosts', pqFilter, '>=', minCount).get();
    whereHasPosts = whereHasPosts.toJSON().map(p => p.postIdAttr);
    let rawPosts = posts.filter(p => p.relatedPosts.length >= minCount).map(p => p.postIdAttr);
    assert.deepEqual(whereHasPosts, rawPosts);
    resultsCount = rawPosts.length;
    minCount++;
  }

  // Tags with colors.
  let tags = await Tag.with("colors").get();
  tags = tags.toJSON();
  for (let tag of tags) {
    assert.equal(tag.isTag, 1);
    assert.equal(tag.colors.length, 1);
    let color = tag.colors[0];
    assert.equal(color.isColor, 1);
    assert.equal(tag.name, color.cname);
  }

  // Colors with tags.
  let colors = await Color.with("tags").get();
  colors = colors.toJSON();
  for (let color of colors) {
    assert.equal(color.isColor, 1);
    assert.equal(color.tags.length, 1);
    let tag = color.tags[0];
    assert.equal(tag.isTag, 1);
    assert.equal(tag.name, color.cname);
  }

  // Tags with colors2.
  tags = await Tag.with("colors2").get();
  tags = tags.toJSON();
  for (let tag of tags) {
    assert.equal(tag.isTag, 1);
    assert.equal(tag.colors2.length, 1);
    let color = tag.colors2[0];
    assert.equal(color.isColor, 1);
    assert.equal(tag.name, color.cname);
  }

  // Colors with tags2.
  colors = await Color.with("tags2").get();
  colors = colors.toJSON();
  for (let color of colors) {
    assert.equal(color.isColor, 1);
    assert.equal(color.tags2.length, 1);
    let tag = color.tags2[0];
    assert.equal(tag.isTag, 1);
    assert.equal(tag.name, color.cname);
  }

  // Tags with color.
  tags = await Tag.with("color").get();
  tags = tags.toJSON();
  for (let tag of tags) {
    assert.equal(tag.isTag, 1);
    assert(tag.color != null);
    let color = tag.color;
    assert.equal(color.isColor, 1);
    assert.equal(tag.name, color.cname);
  }

  // Colors with tag.
  colors = await Color.with("tag").get();
  colors = colors.toJSON();
  for (let color of colors) {
    assert.equal(color.isColor, 1);
    assert(color.tag != null);
    let tag = color.tag;
    assert.equal(tag.isTag, 1);
    assert.equal(tag.name, color.cname);
  }
};
