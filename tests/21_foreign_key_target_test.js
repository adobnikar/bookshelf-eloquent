const connection = require('../knexfile');
const knex = require('knex')(connection);

const groupBy = require('lodash/groupBy');

const assert = require('assert');

const Comment = require('../models/comment');
const Post = require('../models/post');
const Tag = require('../models/tag');
const User = require('../models/user');

exports.test = async function() {
  let rawPosts = await Post.get();
  rawPosts = rawPosts.toJSON();
  rawPosts = groupBy(rawPosts, 'createdById');

  let posts = await Post.withSelect('relatedPosts', 'postIdAttr').withCount('relatedPosts as rpCount').withCount('relatedPosts').get();
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
    let whereHasPosts = await Post.select('postIdAttr').has('relatedPosts', '>=', minCount).get();
    whereHasPosts = whereHasPosts.toJSON().map(p => p.postIdAttr);
    let rawPosts = posts.filter(p => p.relatedPosts.length >= minCount).map(p => p.postIdAttr);
    assert.deepEqual(whereHasPosts, rawPosts);
    resultsCount = rawPosts.length;
    minCount++;
  }
};
