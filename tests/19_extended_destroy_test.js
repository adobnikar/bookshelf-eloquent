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

const Empty = require('../models/empty-soft-delete');
const EmptyTag = require('../models/empty-tag');

exports.setUp = async function() {
  // Prepare the data for the test. This is an optional function.
  // Clear the empty table.
  await Empty.deleteAll({ hardDelete: true });
  await EmptyTag.deleteAll();

  // Copy data from posts and tags.
  let posts = await Post.with('tags').withDeleted().get();
  posts = posts.toJSON();

  let emptyCollection = Empty.collection();
  let tagsCollection = EmptyTag.collection();

  for (let post of posts) {
    let emptyModel = emptyCollection.add({
      name: post.title.substr(0, 64),
      boolean: post.visible,
      number: post.createdById,
      text: post.text,
      deletedAt: post.deletedAt,
    });
    emptyModel.tagModels = [];
    for (let tag of post.tags) {
      let tagModel = tagsCollection.addMemo({
        name: tag.name,
      }, { unique: ['name']});
      emptyModel.tagModels.push(tagModel);
    }
  }
  await emptyCollection.insert();
  await tagsCollection.insert();

  for (let emptyModel of emptyCollection.models) {
    let tagsIds = emptyModel.tagModels.map(t => t.get('idAttr'));
    if (tagsIds.length > 0) await emptyModel.tags().attach(tagsIds);
  }
};

exports.test = async function() {
  let emptiesWithTagsCount = await Empty.whereHas('tags').count();
  let tagsWithEmptiesCount = await EmptyTag.whereHas('emptySoftDeletes').count();
  let empties = await Empty.with('tags').get();
  let tags = await EmptyTag.with('emptySoftDeletes').get();
  empties = empties.toJSON();
  tags = tags.toJSON();

  let tagsIds = new Set();
  let emptiesWithTagsCountTest = 0;
  let emptiesWithNoTagsCountTest = 0;
  for (let empty of empties) {
    if (empty.tags.length > 0) emptiesWithTagsCountTest++;
    else emptiesWithNoTagsCountTest++;
    for (let tag of empty.tags) tagsIds.add(tag.idAttr);

    let emptyTagsCount = await EmptyTag.whereHas('emptySoftDeletes', (sq) => {
      sq.whereIn('idAttr', [empty.idAttr]);
    }).count();
    assert.equal(empty.tags.length, emptyTagsCount);
  }
  assert.equal(emptiesWithTagsCountTest, emptiesWithTagsCount);

  let emptiesIds = new Set();
  let tagsWithEmptiesCountTest = 0;
  for (let tag of tags) {
    if (tag.emptySoftDeletes.length > 0) tagsWithEmptiesCountTest++;
    for (let empty of tag.emptySoftDeletes) emptiesIds.add(empty.idAttr);

    let tagEmptiesCount = await Empty.whereHas('tags', (sq) => {
      sq.whereIn('idAttr', [tag.idAttr]);
    }).count();
    assert.equal(tag.emptySoftDeletes.length, tagEmptiesCount);
  }
  assert.equal(tagsWithEmptiesCount, tagsWithEmptiesCountTest);

  for (let tagId of tagsIds) {
    await Empty.whereHas('tags', (sq) => {
      sq.whereIn('idAttr', [tagId]);
    }).delete();

    let tag = await EmptyTag.where('idAttr', tagId).with('emptySoftDeletes').first();
    assert.equal(tag.emptySoftDeletes.length, 0);

    let tagEmptiesCount = await Empty.whereHas('tags', (sq) => {
      sq.whereIn('idAttr', [tagId]);
    }).count();
    assert.equal(tagEmptiesCount, 0);
  }

  let emptiesWithNoTagsCount = await Empty.count();
  assert.equal(emptiesWithNoTagsCount, emptiesWithNoTagsCountTest);
};

exports.tearDown = async function() {
  // Clean everything after test. This is an optional function.
  // Clear the empty table.
  await Empty.deleteAll({ hardDelete: true });
  await EmptyTag.deleteAll();
};
