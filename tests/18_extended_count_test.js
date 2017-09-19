const connection = require('../knexfile');
const knex = require('knex')(connection);

const assert = require('assert');

const Comment = require('../models/comment');
const Enrolment = require('../models/enrolment');
const Friend = require('../models/friend');
const Group = require('../models/group');
const Post = require('../models/post');
const Rating = require('../models/rating');
const Role = require('../models/role');
const Tag = require('../models/tag');
const User = require('../models/user');
const Empty = require('../models/empty');

exports.test = async function() {
  let postsWithTagsCount = await Post.whereHas('tags').count();
  let tagsWithPostsCount = await Tag.whereHas('posts').count();
  let posts = await Post.with('tags').get();
  let tags = await Tag.with('posts').get();
  posts = posts.toJSON();
  tags = tags.toJSON();

  let tagsIds = new Set();
  let postsWithTagsCountTest = 0;
  for (let post of posts) {
    if (post.tags.length > 0) postsWithTagsCountTest++;
    for (let tag of post.tags) tagsIds.add(tag.id);

    let postTagsCount = await Tag.whereHas('posts', (sq) => {
      sq.whereIn('id', [post.id]);
    }).count();
    assert.equal(post.tags.length, postTagsCount);
  }
  assert.equal(postsWithTagsCountTest, postsWithTagsCount);

  let postsIds = new Set();
  let tagsWithPostsCountTest = 0;
  for (let tag of tags) {
    if (tag.posts.length > 0) tagsWithPostsCountTest++;
    for (let post of tag.posts) postsIds.add(post.id);

    let tagPostsCount = await Post.whereHas('tags', (sq) => {
      sq.whereIn('id', [tag.id]);
    }).count();
    assert.equal(tag.posts.length, tagPostsCount);
  }
  assert.equal(tagsWithPostsCount, tagsWithPostsCountTest);
};
