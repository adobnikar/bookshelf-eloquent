'use strict';

require('../libs/seedrandom-ext');

const Post = require('../models/post');
const Tag = require('../models/tag');

exports.seed = async function(knex, Promise) {
  // Seeded random number generator. Random but always the same.
  let rng = new Math.seedrandom('Xmy9WA5D8glX8fIif0LcZhrB4MtKygbY9JnRPQe36CWJHmI07U');

  // Get all users and posts.
  let tags = (await Tag.select('idAttr').get()).toJSON();
  let posts = await Post.select('idAttr').withDeleted().get();

  // Remove one random post.
  posts.models.splice(rng.int(posts.models.length), 1);

  // Attach a few random tags to each post.
  for (let post of posts.models) {
    let tagCount = rng.int(tags.length + 1);
    let tagsClone = tags.slice(0);
    let tagIds = [];
    while (tagCount > 0) {
      tagCount--;
      let tag = tagsClone.splice(rng.int(tagsClone.length), 1)[0];
      tagIds.push(tag.idAttr);
    }
    await post.tags().attach(tagIds);
  }
};
