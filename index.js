'use strict';

// xtend is a basic utility library which allows you to extend an object by appending all of the properties
// from each object in a list. When there are identical properties, the right-most property takes precedence.
const extend = require('xtend');
const memo = require('memoizee');

const _ = require('lodash');
const result = require('lodash/result');
const pick = require('lodash/pick');
const isString = require('lodash/isString');
const isArray = require('lodash/isArray');
const isFunction = require('lodash/isFunction');
const isPlainObject = require('lodash/isPlainObject');
const isDate = require('lodash/isDate');
const isNumber = require('lodash/isNumber');
const union = require('lodash/union');
const at = require('lodash/at');
const drop = require('lodash/drop');
const clone = require('lodash/clone');
const isUndefined = require('lodash/isUndefined');

// Check if fn is an async function.
// Source: https://github.com/tc39/ecmascript-asyncawait/issues/78
function isAsync(fn) {
  if (fn == null) {
    return false;
  }
  if (fn.constructor == null) {
    return false;
  }
  return fn.constructor.name === 'AsyncFunction';
}

// Eloquent plugin -
// Adds the functionality and function names of eloquent (like whereHas).
// -----
module.exports = function(Bookshelf, options) {
  // Set default options values.
  const globalOptions = options || {};
  if (globalOptions.withCountSuffix == null)
    globalOptions.withCountSuffix = 'Count';
  // Source: https://bugs.mysql.com/bug.php?id=68760
  if (globalOptions.roundDateTime == null)
    globalOptions.roundDateTime = true;
  if (globalOptions.overrideCollectionWhere == null)
    globalOptions.overrideCollectionWhere = false;

  const modelProto = Bookshelf.Model.prototype;
  const collectionProto = Bookshelf.Collection.prototype;
  const knex = Bookshelf.knex;

  // Extract all methods that will be overridden.
  const modelGet = modelProto.get;
  const modelHas = modelProto.has;
  const modelFetch = modelProto.fetch;
  const modelFetchAll = modelProto.fetchAll;
  const modelCount = modelProto.count;
  const modelDestroy = modelProto.destroy;
  const modelQuery = modelProto.query;
  const modelKnexBuilder = modelProto._builder;
  const modelResetQuery = modelProto.resetQuery;
  const collectionGet = collectionProto.get;
  const collectionAdd = collectionProto.add;
  const collectionFetch = collectionProto.fetch;
  const collectionFetchOne = collectionProto.fetchOne;
  const collectionCount = collectionProto.count;
  const collectionQuery = collectionProto.query;
  const collectionKnexBuilder = collectionProto._builder;
  const collectionResetQuery = collectionProto.resetQuery;

  // Build the extension object.
  let commonExt = {};

  let modelExt = {
    constructor: function() {
      modelProto.constructor.apply(this, arguments);

      this.resetEloquent();

      const options = arguments[1] || {};
      this.eloquent.caseSensitive = (options.caseSensitive === true);
    },
  };

  commonExt.resetEloquent = function() {
    // Reset eloquent state.
    if (this.eloquent == null) {
      this.eloquent = {};

      // TODO: if this is out of the if as it should be thwn the first
      // test that fails is with('posts.comments')
      this.eloquent.fetchOptions = {};
      this.eloquent.queryBuilderTasksAsync = [];
      this.eloquent.withCountColumnsAsync = [];
      this.eloquent.withCountColumns = [];
      this.eloquent.relationColumns = [];
      this.eloquent.withs = {};
      this.eloquent.knex = knex;
      this.eloquent.bookshelf = Bookshelf;
    }
  };

  // ---------------------------------------------------------------------------
  // ------ Fake Sync ----------------------------------------------------------
  // ---------------------------------------------------------------------------

  commonExt.fakeSync = async function(options) {
    options = await mergeOptions(this, options || {});
    let sync = this.sync(options);
    options.query = sync.query;
    let columns = null;

    const queryContainsColumns = _(sync.query._statements)
      .filter({grouping: 'columns'})
      .some('value.length');

    if (options.columns) {
      // Normalize single column name into array.
      columns = isArray(options.columns) ?
        options.columns : [options.columns];
    } else if (!queryContainsColumns) {
      // If columns have already been selected via the `query` method
      // we will use them. Otherwise, select all columns in this table.
      columns = [result(sync.syncing, 'tableName') + '.*'];
    }

    // Trigger fetching for any possible plugins.
    await sync.syncing.triggerThen('fetching', sync.syncing, columns, options);

    return sync;
  };

  commonExt.buildQuery = async function(options) {
    options = await mergeOptions(this, options || {});
    let sync = this.sync(options);
    options.query = sync.query;
    let columns = null;

    const queryContainsColumns = _(sync.query._statements)
      .filter({grouping: 'columns'})
      .some('value.length');

    if (options.columns) {
      // Normalize single column name into array.
      columns = isArray(options.columns) ?
        options.columns : [options.columns];
    } else if (!queryContainsColumns) {
      // If columns have already been selected via the `query` method
      // we will use them. Otherwise, select all columns in this table.
      columns = [result(sync.syncing, 'tableName') + '.*'];
    }

    // Trigger fetching for any possible plugins.
    await sync.syncing.triggerThen('fetching', sync.syncing, columns, options);

    sync.query.select(columns);
    return sync;
  };

  // ---------------------------------------------------------------------------
  // ------ Table alias --------------------------------------------------------
  // ---------------------------------------------------------------------------

  commonExt.useTableAlias = function(alias) {
    if (this.eloquent.originalTableName == null)
      this.eloquent.originalTableName = this.tableName;
    this.tableName = alias;

    let overrideFrom = function(model, attrs, options) {
      if (!options.isEager || options.parentResponse) {
        let orgTableName = model.eloquent.originalTableName;
        let alias = model.tableName;
        let fromStr = knex.raw(orgTableName + ' as ' + alias).toString();
        options.query.from(fromStr);
      }
    };

    this.on('fetching', overrideFrom.bind(this));
    this.on('fetching:collection', overrideFrom.bind(this));

    return this;
  };

  // ---------------------------------------------------------------------------
  // ------ Knex Where Methods -------------------------------------------------
  // ---------------------------------------------------------------------------

  // Inspired by the knex clone function.
  function applyKnex(targetKnex, knexToApply) {
    // const cloned = new knexToApply.constructor(knexToApply.client);
    // targetKnex._method = knexToApply._method;
    // targetKnex._single = clone(knexToApply._single);
    // targetKnex._statements = clone(knexToApply._statements);
    targetKnex._statements =
      targetKnex._statements.concat(knexToApply._statements);
    // targetKnex._debug = knexToApply._debug;

    // `_option` is assigned by the `Interface` mixin.
    // if (!isUndefined(knexToApply._options)) {
    //  targetKnex._options = clone(knexToApply._options);
    // }

    return targetKnex;
  }

  function wrapCallbackIntoQueryBuilderTask(instance, callback) {
    let data = {
      model: instance,
      callback: callback,
      knexToApply: null,
    };

    // Async wrapper.
    let whereNestedQueryTask = (async(data) => {
      // Create a clean model instance.
      let modelInstance = data.model.constructor.forge();

      // Check if the callback function is async.
      if (isAsync(data.callback))
        await data.callback.call(modelInstance, modelInstance);
      else data.callback.call(modelInstance, modelInstance);

      // Await all query building tasks.
      await modelInstance.runQueryBuildingTasks();

      // Store the query that was built.
      data.knexToApply = modelInstance.query();
    })(data);

    // Push the task to the where array.
    instance.eloquent.queryBuilderTasksAsync.push(whereNestedQueryTask);

    // Override/tap the callback function.
    return function(qb) {
      if (data.knexToApply == null)
        throw new Error('Query building tasks of a nested ' +
          'where query were not completed.');
      applyKnex(qb, data.knexToApply);
    };
  }

  function whereTemplate(name) {
    return function(...args) {
      // Override/tap if callback function.
      if ((args.length > 0) && isFunction(args[0]))
        args[0] = wrapCallbackIntoQueryBuilderTask(this, args[0]);
      return this.query(name, ...args);
    };
  }

  modelExt.where = whereTemplate('where');
  commonExt.whereNot = whereTemplate('whereNot');

  // Synonims for where. Useful if we do not want
  // to override the where function on Collection.
  // Query where. To enable query where on collections.
  commonExt.qWhere = modelExt.where;
  commonExt.queryWhere = modelExt.where;
  commonExt.basicWhere = modelExt.where;
  if (globalOptions.overrideCollectionWhere) {
    commonExt.where = modelExt.where;
  }

  // Attach existing "knex where methods" to the model.
  const whereMethods = ['whereIn', 'whereNotIn', 'whereNull', 'whereNotNull',
    'whereExists', 'whereNotExists', 'whereRaw',
  ];
  for (let method of whereMethods) {
    commonExt[method] = function(...args) {
      return this.query(method, ...args);
    };
  }

  commonExt.whereLike = function(columnName, value) {
    return this.query('where', columnName, 'like', value);
  };

  commonExt.whereNotLike = function(columnName, value) {
    return this.query('where', columnName, 'not like', value);
  };

  // ---------------------------------------------------------------------------
  // ------ Knex AndWhere Methods ----------------------------------------------
  // ---------------------------------------------------------------------------

  commonExt.andWhere = whereTemplate('andWhere');
  commonExt.andWhereNot = whereTemplate('andWhereNot');

  for (let method of whereMethods) {
    let andMethodName = 'and' + method.substr(0, 1).toUpperCase() +
      method.substr(1);
    commonExt[andMethodName] = function(...args) {
      return this.query(andMethodName, ...args);
    };
  }

  commonExt.andWhereLike = function(columnName, value) {
    return this.andWhere(columnName, 'like', value);
  };

  commonExt.andWhereNotLike = function(columnName, value) {
    return this.andWhere(columnName, 'not like', value);
  };

  // ---------------------------------------------------------------------------
  // ------ Knex OrWhere Methods -----------------------------------------------
  // ---------------------------------------------------------------------------

  commonExt.orWhere = whereTemplate('orWhere');
  commonExt.orWhereNot = whereTemplate('orWhereNot');

  for (let method of whereMethods) {
    let orMethodName = 'or' + method.substr(0, 1).toUpperCase() +
      method.substr(1);
    commonExt[orMethodName] = function(...args) {
      return this.query(orMethodName, ...args);
    };
  }

  commonExt.orWhereLike = function(columnName, value) {
    return this.orWhere(columnName, 'like', value);
  };

  commonExt.orWhereNotLike = function(columnName, value) {
    return this.orWhere(columnName, 'not like', value);
  };

  // ---------------------------------------------------------------------------
  // ------ Knex Where Between Methods -----------------------------------------
  // ---------------------------------------------------------------------------

  const whereBetweenMethods = ['whereBetween', 'whereNotBetween',
    'andWhereBetween', 'andWhereNotBetween',
    'orWhereBetween', 'orWhereNotBetween'];
  for (let method of whereBetweenMethods) {
    commonExt[method] = function(columnName, a, b) {
      if (isArray(a)) return this.query(method, columnName, a);
      else return this.query(method, columnName, [a, b]);
    };
  }

  // ---------------------------------------------------------------------------
  // ------ Knex Offset & Limit ------------------------------------------------
  // ---------------------------------------------------------------------------

  commonExt.offset = function(...args) {
    return this.query('offset', ...args);
  };

  commonExt.limit = function(...args) {
    return this.query('limit', ...args);
  };

  commonExt.skip = function(...args) {
    return this.query('offset', ...args);
  };

  commonExt.take = function(...args) {
    return this.query('limit', ...args);
  };

  // ---------------------------------------------------------------------------
  // ------ Knex orderByRaw ----------------------------------------------------
  // ---------------------------------------------------------------------------

  commonExt.orderByRaw = function(...args) {
    return this.query('orderByRaw', ...args);
  };

  // ---------------------------------------------------------------------------
  // ------ Select, Delete, First, Get -----------------------------------------
  // ---------------------------------------------------------------------------

  commonExt.runQueryBuildingTasks = async function() {
    let eloquent = this.eloquent;
    let fetchOptions = eloquent.fetchOptions;

    // Query building tasks.
    await Promise.all(eloquent.queryBuilderTasksAsync);
    eloquent.queryBuilderTasksAsync = [];
    // WithCount tasks.
    for (let withCountTask of eloquent.withCountColumnsAsync) {
      let result = await withCountTask;
      eloquent.withCountColumns.push(result.query);
    }

    return this;
  };

  /**
   * Helper function that helps to merge the default bookshelf fetch
   * options parameter with the options that are built by this extension.
   * @param {object} eloquent
   * @param {object} options
   */
  async function mergeOptions(instance, options) {
    await instance.runQueryBuildingTasks();

    let eloquent = instance.eloquent;
    let fetchOptions = eloquent.fetchOptions;
    let withCountColumns = eloquent.withCountColumns;

    if ('columns' in fetchOptions) {
      // Force select relation attributes that are required for the with statement.
      fetchOptions.columns = union(fetchOptions.columns,
        eloquent.relationColumns);
      // TODO: Do we always want to select the idAttribute so that bookshelf can function normally?
      // fetchOptions.columns = union(fetchOptions.columns,
      //  [instance.idAttribute]);
    }

    // copy any columns from withCountColumns to fetchOptions
    if (withCountColumns.length > 0)	{
      // check if any columns already in the fetchOptions
      if (!('columns' in fetchOptions)) fetchOptions.columns = ['*'];

      // copy the columns
      for (let column of withCountColumns)
        fetchOptions.columns.push(column);
    }

    options = options || {};
    if ('withRelated' in fetchOptions) {
      if ('withRelated' in options) {
        options.withRelated = formatWiths(options.withRelated, null);
        options.withRelated = extend(fetchOptions.withRelated,
          options.withRelated);
      }
    }

    return extend(fetchOptions, options);
  };

  /**
   * Set which columns you want to select on fetch.
   * @param {string|string[]} attrs List of attributes that you want to get from the database.
   */
  commonExt.select = function(attrs) {
    // If parameter attrs is not an array the wrap it into an array.
    if (!isArray(attrs)) attrs = [attrs];

    // Set or replace the columns array.
    this.eloquent.fetchOptions.columns = attrs;

    return this;
  };

  /**
   * Look at the bookshelf documentation.
   */
  modelExt.destroy = async function(...args) {
    // Attach options that were built by eloquent/this extension.
    let options = {};
    if (args.length >= 1) options = args[0];
    options = await mergeOptions(this, options);
    args[0] = options;

    // Call the original fetchAll function with eager load wrapper.
    return await modelDestroy.apply(this, args);
  };

  /**
   * Synonym for destroy.
   */
  modelExt.delete = function(...args) {
    return this.destroy(...args);
  };

  /**
   * Look at the bookshelf documentation.
   */
  modelExt.fetch = async function fetch(options) {
    // Attach options that were built by eloquent/this extension.
    options = await mergeOptions(this, options);

    // Call the original fetch function with eager load wrapper.
    return await fetchWithEagerLoad.apply(this, [modelFetch, options]);
  };

  /**
   * Synonym for fetch.
   */
  modelExt.first = modelExt.fetch;

  /**
   * Synonym for fetchAll.
   * This one is a little bit tricky. Now it is also a synonym for fetchAll.
   * In eloquent function get() is similar to fetchAll() in bookshelf.
   * If the first parameter is a string we want to call the bookshelf get() function which gets an attribute.
   * Else we want to call the eloquent get() function which gets all result that match the built query.
   */
  modelExt.get = function(...args) {
    if (isString(args[0])) return modelGet.apply(this, args);
    else return this.fetchAll(...args);
  };

  /**
   * Look at the bookshelf documentation.
   */
  modelExt.fetchAll = async function fetchAll(options) {
    // Attach options that were built by eloquent/this extension.
    options = await mergeOptions(this, options);

    // Call the original fetchAll function with eager load wrapper.
    return await fetchWithEagerLoad.apply(this, [modelFetchAll, options]);
  };

  /**
   * Look at the bookshelf documentation.
   */
  modelExt.count = async function(column, options) {
    let args = [];
    if (!isString(column)) options = column;
    else args.push(column);

    // Attach options that were built by eloquent/this extension.
    options = await mergeOptions(this, options);
    args.push(options);

    // Call the original fetchAll function with eager load wrapper.
    return await modelCount.apply(this, args);
  };

  // ---------------------------------------------------------------------------
  // ------ Bookshelf Paranoia Support -----------------------------------------
  // ---------------------------------------------------------------------------

  commonExt.withDeleted = function() {
    // Retrieve with soft deleted rows.
    this.eloquent.fetchOptions.withDeleted = true;
    // Chainable.
    return this;
  };

  /**
   * Synonym for withDeleted.
   */
  commonExt.withTrashed = commonExt.withDeleted;

  // ---------------------------------------------------------------------------
  // ------ Eager Loading ------------------------------------------------------
  // ---------------------------------------------------------------------------

  async function fetchWithEagerLoad(fetchFunction, options) {
    // TODO: maybe check which columns are required for the
    // with related functionality before executing the fecth query.

    // Withs wrapper
    let result = await fetchFunction.apply(this, [options]);

    // make this work for arrays and single models (by wrapping single model into an array)
    let isSingle = true;
    let collection = {
      models: [],
    };
    if (result !== null) {
      if ('models' in result) {
        // result is a CollectionBase
        collection = result;
        isSingle = false;
      } else {
        // result is a ModelBase
        collection.models = [result];
      }
    }

    // define the unwrap function
    let localUnwrap = function(collection, isSingle) {
      // sanity check
      if (!('models' in collection))
        throw new Error('Cannot unwrap something that is not a collection.');

      // dont unwrap anything if it wasnt wrapped in the first place
      if (!isSingle) return collection;

      // return the single model that was found
      if (collection.models.length > 0)
        return collection.models[0];

      // no models were found in the first place
      return null;
    };

    // get the count of with relations
    let withsCount = Object.keys(this.eloquent.withs).length;
    if ((collection.models.length < 1) || (withsCount < 1))
      // no need to get the with relations => just return the result
      return localUnwrap(collection, isSingle);

    // init ids variable to null
    let ids = null;

    // fetch all withs
    let loadRelationTasks = [];
    for (let withRelationText in this.eloquent.withs) {
      // get the relatedData
      let relation = this.eloquent.withs[withRelationText];
      let rd = relation.relatedData;

      // Check if parent ids required.
      if ((rd.type === 'belongsToMany') ||
        (rd.type === 'hasMany')) {
        // Load ids.
        ids = [];
        // extract the model id for each model
        for (let model of collection.models) {
          if (!(rd.parentIdAttribute in model.attributes)) {
            throw new Error(`Failed to eager load the ${rd.type} "${withRelationText}" ` +
              'relation of the "' + rd.parentTableName +
              `" model. Column "${rd.parentIdAttribute}" needs to be selected ` +
              'if you want to eager load this relation.');
          }

          // push the model.id into the collection of ids
          ids.push(model.attributes[rd.parentIdAttribute]);
        }
      }

      // Apply the relation constraint
      switch (rd.type)	{
        case 'belongsToMany':
          loadRelationTasks.push(eagerLoadBelongsToManyRelation.apply(this,
            [ids, collection, withRelationText]));
          break;
        case 'hasMany':
          loadRelationTasks.push(eagerLoadHasManyRelation.apply(this,
            [ids, collection, withRelationText]));
          break;
        case 'belongsTo':
        case 'hasOne':
          loadRelationTasks.push(eagerLoadBelongsToRelation.apply(this,
            [collection, withRelationText]));
          break;
        default:
          throw new Error(`Failed to eager load the ${rd.type} "${withRelationText}" ` +
            `relation of the "${rd.parentTableName}" model. ` +
            `Relation type "${rd.type}" not supported/implemented for the with statement.`);
      }
    }

    // Wait for all tasks to complete.
    await Promise.all(loadRelationTasks);

    // Return the result.
    return localUnwrap(collection, isSingle);
  };

  async function eagerLoadBelongsToManyRelation(ids, collection,
    withRelationText) {
    // Get the relatedData and relation/relatedQuery.
    let relatedQuery = this.eloquent.withs[withRelationText];
    let rd = relatedQuery.relatedData;
    // Remove relatedData to bypass bookshelf eager loading functionallity.
    delete relatedQuery.relatedData;

    // get the columns
    let relatedFkAttribute = rd.key('foreignKey');
    let relatedIdAttribute = rd.targetIdAttribute;

    // create relation on every model in the collection
    let modelMap = new Map();
    let {firstRelationName, firstRelationAlias} = parseWithRelation(withRelationText);
    for (let model of collection.models) {
      let modelId = model.attributes[rd.parentIdAttribute];
      modelMap.set(modelId, model);

      // add the relation
      let newRelation = this.getRelation(firstRelationName);
      newRelation.models = [];
      newRelation._byId = {};
      newRelation.length = 0;

      // relations attribute should already exist on each model
      model.relations[firstRelationAlias] = newRelation;
    }

    // build the pivot table query
    let pivotQuery = knex.select([rd.key('foreignKey'), rd.otherKey])
      .from(rd.joinTableName).whereIn(rd.key('foreignKey'), ids);

    // fetch from pivot table
    let pivotRows = await pivotQuery;

    // build foreignKey and otherKey indexes
    //let foreignKeyIndex = new Map();
    let otherKeyIndex = new Map();
    for (let pivotRow of pivotRows) {
      let foreignKeyValue = pivotRow[rd.key('foreignKey')];
      if (foreignKeyValue === null) continue;
      let otherKeyValue = pivotRow[rd.otherKey];
      if (otherKeyValue === null) continue;
      if (!otherKeyIndex.has(otherKeyValue)) otherKeyIndex.set(otherKeyValue, []);
      otherKeyIndex.get(otherKeyValue).push(foreignKeyValue);
    }

    // apply the whereIn constraint to the relatedQuery
    relatedQuery.eloquent.relationColumns.push(relatedIdAttribute);
    relatedQuery.whereIn(relatedIdAttribute, Array.from(otherKeyIndex.keys()));

    // fetch from related table
    let relatedModels = await relatedQuery.get();

    // index the relatedModels by their ids
    let relatedModelIndex = new Map();
    for (let relatedModel of relatedModels.models) {
      if (!(relatedIdAttribute in relatedModel.attributes)) {
        throw new Error(`Failed to eager load the ${rd.type} "${withRelationText}" ` +
          'relation of the "' + rd.parentTableName +
          `" model. Column "${rd.relatedIdAttribute}" needs to be selected ` +
          'if you want to eager load this relation.');
      }
      let relatedIdValue = relatedModel.attributes[relatedIdAttribute];

      // push the related model to each related model from the collection
      let modelIdsList = [];
      if (otherKeyIndex.has(relatedIdValue)) modelIdsList = otherKeyIndex.get(relatedIdValue);
      for (let modelId of modelIdsList) {
        if (!modelMap.has(modelId)) continue;
        // Resolve the model.
        let model = modelMap.get(modelId);
        // Get the relation.
        let newRelation = model.relations[firstRelationAlias];
        // Add the related model to the relation collection.
        newRelation.models.push(relatedModel);
        newRelation._byId[relatedIdValue] = relatedModel;
        newRelation._byId[relatedModel.cid] = relatedModel;
        newRelation.length++;
      }
    }
  };

  async function eagerLoadHasManyRelation(ids, collection, withRelationText) {
    // Get the relatedData and relation/relatedQuery.
    let relatedQuery = this.eloquent.withs[withRelationText];
    let rd = relatedQuery.relatedData;
    // Remove relatedData to bypass bookshelf eager loading functionallity.
    delete relatedQuery.relatedData;

    // get the columns
    let relatedFkAttribute = rd.key('foreignKey');
    let relatedIdAttribute = rd.targetIdAttribute;

    // apply the whereIn constraint to the relatedQuery
    relatedQuery.whereIn(relatedFkAttribute, ids);

    // fetch from related table
    relatedQuery.eloquent.relationColumns.push(relatedFkAttribute);
    let relatedModels = await relatedQuery.get();
    // build foreignKey and otherKey indexes
    let foreignKeyIndex = new Map();
    for (let relatedModel of relatedModels.models) {
      if (!(relatedFkAttribute in relatedModel.attributes)) {
        throw new Error(`Failed to eager load the ${rd.type} "${withRelationText}" ` +
          'relation of the "' + rd.parentTableName +
          `" model. Column "${rd.relatedFkAttribute}" needs to be selected ` +
          'if you want to eager load this relation.');
      }

      let foreignKeyValue = relatedModel.attributes[relatedFkAttribute];
      if (foreignKeyValue === null) continue;
      if (!foreignKeyIndex.has(foreignKeyValue))
        foreignKeyIndex.set(foreignKeyValue, []);

      foreignKeyIndex.get(foreignKeyValue).push(relatedModel);
    }

    // attach the relatedModels to the model(s)
    let {firstRelationName, firstRelationAlias} = parseWithRelation(withRelationText);
    for (let model of collection.models) {
      let rModels = [];
      let rById = {};

      let modelId = model.attributes[rd.parentIdAttribute];
      if (foreignKeyIndex.has(modelId))
        rModels = foreignKeyIndex.get(modelId);

      for (let relatedModel of rModels) {
        if (relatedIdAttribute in relatedModel.attributes)
          rById[relatedModel.attributes[relatedIdAttribute]] = relatedModel;
        rById[relatedModel.cid] = relatedModel;
      }

      // add the relation
      let newRelation = this.getRelation(firstRelationName);
      newRelation.models = rModels;
      newRelation._byId = rById;
      newRelation.length = rModels.length;

      // relations attribute should already exist on each model
      model.relations[firstRelationAlias] = newRelation;
    }
  };

  async function eagerLoadBelongsToRelation(collection, withRelationText) {
    // Get the relatedData and relation/relatedQuery.
    let relatedQuery = this.eloquent.withs[withRelationText];
    let rd = relatedQuery.relatedData;
    // Remove relatedData to bypass bookshelf eager loading functionallity.
    delete relatedQuery.relatedData;

    // get the columns
    let relatedFkAttribute = rd.key('foreignKey');
    let relatedIdAttribute = rd.targetIdAttribute;

    // build the fk ids array
    let fkIds = new Set();

    // extract the foreignKey for each model
    for (let model of collection.models) {
      if (!(relatedFkAttribute in model.attributes)) {
        throw new Error(`Failed to eager load the ${rd.type} "${withRelationText}" ` +
          'relation of the "' + rd.parentTableName +
          `" model. Column "${rd.relatedFkAttribute}" needs to be selected ` +
          'if you want to eager load this relation.');
      }

      // push the model.foreignKey into the collection of ids
      if (model.attributes[relatedFkAttribute] !== null)
        fkIds.add(model.attributes[relatedFkAttribute]);
    }

    // apply the whereIn constraint to the relatedQuery
    relatedQuery.whereIn(relatedIdAttribute, Array.from(fkIds));

    // fetch from related table
    relatedQuery.eloquent.relationColumns.push(relatedIdAttribute);
    let relatedModels = await relatedQuery.get();

    // index the relatedModels by their ids
    let relatedModelIndex = new Map();
    for (let relatedModel of relatedModels.models) {
      if (!(relatedIdAttribute in relatedModel.attributes))
        throw new Error('If you want to perform a with statement on a ' +
          'related model then its id needs to be selected.');

      // insert the related model into the index
      let relatedIdValue = relatedModel.attributes[relatedIdAttribute];
      if (relatedIdValue !== null)
        relatedModelIndex.set(relatedIdValue, relatedModel);
    }

    // attach the relatedModels to the model(s)
    let {firstRelationName, firstRelationAlias} = parseWithRelation(withRelationText);
    for (let model of collection.models) {
      // add/create the relation
      let newRelation = this.getRelation(firstRelationName);

      // set the relation to be null by default
      model.attributes[firstRelationAlias] = null;

      if (model.attributes[relatedFkAttribute] === null) continue;
      let relatedId = model.attributes[relatedFkAttribute];

      if (!relatedModelIndex.has(relatedId)) continue;
      let relatedModel = relatedModelIndex.get(relatedId);

      // copy over all own properties
      // TODO: this is a quick fix - find a better solution how to create relation from model
      let copyProperties = new Set([
        'attributes',
        '_previousAttributes',
        'changed',
        'relations',
        'cid',
        'id',
        '_events',
        '_eventsCount',
        'eloquent',
      ]);
      for (var property in relatedModel) {
        if (!relatedModel.hasOwnProperty(property)) continue;
        if (!copyProperties.has(property)) continue;
        newRelation[property] = relatedModel[property];
      }

      // relations attribute should already exist on each model
      model.relations[firstRelationAlias] = newRelation;
    }
  };

  function formatWiths(relations, signleRelationSubquery = null) {
    // Validate arguments.
    if (isString(relations)) {
      let relObj = {};
      relObj[relations] = signleRelationSubquery;
      relations = [relObj];
    } else if (relations.constructor === Object) {
      relations = [relations];
    }

    if (relations.constructor !== Array)
      throw new Error('Must pass an object/dictionary, ' +
        'array or string for the relations argument.');

    // add to the withRelated
    let withRelated = {};
    for (let relObj of relations) {
      if (isString(relObj)) {
        // TODO: this probably cannot happen because of argument validation
        withRelated[relObj] = null;
      } else if (isPlainObject(relObj)) {
        for (let key in relObj) {
          if (!relObj.hasOwnProperty(key)) continue;
          withRelated[key] = relObj[key];
        }
      } else {
        // TODO: maybe make this error more explanatory
        throw new Error('Must pass an object/dictionary, ' +
          'array or string for the relations argument.');
      }
    }

    return withRelated;
  };

  // Support for aliases.
  function parseWithRelation(relationText) {
    let tokens = relationText.split(/\s/).map(t => t.trim()).filter(t => (t.length > 0));
    let invalidFormatError = `Invalid relation name '${relationText}'. Correct format is "[relationName]" or "[relationName] as [alias]".`;
    let aliasTokens = [];
    let firstRelationAlias = null;
    if (tokens.length === 3) {
      if (tokens[1].toLowerCase() !== 'as') throw new Error(invalidFormatError);
      let relationAlias = tokens[2];
      aliasTokens = relationAlias.split('.').map(t => t.trim()).filter(t => (t.length > 0));
      if (aliasTokens.length > 0) firstRelationAlias = aliasTokens.shift();
    } else if (tokens.length !== 1) throw new Error(invalidFormatError);
    let relationPath = tokens[0];

    // Split relation name by . (dots) to handle nested/sub relations.
    tokens = relationPath.split('.').map(t => t.trim()).filter(t => (t.length > 0));
    if (tokens.length < 1) throw new Error(`Invalid relation name '${relationPath}'.`);
    let firstRelationName = tokens.shift();
    let hasSubRelation = (tokens.length > 0);
    let subRelationText = null;
    if (hasSubRelation) {
      subRelationText = tokens.join('.');
      if (aliasTokens.length > 0) subRelationText += ' as ' + aliasTokens.join('.');
    }
    if (firstRelationAlias == null) firstRelationAlias = firstRelationName;

    return {
      firstRelationName: firstRelationName,
      firstRelationAlias: firstRelationAlias,
      hasSubRelation: hasSubRelation,
      subRelationText: subRelationText,
    }
  }

  function parseWithCountRelation(relationText) {
    let tokens = relationText.split(/\s/).map(t => t.trim()).filter(t => (t.length > 0));
    let relationAlias = null;
    let invalidFormatError = `Invalid relation name '${relationText}'. Correct format is "[relationName]" or "[relationName] as [alias]".`;
    if (tokens.length === 3) {
      if (tokens[1].toLowerCase() !== 'as') throw new Error(invalidFormatError);
      relationAlias = tokens[2];
    } else if (tokens.length !== 1) throw new Error(invalidFormatError);
    let relationPath = tokens[0];

    // If alias not given then generate it.
    if (relationAlias == null) {
      // Build the alias.
      let aliasTokens = relationPath.split('.');
      if (aliasTokens.length < 1) throw new Error(`Invalid relation name '${relationPath}'.`);
      for (let i = 1; i < aliasTokens.length; i++) {
        let token = aliasTokens[i];
        token = token.substr(0, 1).toUpperCase() + token.substr(1);
        aliasTokens[i] = token;
      }
      aliasTokens.push(globalOptions.withCountSuffix);
      relationAlias = aliasTokens.join('');
    }

    return {
      relationPath: relationPath,
      relationAlias: relationAlias,
    };
  }

  /**
   * @param {object|string|string[]} relationNames An object where keys are relation names and values are subquery functions or null.
   * Can also be a single relations name or an array of relation names.
   * @param {function} [signleRelationSubquery] Only takes effect if the "relationNames" is a single relation name (string).
   */
  commonExt.with = function(relationNames, signleRelationSubquery = null) {
    // Validate arguments.
    // withRelated is an object where keys are relation names and values are callback functions or null
    let withRelated = formatWiths(relationNames, signleRelationSubquery);

    // Prepare all relations.
    for (let relationText in withRelated) {
      if (!withRelated.hasOwnProperty(relationText)) continue;

      // Check if the relationText is string.
      if (!isString(relationText))
        throw new Error('Must pass an object, string or an array of strings ' +
          'for the relationNames argument.');

      // Parse relation text;
      let {firstRelationName, firstRelationAlias, hasSubRelation, subRelationText} = parseWithRelation(relationText);
      let relationKey = firstRelationName;
      if (firstRelationName !== firstRelationAlias) relationKey += ` as ${firstRelationAlias}`;

      // Get the relation and relationData.
      let relation = this.getRelation(firstRelationName).toModel();
      let relatedData = relation.relatedData;

      // Check if this relation already exists in the withs => if not then create a new related query.
      if (!(relationKey in this.eloquent.withs)) {
        // Check if this is a supported relation
        if ((relatedData.type !== 'belongsToMany') &&
          (relatedData.type !== 'belongsTo') &&
          (relatedData.type !== 'hasMany') &&
          (relatedData.type !== 'hasOne'))
          throw new Error('Relation type ' + relatedData.type +
            ' not supported/implemented for the with statement.');

        // Add this relation to the withs.
        this.eloquent.withs[relationKey] = relation;
      }

      // Get the related query.
      let relatedQuery = this.eloquent.withs[relationKey];

      // Get the callback.
      let callback = withRelated[relationText];

      // Check if tihs is the leaf relation/token.
      if (hasSubRelation) {
        // This is not the leaf relation/token => pass the callback to the next sub relation/token.
        relatedQuery.with(subRelationText, callback);
      } else {
        // This is the leaf relation/token => apply the callback.
        // Check if the callback is a function.
        if (isFunction(callback)) callback(relatedQuery); // Apply the callback.
      }
    }

    // Chainable.
    return this;
  };

  /**
   * @param {string} relationName Name of the relation that you want to eager load.
   * @param {string|string[]} attrs List of attributes on the related model that we want to get from database.
   * @param {function} [subquery] Optional nested query callback.
   */
  commonExt.withSelect = function(relationName, attrs, subquery = null) {
    // Validate arguments.
    if (!isString(relationName))
      throw new Error('Must pass a string for the relation name argument.');

    // We want a list of attributes.
    if (attrs.constructor !== Array) attrs = [attrs];

    // Use the existing "with" function.
    // Check if the subquery is a function.
    if (isFunction(subquery)) {
      return this.with(relationName, function(q) {
        q.select(attrs);
        subquery(q);
      });
    } else {
      return this.with(relationName, function(q) {
        q.select(attrs);
      });
    }
  };

  // ---------------------------------------------------------------------------
  // ------ With Count ---------------------------------------------------------
  // ---------------------------------------------------------------------------

  /**
   * Helps to build the withCount subquery.
   * @param {Bookshelf Model} Model Current model.
   * @param {Knex query builder} subquery Current subquery. Treated as alias if it is a string.
   * @param {string} path Remaining relation path.
   */
  async function withCountSubQuery(Model, subquery, path, baseTableName) {
    // Split path by . (dots) to handle nested/sub relations.
    let tokens = path.split('.');
    // Check if we have at least one token. Sanity check.
    if (tokens.length < 1)
      throw new Error('Could not split relation path "' + path + '".');
    // Pick the first relation name.
    let firstRelationName = tokens[0];
    // Check if the relation exists.
    if (!(firstRelationName in Model))
      throw new Error('Relation "' + firstRelationName +
        '" does not exist on the model "' + Model.tableName + '".');
    // Construct the sub path (remaining path)
    tokens.shift();
    let subPath = tokens.join('.');

    // Get the relation data.
    let relation = Model.getRelation(firstRelationName).toModel();
    let rd = relation.relatedData;
    let bookQuery = relation;

    // Apply the relation constraint.
    switch (rd.type)	{
      case 'belongsToMany':
        // HasMany part.
        if (isString(subquery))
          subquery = knex.raw('(??.??)', [subquery, rd.parentIdAttribute]);
        else subquery = subquery.select(rd.parentIdAttribute);

        // Pivot table part.
        subquery = knex.select(rd.otherKey)
          .from(rd.joinTableName)
          .whereIn(rd.key('foreignKey'), subquery);

        // BelongsTo part.
        bookQuery.whereIn(rd.targetIdAttribute, subquery);
        break;
      case 'hasMany':
        if (isString(subquery))
          subquery = knex.raw('(??.??)', [subquery, rd.parentIdAttribute]);
        else subquery = subquery.select(rd.parentIdAttribute);
        bookQuery.whereIn(rd.key('foreignKey'), subquery);
        break;
      case 'belongsTo':
      case 'hasOne':
        if (isString(subquery))
          subquery = knex.raw('??.??', [subquery, rd.key('foreignKey')]);
        else subquery = subquery.select(rd.key('foreignKey'));
        bookQuery.whereIn(rd.targetIdAttribute, subquery);
        break;
      default:
        throw new Error('Failed to eager load the "' + firstRelationName +
          '" relation of the "' + Model.tableName +
          '" model. Relation type ' + rd.type +
          ' not supported/implemented for the withCount statement.');
    }

    // Handle circular relations. Set alias when there is a table name collision.
    if (bookQuery.tableName === baseTableName)
      bookQuery.useTableAlias(('t' === baseTableName) ? 't1' : 't');

    if (tokens.length < 1) return bookQuery;
    else {
      let syncSubquery = (await bookQuery.fakeSync()).query;
      return withCountSubQuery(relation, syncSubquery, subPath, baseTableName);
    }
  }

  /**
   * @param {object|string|string[]} relationNames An object where keys are relation names and values are subquery functions or null.
   * Can also be a single relations name or an array of relation names.
   * @param {function} [signleRelationSubquery] If the "relationNames" parameter is a string you can pass the callback to this parameter.
   */
  commonExt.withCount = function(relationNames, signleRelationSubquery = null) {
    // Validate arguments.
    // withRelated is an object where keys are relation names and values are callback functions or null
    let withRelated = formatWiths(relationNames, signleRelationSubquery);

    // Loop through all the relation names. Build the select queries.
    for (let relationText in withRelated) {
      if (!withRelated.hasOwnProperty(relationText)) continue;

      // Check if the relationName is string.
      if (!isString(relationText))
        throw new Error('Must pass an object, string or an array of strings ' +
          'for the relationNames argument.');

      // Get the callback.
      let {relationPath, relationAlias} = parseWithCountRelation(relationText)
      let callback = withRelated[relationText];

      // Async wrapper.
      let withCountSubQueryTask = (async(Model, relationPath, relationAlias, callback) => {
        // Build the withCount sub query.
        let subQuery = await withCountSubQuery(Model, Model.tableName,
          relationPath, Model.tableName);

        // Check if the callback is a function and apply the callback.
        if (isFunction(callback)) callback(subQuery);

        // Add to select
        subQuery = (await subQuery.fakeSync())
          .query.count('*').as(relationAlias);

        // Wrap the result into an object to prevent execution on await.
        return {query: subQuery};
      })(this, relationPath, relationAlias, callback);

      // Push the task to the withCount array.
      this.eloquent.withCountColumnsAsync.push(withCountSubQueryTask);
    }

    // Chainable.
    return this;
  };

  // ---------------------------------------------------------------------------
  // ------ Where Has ----------------------------------------------------------
  // ---------------------------------------------------------------------------

  /**
   * Helper function that composes a SQL query given the operator and operands.
   * @param {string} operator
   * @param {numeric|string} [operand1]
   * @param {numeric|string} [operand2]
   */
  function composeOperator(operator, operand1 = null, operand2 = null) {
    // BETWEEN ... AND ...	Check whether a value is within a range of values
    // =			Equal operator
    // <=>			NULL-safe equal to operator
    // >			Greater than operator
    // >=			Greater than or equal operator
    // IN()			Check whether a value is within a set of values
    // IS			Test a value against a boolean
    // IS NOT			Test a value against a boolean
    // IS NOT NULL		NOT NULL value test
    // IS NULL			NULL value test
    // <			Less than operator
    // <=			Less than or equal operator
    // LIKE			Simple pattern matching
    // NOT BETWEEN ... AND ...	Check whether a value is not within a range of values
    // !=			Not equal operator
    // <>			Not equal operator
    // NOT IN()		Check whether a value is not within a set of values
    // NOT LIKE		Negation of simple pattern matching

    const operators = {
      'BETWEEN': ['BETWEEN ? AND ?', 2],
      '=': ['= ?', 1],
      '<=>': ['<=> ?', 1],
      '>': ['> ?', 1],
      '>=': ['>= ?', 1],
      'IN': ['IN (?)', 1],
      'IS': ['IS ?', 1],
      'IS NOT': ['IS NOT ?', 1],
      'IS NOT NULL': ['IS NOT NULL', 0],
      'IS NULL': ['IS NULL', 0],
      '<': ['< ?', 1],
      '<=': ['<= ?', 1],
      'LIKE': ['LIKE ?', 1],
      'NOT BETWEEN': ['NOT BETWEEN ? AND ?', 2],
      '!=': ['!= ?', 1],
      '<>': ['<> ?', 1],
      'NOT IN': ['NOT IN (?)', 1],
      'NOT LIKE': ['NOT LIKE ?', 1],
    };

    // convert the operator to upper case
    operator = operator.toUpperCase().trim();

    // check if the operator is valid
    if (!(operator in operators)) {
      throw new Error("Unknown operator '" + operator + "'.");
    }
    let operatorData = operators[operator];

    // build an array of operands
    let operands = [];
    if (operand1 !== null) {
      operands.push(operand1);
      if (operand2 !== null) {
        operands.push(operand2);
      }
    }

    // check if we have enough operands
    if (operatorData[1] > operands.length) {
      throw new Error("Missing operands. Operator '" +
        operator + "' needs " + operatorData[1] + ' operand(s).');
    }

    // build the operator query
    return knex.raw(operatorData[0], operands).toString();
  };

  function buildWhereHasCallback(Model, relationName, callback = null,
    operator = null, operand1 = null, operand2 = null) {
    // Check if the relationName is string.
    if (!isString(relationName))
      throw new Error('Must pass a string for the relation name argument.');

    let whereHasCallback = async(q) => {
      // Build the withCount sub query.
      let subQuery = await withCountSubQuery(Model, Model.tableName,
        relationName, Model.tableName);

      // Check if the callback is a function and apply the callback.
      if (isFunction(callback)) callback(subQuery);

      // Fake sync sub query to trigger any plugins.
      subQuery = (await subQuery.fakeSync()).query;

      if (operator !== null) {
        // compose the operator string
        let operatorStr = composeOperator(operator, operand1, operand2);

        // count the subquery
        subQuery.count('*');

        // compare the subquery count with the operator
        q.whereRaw('(' + subQuery.toString() + ') ' + operatorStr);
      } else {
        // Attach the where exists query to this model.
        q.whereExists(subQuery);
      }
    };

    return whereHasCallback;
  }

  /**
   * Where statement on a related model count/existence with subQuery option.
   * @param {string} relationName Relation name by which we want to filter.
   * @param {function} [subQuery] This filter can be nested.
   * @param {string} [operator] Filter operator.
   * @param {numeric|string} [operand1] Filter operand1.
   * @param {numeric|string} [operand2] Filter operand2.
   */
  function whereHasTemplate(whereName) {
    return function(relationName, subQueryCallback = null,
      operator = null, operand1 = null, operand2 = null) {
      // Build the whereHas callback.
      let whereHasCallback = buildWhereHasCallback(this, relationName,
        subQueryCallback, operator, operand1, operand2);
      this[whereName](whereHasCallback);
      return this; // Chainable.
    };
  }

  commonExt.whereHas = whereHasTemplate('where');
  commonExt.andWhereHas = whereHasTemplate('andWhere');
  commonExt.orWhereHas = whereHasTemplate('orWhere');
  commonExt.whereNotHas = whereHasTemplate('whereNot');
  commonExt.andWhereNotHas = whereHasTemplate('andWhereNot');
  commonExt.orWhereNotHas = whereHasTemplate('orWhereNot');

  /**
   * Where statement on a related model count/existence.
   * @param {string} relationName Relation name by which we want to filter.
   * @param {string} [operator] Filter operator.
   * @param {numeric|string} [operand1] Filter operand1.
   * @param {numeric|string} [operand2] Filter operand2.
   */
  commonExt.has = function(relationName, operator = null,
    operand1 = null, operand2 = null) {
    if (isString(relationName)) {
      // Check if the relation exists on this model.
      // Split relation name by . (dots) to handle nested/sub relations.
      let tokens = relationName.split('.');

      // Check if we have at least one token.
      if (tokens.length < 1) throw new Error(`Invalid relation name '${relationName}' passed to the has function.`);

      // Pick the first relation name.
      let firstRelationName = tokens[0];

      // Check if the relation exists.
      if (!isFunction(this[firstRelationName]))
        return modelHas.apply(this, [relationName]);
    }

    return this.whereHas(relationName, null, operator, operand1, operand2);
  };

  function hasTemplate(whereHasName) {
    return function(relationName, operator = null,
      operand1 = null, operand2 = null) {
      return this[whereHasName](relationName, null,
        operator, operand1, operand2);
    };
  }

  commonExt.andHas = hasTemplate('andWhereHas');
  commonExt.orHas = hasTemplate('orWhereHas');
  commonExt.notHas = hasTemplate('whereNotHas');
  commonExt.andNotHas = hasTemplate('andWhereNotHas');
  commonExt.orNotHas = hasTemplate('orWhereNotHas');

  // ---------------------------------------------------------------------------
  // ------ Relation Helper ----------------------------------------------------
  // ---------------------------------------------------------------------------

  modelExt.resetQuery = function(...args) {
    let result = modelResetQuery.apply(this, args);
    // Reset this extension.
    this.resetEloquent();
    return result;
  };

  modelExt.toModel = function() {
    return this;
  };

  modelExt.tryGetRelation = function(relationName) {
    let relationCandidate = this[relationName];
    if (!isFunction(relationCandidate)) return null;
    let relation = relationCandidate.apply(this);
    return relation;
  };

  modelExt.getRelation = function(relationName) {
    let relation = this.tryGetRelation(relationName);
    if (relation != null) return relation;
    throw new Error('Relation ' + relationName +
      ' does not exist on this model (tableName = ' +
      knex.raw('??', [this.tableName]).toString() + ').');
  };

  modelExt.isModel = function() {
    return true;
  };

  modelExt.isCollection = function() {
    return false;
  };

  // ---------------------------------------------------------------------------
  // ------ Static Methods -----------------------------------------------------
  // ---------------------------------------------------------------------------

  let staticModelExt = {};
  // For each extension method we need a way to call it statically.
  for (let method in modelExt) {
    if (!modelExt.hasOwnProperty(method)) continue;
    if (method === 'delete') continue;
    staticModelExt[method] = function(...args) {
      return this.forge()[method](...args);
    };
  }

  for (let method in commonExt) {
    if (!commonExt.hasOwnProperty(method)) continue;
    staticModelExt[method] = function(...args) {
      return this.forge()[method](...args);
    };
  }

  let methodsToExposeOnStaticModel = ['orderBy'];
  for (let method of methodsToExposeOnStaticModel) {
    staticModelExt[method] = function(...args) {
      return this.forge()[method](...args);
    };
  }

  // ---------------------------------------------------------------------------
  // ------ Custom User Scope Filter -------------------------------------------
  // ---------------------------------------------------------------------------

  staticModelExt.scope = function(user) {
    let modelInstance = this.forge();
    if (!('scope' in modelInstance))
      throw new Error('Sorry, scope is not a function on this model.');
    if (!isFunction(modelInstance.scope))
      throw new Error('Sorry, scope is not a function on this model.');
    return modelInstance.scope(user);
  };

  // ---------------------------------------------------------------------------
  // ------ Bookshelf Modelbase Extension --------------------------------------
  // ---------------------------------------------------------------------------

  /**
   * Select a collection based on a query
   * @param {Object} [query]
   * @param {Object} [options] Options used of model.fetchAll
   * @return {Promise(bookshelf.Collection)} Bookshelf Collection of Models
   */
  staticModelExt.findAll = function(filter, options) {
    return this.forge().where(extend({}, filter)).fetchAll(options);
  };

  /**
   * Find a model based on it's ID
   * @param {String} id The model's ID
   * @param {Object} [options] Options used of model.fetch
   * @return {Promise(bookshelf.Model)}
   */
  staticModelExt.findById = function(id, options) {
    return this.findOne({[this.prototype.idAttribute]: id}, options);
  };

  /**
   * Select a model based on a query
   * @param {Object} [query]
   * @param {Object} [options] Options for model.fetch
   * @param {Boolean} [options.require=false]
   * @return {Promise(bookshelf.Model)}
   */
  staticModelExt.findOne = function(query, options) {
    options = extend({require: true}, options);
    return this.forge(query).fetch(options);
  };

  /**
   * Insert a model based on data
   * @param {Object} data
   * @param {Object} [options] Options for model.save
   * @return {Promise(bookshelf.Model)}
   */
  staticModelExt.create = function(data, options) {
    return this.forge(data).save(null, options);
  };

  /**
   * Update a model based on data
   * @param {Object} data
   * @param {Object} options Options for model.fetch and model.save
   * @param {String|Integer} options.id The id of the model to update
   * @param {Boolean} [options.patch=true]
   * @param {Boolean} [options.require=true]
   * @return {Promise(bookshelf.Model)}
   */
  staticModelExt.update = function(data, options) {
    options = extend({patch: true, require: true}, options);
    return this.forge({[this.prototype.idAttribute]: options.id}).fetch(options)
      .then(function(model) {
        return model ? model.save(data, options) : undefined;
      });
  };

  /**
   * Destroy a model by id
   * @param {Object} options
   * @param {String|Integer} options.id The id of the model to destroy
   * @param {Boolean} [options.require=false]
   * @return {Promise(bookshelf.Model)} empty model
   */
  staticModelExt.destroy = function(options) {
    options = extend({require: true}, options);
    return this.forge({[this.prototype.idAttribute]: options.id})
      .destroy(options);
  };

  /**
   * Synonym for destroy;
   */
  staticModelExt.delete = staticModelExt.destroy;

  // Delete all.

  staticModelExt.destroyAll = function(options) {
    return this.forge().where(this.prototype.idAttribute, '>=', 0)
      .destroy(options);
  };

  staticModelExt.deleteAll = staticModelExt.destroyAll;

  /**
   * Select a model based on data and insert if not found
   * @param {Object} data
   * @param {Object} [options] Options for model.fetch and model.save
   * @param {Object} [options.defaults] Defaults to apply to a create
   * @return {Promise(bookshelf.Model)} single Model
   */
  staticModelExt.findOrCreate = function(data, options) {
    return this.findOne(data, extend(options, {require: false}))
      .bind(this)
      .then(function(model) {
        let defaults = options && options.defaults;
        return model || this.create(extend(defaults, data), options);
      });
  };

  /**
   * Select a model based on data and update if found, insert if not found
   * @param {Object} selectData Data for select
   * @param {Object} updateData Data for update
   * @param {Object} [options] Options for model.save
   */
  staticModelExt.upsert = function(selectData, updateData, options) {
    let _this = this;
    return this.findOne(selectData, extend(options, {require: false}))
      .then(function(model) {
        return model ?
          model.save(updateData, extend({patch: true}, options)) :
          _this.create(extend(selectData, updateData), options);
      });
  };

  // Extend model knex query builder.
  modelExt._builder = function beBuilder(...args) {
    let result = modelKnexBuilder.apply(this, args);

    // Append bookshelf eloquent instance to the knex query builder.
    result.be = this;

    return result;
  };

  // Extend model query fn.
  modelExt.query = function beQuery(...args) {
    // Ensure the object has a query builder.
    if (!this._knex) {
      let tableName = result(this, 'tableName');
      this._knex = this._builder(tableName);
    }

    // Append bookshelf eloquent instance to the knex query builder.
    this._knex.be = this;

    return modelQuery.apply(this, args);
  };

  // Extend the model.
  Bookshelf.Model = Bookshelf.Model.extend(commonExt);
  Bookshelf.Model = Bookshelf.Model.extend(modelExt, staticModelExt);

  // ---------------------------------------------------------------------------
  // ------ Extend the Collection ----------------------------------------------
  // ---------------------------------------------------------------------------

  let collectionEloquentAdd = function(attrs, options) {
    // If attrs is an array then call add for each element.
    if (isArray(attrs)) {
      // Add all models to the collection.
      for (let model of attrs) this.add(model, options);
      // Return the whole collection.
      return this;
    } else {
      // Check if the model needs to be forged.
      let model = attrs;
      if (!modelProto.isPrototypeOf(model))
        // Forge the new model.
        model = this.model.forge(model, options);

      // Add this model to the collection.
      collectionAdd.apply(this, [model]);

      // Return this model.
      return model;
    }
  };

  let collectionExt = {
    constructor: function() {
      collectionProto.constructor.apply(this, arguments);

      this.resetEloquent();

      const options = arguments[1] || {};
      this.eloquent.caseSensitive = (options.caseSensitive === true);

      this.eloquent.collectionAddMemo = memo(collectionEloquentAdd, {
        normalizer: function(args) {
          // "args" is arguments object as accessible in memoized function.
          // NOTE: If the database collation is case insensitive then it is good to use toLowerCase().
          let data = args[0];
          let options = args[1] || {};
          if (options.unique != null)
            data = pick(data, options.unique);
          return JSON.stringify(data).toLowerCase();
        },
      });

      this.eloquent.collectionAddMemoCaseSensitive =
      memo(collectionEloquentAdd, {
        normalizer: function(args) {
          // "args" is arguments object as accessible in memoized function.
          // NOTE: If the database collation is case insensitive then it is good to use toLowerCase().
          let data = args[0];
          let options = args[1] || {};
          if (options.unique != null)
            data = pick(data, options.unique);
          return JSON.stringify(args[0]);
        },
      });
    },
  };

  /**
   * Look at the bookshelf documentation.
   */
  collectionExt.fetchOne = async function fetchOne(options) {
    // Attach options that were built by eloquent/this extension.
    options = await mergeOptions(this, options);

    // Call the original fetchOne function with eager load wrapper.
    return await fetchWithEagerLoad.apply(this, [collectionFetchOne, options]);
  };

  /**
   * Synonym for fetchOne.
   */
  collectionExt.first = collectionExt.fetchOne;

  /**
   * Synonym for fetch.
   * This one is a little bit tricky. Now it is also a synonym for fetchAll.
   * In eloquent function get() is similar to fetchAll() in bookshelf.
   * If the first parameter is a string we want to call the bookshelf get() function which gets an attribute.
   * Else we want to call the eloquent get() function which gets all result that match the built query.
   */
  collectionExt.get = function(...args) {
    // Get a model from a collection, specified by an id, a cid, or by passing in a model.
    if (args.length < 1) return this.fetch(...args);
    let obj = args[0];
    if ((obj == null) || isString(obj) || isNumber(obj) ||
      ('id' in obj) || ('cid' in obj)) return collectionGet.apply(this, args);
    return this.fetch(...args);
  };

  /**
   * Look at the bookshelf documentation.
   */
  collectionExt.fetch = async function fetch(options) {
    // Attach options that were built by eloquent/this extension.
    options = await mergeOptions(this, options);

    // Call the original fetchAll function with eager load wrapper.
    return await fetchWithEagerLoad.apply(this, [collectionFetch, options]);
  };

  /**
   * Look at the bookshelf documentation.
   */
  collectionExt.count = async function(column, options) {
    let args = [];
    if (!isString(column)) options = column;
    else args.push(column);

    // Attach options that were built by eloquent/this extension.
    options = await mergeOptions(this, options);
    args.push(options);

    // Call the original fetchAll function with eager load wrapper.
    return await collectionCount.apply(this, args);
  };

  // ---------------------------------------------------------------------------
  // ------ Add ----------------------------------------------------------------
  // ---------------------------------------------------------------------------

  /**
   * Similar to the add function but it returns the created model instead of the collection (it is not chainable).
   * @param {object} attrs Same as the model forge "attributes" parameter.
   * @param {object} options Same as the model forge options.
   */
  collectionExt.add = collectionEloquentAdd;

  /**
   * If we try to add another model with same "attrs" argument
   * it won't create a duplicate and will return the existing one.
   * @param {object} attrs Same as the model forge "attributes" parameter.
   * @param {object} options Same as the model forge options.
   */
  collectionExt.addMemo = function(attrs, options) {
    // If attrs is an array then call add for each element.
    if (isArray(attrs)) {
      // Add all models to the collection.
      for (let model of attrs) {
        if (this.eloquent.caseSensitive === true)
          this.eloquent.collectionAddMemoCaseSensitive
            .apply(this, [model, options]);
        else
          this.eloquent.collectionAddMemo.apply(this, [model, options]);
      }
      // Return the whole collection.
      return this;
    } else {
      if (this.eloquent.caseSensitive === true)
        return this.eloquent.collectionAddMemoCaseSensitive
          .apply(this, [attrs, options]);
      else
        return this.eloquent.collectionAddMemo.apply(this, [attrs, options]);
    }
  };

  // ---------------------------------------------------------------------------
  // ------ Bulk Insert --------------------------------------------------------
  // ---------------------------------------------------------------------------

  /**
   * NOTE: ! This function is similar to replace. When changing also check the replace function. !
   * Bulk insert. Inserts all the models in the collection to the database.
   * By setting the ignoreDuplicates parameter to true you skip inserting the rows with a duplicate uniq key.
   * TODO: maybe add the option for batch processing (it could happen that queries get too long when inserting lots of models)
   * @param {boolean} ignoreDuplicates
   */
  collectionExt.insert = function(ignoreDuplicates = false) {
    // Check if any model to insert at all.
    if (this.models.length <= 0)
      return Promise.all([]);

    // Build the knex query.
    let idAttribute = this.idAttribute();
    let data = this.models.map(function(model) { return model.attributes; });
    let knexQuery = knex.insert(data)
      .into(this.tableName()).returning(idAttribute);

    // Check if we should ignore duplicate rows/models.
    if (ignoreDuplicates) {
      // hack the toSQL function
      knexQuery._toSQLHack = knexQuery.toSQL;
      knexQuery.toSQL = function(...args) {
        // call the original toSQL function
        let sqlQuery = knexQuery._toSQLHack(...args);

        // check if this SQL query begins with an "insert"
        let sqlBegin = sqlQuery.sql.substring(0, 6).toLowerCase();
        if (sqlBegin !== 'insert')
          throw new Error('This SQL statement cannot have ' +
            "'on duplicate key update' appended. (\"" + sqlQuery.sql + '")');

        // modify the SQL query - add the "on duplicate key update"
        sqlQuery.sql = sqlQuery.sql + ' on duplicate key update ' +
          knex.raw('??=??', [idAttribute, idAttribute]).toString();

        // return the modified SQL query
        return sqlQuery;
      };
    }

    // Execute the bulk insert.
    return knexQuery
      .returning(idAttribute)
      .bind(this)
      .map(function(id, index) {
        // TODO: create a fallback or improvements for other databases (example: PostgreSQL)
        // If we bulk insert the rows without ignoring the duplicates we get back the first id.
        // We can calculate the ids for all the new models from the first id.
        if (!ignoreDuplicates && (index === 0) && Number.isInteger(id)) {
          for (let inx = 0; inx < this.length; inx++) {
            let model = this.at(inx);
            // Check if id was set before inserting.
            if (model.isNew()) {
              model.set(idAttribute, id);
              this._byId[id] = model;
              // increment the id
              id++;
            } else {
              if (model.id >= id) id = model.id + 1;
            }
          }
        }
      })
      .return(this);
  };

  /**
   * NOTE: ! This function is similar to insert. When changing also check the insert function. !
   * Bulk replace. Replaces all the models in the collection (rows in the database) where the unique key matches.
   * TODO: maybe add the option for batch processing (it could happen that queries get too long when inserting lots of models)
   */
  collectionExt.replace = function(ignoreDuplicates = false) {
    // Check if any model to insert at all.
    if (this.models.length <= 0)
      return Promise.all([]);

    // Build the knex query.
    let idAttribute = this.idAttribute();
    let data = this.models.map(function(model) { return model.attributes; });
    let knexQuery = knex.insert(data)
      .into(this.tableName()).returning(idAttribute);

    // Hack the toSQL function.
    // Change the SQL statement before it gets executed.
    knexQuery._toSQLHack = knexQuery.toSQL;
    knexQuery.toSQL = function(...args) {
      // call the original toSQL function
      let sqlQuery = knexQuery._toSQLHack(...args);

      // check if this SQL query begins with an "insert"
      let sqlBegin = sqlQuery.sql.substring(0, 6).toLowerCase();
      if (sqlBegin !== 'insert')
        throw new Error('This SQL statement cannot be changed ' +
          'to a replace statement. ("' + sqlQuery.sql + '")');

      // modify the SQL query - change the word "insert" into "replace"
      sqlQuery.sql = 'replace' + sqlQuery.sql.substr(6);

      // return the modified SQL query
      return sqlQuery;
    };

    // Execute the bulk insert.
    return knexQuery
      .returning(idAttribute)
      .bind(this)
      .map(function(id, index) {
        // TODO: create a fallback or improvements for other databases (example: PostgreSQL)
        // NOTE: Some rows get inserted, some get replaced.
        // There is no way to compute the primary (auto increment) keys of the inserted rows.
      })
      .return(this);
  };

  function arrayToObj(array, defaultValue = null) {
    if (!isArray(array)) return array;

    let obj = {};
    for (let element of array) {
      obj[element] = defaultValue;
    }
    return obj;
  }

  function objToArray(columns) {
    let array = [];
    for (let col in columns) {
      if (!columns.hasOwnProperty(col)) continue;
      array.push(col);
    }
    return array;
  }

  function detectColumnTypes(data, columns) {
    columns = arrayToObj(columns, 'String');
    for (let col in columns) {
      if (!columns.hasOwnProperty(col)) continue;
      for (let d of data) {
        let value = d[col];
        if (value == null) continue;
        if (isNumber(value)) columns[col] = 'Number';
        else if (isDate(value)) columns[col] = 'Date';
      }
    }
    return columns;
  }

  function serializeNumber(value) {
    if (value == null) return null;
    return Number(value);
  }

  function serializeDate(value) {
    if (value == null) return null;

    // Account for automatic timezone conversion.
    if (isString(value)) {
      let tz = at(knex, 'client.config.connection.timezone')[0];
      tz = tz || 'local';
      if (tz.trim() !== 'local') {
        let tokens = value.split(' ');
        tokens = tokens.filter((v) => { return (v.length > 0); });
        if (tokens.length < 2)
          value += ' 00:00:00';
        value = value + ' ' + tz;
      }
    }

    value = new Date(value);
    if (globalOptions.roundDateTime) {
      // Round to nearest second.
      let ms = value.getMilliseconds();
      if (ms >= 500) {
        value = new Date(value.getTime() + 1000);
      }
    }

    // Truncate to second.
    value.setMilliseconds(0);

    return value;
  }

  function serializeString(value, Model) {
    if (value == null) return null;
    value = String(value);

    // NOTE: if the collation is case insensitive the it is good to use toLowerCase()
    if (Model.eloquent.caseSensitive !== true)
      value = value.toLowerCase();

    return value;
  }

  function resolveSerializers(columns) {
    let obj = {};
    for (let col in columns) {
      if (!columns.hasOwnProperty(col)) continue;
      let val = columns[col];
      if (val === 'String') obj[col] = serializeString;
      else if (val === 'Number') obj[col] = serializeNumber;
      else if (val === 'Date') obj[col] = serializeDate;
      else obj[col] = val;
    }
    return obj;
  }

  function calcUniqueRowHash(row, serializers, Model) {
    // calculate the unique hash of this row
    let uniqValues = []; // at(row, uniqKeyAttrs);
    for (let col in serializers) {
      if (!serializers.hasOwnProperty(col)) continue;
      let value = at(row, [col])[0];
      // Type problem - when stuff gets saved to the database values get changed a bit
      // That is why the serializers get applied here.
      let serializer = serializers[col];
      value = serializer(value, Model);
      uniqValues.push(value);
    }
    return JSON.stringify(uniqValues);
  }

  /**
   * Select [selectAttrs] from the table by the [uniqKeyAttrs] instead of the default id.
   * Not really useful for anything else than being a helper function for insertBy.
   * NOTE: the sequence of [uniqKeyAttrs] is important and should be the same as on the unique key in the database for best performance.
   * @param {string|string[]} uniqKeyAttrs List of unique key attributes.
   * @param {string|string[]} selectAttrs List of attributes that you want to get from database.
   */
  collectionExt.selectBy = async function(uniqKeyAttrs = [], selectAttrs = []) {
    // validate arguments
    if (isString(uniqKeyAttrs)) uniqKeyAttrs = [uniqKeyAttrs];
    let uniqKeySerializers = arrayToObj(uniqKeyAttrs);
    uniqKeyAttrs = objToArray(uniqKeySerializers);
    if (!isPlainObject(uniqKeySerializers))
      throw new Error('Must pass an array, object or string for the ' +
        'uniqKeyAttrs argument.');
    if (uniqKeyAttrs.length < 1)
      throw new Error('The array of uniqKeyAttrs must be at ' +
        'least of length 1.');

    if (isString(selectAttrs)) selectAttrs = [selectAttrs];
    if (selectAttrs.constructor !== Array)
      throw new Error('Must pass an array or string for the ' +
        'selectAttrs argument.');

    // Get the list of all columns that will be used in the select.
    let idAttribute = this.idAttribute();
    let allColumns = union(uniqKeyAttrs, selectAttrs);

    // Check if allColumns contains a *
    for (let col of allColumns) {
      if (col.trim() === '*')
        allColumns = ['*'];
    }

    // build the knex query
    let knexQuery = knex.select(allColumns).from(this.tableName());

    // build the where statement and a model index
    let whereMap = new Map();
    let pathKeys = uniqKeyAttrs.slice(0);
    let leafColumn = pathKeys.pop();
    let index = new Map();

    // loop through all the models - group the models by non-leaf columns of the uniq key
    for (let model of this.models) {
      // get the non-leaf values and the leaf value
      let uniqPath = at(model.attributes, pathKeys);
      let leafValue = model.attributes[leafColumn];

      // calculate the uniq hash of this wherePath
      let uniqPathHash = JSON.stringify(uniqPath);

      // check if this uniq path already present in the whereMap
      if (!whereMap.has(uniqPathHash))
        whereMap.set(uniqPathHash, {path: uniqPath, values: new Set()});

      // insert the leaf value into the whereMap
      whereMap.get(uniqPathHash).values.add(leafValue);
    }

    // add the where statements to the query
    let first = true;
    for (let [key, wherePath] of whereMap) {
      // add the where statements for the path
      let subFirst = true;
      for (let i = 0; i < pathKeys.length; i++) {
        let column = pathKeys[i];
        let value = wherePath.path[i];
        if (subFirst && !first) knexQuery.orWhere(column, value);
        else knexQuery.where(column, value);
        subFirst =  false;
      }

      // add the whereIn statement for the leaf values
      let leafValues = Array.from(wherePath.values);
      if (subFirst && !first) knexQuery.orWhereIn(leafColumn, leafValues);
      else knexQuery.whereIn(leafColumn, leafValues);
      first = false;
    }

    // Execute the bulk select.
    let rows = await knexQuery;

    // Get all columns that need to have the type auto resolved.
    let autoTypeColumns = [];
    for (let col in uniqKeySerializers) {
      if (!uniqKeySerializers.hasOwnProperty(col)) continue;
      let val = uniqKeySerializers[col];
      if (isFunction(val)) continue;
      autoTypeColumns.push(col);
    }
    autoTypeColumns = detectColumnTypes(rows, autoTypeColumns);
    autoTypeColumns = resolveSerializers(autoTypeColumns);
    for (let col in autoTypeColumns) {
      if (!autoTypeColumns.hasOwnProperty(col)) continue;
      uniqKeySerializers[col] = autoTypeColumns[col];
    }

    for (let model of this.models) {
      // Index row by it's unique hash.
      let uniqHash = calcUniqueRowHash(model.attributes,
        uniqKeySerializers, this);

      // add the model to the index
      if (index.has(uniqHash))
        throw new Error('This collection has models with duplicate unique keys. ' +
          'SelectBy cannot be performed.');
      index.set(uniqHash, model);
    }

    for (let row of rows) {
      // Calculate unique row hash.
      let uniqHash = calcUniqueRowHash(row, uniqKeySerializers, this);

      // check if a model with this hash exists - sanity check
      if (!index.has(uniqHash))
        throw new Error('The SelectBy query somehow got a row ' +
          'back that was not even requested. You can solve this issue by ' +
          'implementing a custom column serializer.');

      // get the model to update
      let model = index.get(uniqHash);

      // update the model with the selected values
      model.set(row);

      // if the model idAttribute was also selected then we also need to update the _byId index
      if (idAttribute in row) {
        let id = row[idAttribute];
        this._byId[id] = model;
      }
    }

    return this;
  };

  /**
   * insertBy is a combination of insert and selectBy.
   *  - fisrt a selectBy is performed to ensure that we insert as little duplicates as possible (to keep the auto-increment down)
   * 	- then the insert with ignoreDuplicates = true is performed (only for the models we havent found in the database)
   * 	- finally another selectBy is done for the models that were just inserted to get their [returnAttrs]
   * NOTE: if the table's id attribute is missing in the [returnAttrs] it will be automatically added
   * @param {string|string[]} uniqKeyAttrs List of unique key attributes.
   * @param {string|string[]} returnAttrs List of attributes that you want to get from database.
   */
  collectionExt.insertBy = async function(uniqKeyAttrs = [], returnAttrs = []) {
    // validate arguments (uniqKeyAttrs will be validated by the selectBy function)
    if (isString(returnAttrs)) returnAttrs = [returnAttrs];
    if (returnAttrs.constructor !== Array)
      throw new Error('Must pass an array or string for ' +
        'the selectAttrs argument.');

    // get the tables id
    let idAttribute = this.idAttribute();

    // add the idAttribute to the returnAttrs - because we need the isNew() function on each model to work
    returnAttrs = union(returnAttrs, [idAttribute]);

    // Set all models to not new.
    for (let model of this.models) {
      model.id = null;
    }

    // first perform a selectBy to get the existing models
    let collection = await this.selectBy(uniqKeyAttrs, returnAttrs);

    // create a new collection for the models that need to be inserted
    let insertCollection = this.model.collection();

    // insert the models that are new into insertCollection
    for (let model of collection.models) {
      if (model.isNew()) insertCollection.add(model);
    }

    // if there are 0 models to insert the finish immediately
    if (insertCollection.length < 1)
      // return this - this function is chainable
      return this;

    // insert the models and ignore duplicates
    insertCollection = await insertCollection.insert(true);

    // after the models are inserted we have to get their returnAttrs
    insertCollection = await this.selectBy(uniqKeyAttrs, returnAttrs);

    // Check if all models were matched to their ids.
    for (let model of insertCollection.models) {
      if (model.isNew())
        throw new Error('Error reason 1: Ids of all models could not be retrieved. ' +
          'Values that you have inserted got distorted because they were ' +
          'too precise. Example: When DateTime is stored to the database the ' +
          'miliseconds could get rounded to the closest second. ' +
          'Please consider re-formatting such columns before inserting them ' +
          'to the database.\nError reason 2: A unique key possibly prevented the insertion of rows into the database.');
    }

    // finally return the original collection
    // return this - this function is chainable
    return this;
  };

  // ---------------------------------------------------------------------------
  // ------ Relation Helper ----------------------------------------------------
  // ---------------------------------------------------------------------------

  collectionExt.resetQuery = function(...args) {
    let result = collectionResetQuery.apply(this, args);
    // Reset this extension.
    this.resetEloquent();
    return result;
  };

  collectionExt.toModel = function() {
    let model = new this.model();
    model._knex = this.query().clone();
    model.eloquent = this.eloquent;
    this.resetQuery();
    if (this.relatedData) model.relatedData = this.relatedData;
    return model;
  };

  collectionExt.tryGetRelation = function(relationName) {
    let modelProto = new this.model;
    if (modelProto == null) return null;
    let relationCandidate = modelProto[relationName];
    if (!isFunction(relationCandidate)) return null;
    let relation = relationCandidate.apply(modelProto);
    return relation;
  };

  collectionExt.getRelation = function(relationName) {
    let relation = this.tryGetRelation(relationName);
    if (relation != null) return relation;
    throw new Error('Relation ' + relationName +
      ' does not exist on this model (tableName = ' +
      knex.raw('??', [this.tableName()]).toString() + ').');
  };

  collectionExt.isModel = function() {
    return false;
  };

  collectionExt.isCollection = function() {
    return true;
  };

  // Extend collection knex query builder.
  collectionExt._builder = function beBuilder(...args) {
    let result = collectionKnexBuilder.apply(this, args);

    // Append bookshelf eloquent instance to the knex query builder.
    result.be = this;

    return result;
  };

  // Extend collection query fn.
  collectionExt.query = function beQuery(...args) {
    // Ensure the object has a query builder.
    if (!this._knex) {
      let tableName = result(this, 'tableName');
      this._knex = this._builder(tableName);
    }

    // Append bookshelf eloquent instance to the knex query builder.
    this._knex.be = this;

    return collectionQuery.apply(this, args);
  };

  Bookshelf.Collection = Bookshelf.Collection.extend(commonExt);
  Bookshelf.Collection = Bookshelf.Collection.extend(collectionExt);
};
