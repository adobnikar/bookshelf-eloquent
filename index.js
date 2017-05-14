'use strict';

// xtend is a basic utility library which allows you to extend an object by appending all of the properties
// from each object in a list. When there are identical properties, the right-most property takes precedence.
const extend = require('xtend');
const memo = require('memoizee');

const _ = require('lodash');
const result = require('lodash/result');
const isString = require('lodash/isString');
const isArray = require('lodash/isArray');
const isFunction = require('lodash/isFunction');
const isPlainObject = require('lodash/isPlainObject');
const union = require('lodash/union');
const at = require('lodash/at');

// Eloquent plugin -
// Adds the functionality and function names of eloquent (like whereHas).
// -----
module.exports = function(Bookshelf) {
  const modelProto  = Bookshelf.Model.prototype;
  const collectionProto = Bookshelf.Collection.prototype;
  const knex = Bookshelf.knex;

  // Extract all methods that will be overridden.
  const modelGet = modelProto.get;
  const modelFetch = modelProto.fetch;
  const modelFetchAll = modelProto.fetchAll;
  const collectionAdd = collectionProto.add;

  // Build the extension object.
  let modelExt = {
    constructor: function() {
      modelProto.constructor.apply(this, arguments);
      const options = arguments[1] || {};
      this.caseSensitive = (options.caseSensitive === true);

      // Add eloquent settings.
      this.eloquent = {
        fetchOptions: {},
        withCountColumnsAsync: [],
        relationColumns: [],
        whereHasAsync: [],
        withs: {},
      };
    },
  };

  // ---------------------------------------------------------------------------
  // ------ Fake Sync ----------------------------------------------------------
  // ---------------------------------------------------------------------------

  modelExt.fakeSync = async function(options) {
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

  modelExt.buildQuery = async function(options) {
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

  modelExt.useTableAlias = function(alias) {
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
  };

  // ---------------------------------------------------------------------------
  // ------ Knex Where Methods -------------------------------------------------
  // ---------------------------------------------------------------------------

  // Attach existing "knex where methods" to the model.
  const whereMethods = ['whereNot', 'whereIn', 'whereNotIn',
    'whereNull', 'whereNotNull', 'whereExists', 'whereNotExists',
  ];
  for (let method of whereMethods) {
    modelExt[method] = function(...args) {
      return this.query(method, ...args);
    };
  }

  modelExt.whereLike = function(columnName, value) {
    return this.where(columnName, 'like', value);
  };

  modelExt.whereNotLike = function(columnName, value) {
    return this.where(columnName, 'not like', value);
  };

  // ---------------------------------------------------------------------------
  // ------ Knex OrWhere Methods -----------------------------------------------
  // ---------------------------------------------------------------------------

  modelExt.orWhere = function(...args) {
    return this.query('orWhere', ...args);
  };

  for (let method of whereMethods) {
    let orMethodName = 'or' + method.substr(0, 1).toUpperCase() +
      method.substr(1);
    modelExt[orMethodName] = function(...args) {
      return this.query(orMethodName, ...args);
    };
  }

  modelExt.orWhereLike = function(columnName, value) {
    return this.orWhere(columnName, 'like', value);
  };

  modelExt.orWhereNotLike = function(columnName, value) {
    return this.orWhere(columnName, 'not like', value);
  };

  // ---------------------------------------------------------------------------
  // ------ Knex Where Between Methods -----------------------------------------
  // ---------------------------------------------------------------------------

  const whereBetweenMethods = ['whereBetween', 'whereNotBetween',
    'orWhereBetween', 'orWhereNotBetween'];
  for (let method of whereBetweenMethods) {
    modelExt[method] = function(columnName, a, b) {
      if (isArray(a)) return this.query(method, columnName, a);
      else return this.query(method, columnName, [a, b]);
    };
  }

  // ---------------------------------------------------------------------------
  // ------ Select, Delete, First, Get -----------------------------------------
  // ---------------------------------------------------------------------------

  /**
   * Helper function that helps to merge the default bookshelf fetch
   * options parameter with the options that are built by this extension.
   * @param {object} eloquent
   * @param {object} options
   */
  async function mergeOptions(instance, options) {
    let eloquent = instance.eloquent;
    let fetchOptions = eloquent.fetchOptions;

    // WhereHas tasks.
    await Promise.all(eloquent.whereHasAsync);

    // WithCount tasks.
    let withCountColumns = [];
    for (let withCountTask of eloquent.withCountColumnsAsync) {
      let result = await withCountTask;
      withCountColumns.push(result.query);
    }

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
  modelExt.select = function(attrs) {
    // If parameter attrs is not an array the wrap it into an array.
    if (!isArray(attrs)) attrs = [attrs];

    // Set or replace the columns array.
    this.eloquent.fetchOptions.columns = attrs;

    return this;
  };

  /**
   * Synonym for destroy.
   */
  modelExt.delete = function() {
    return this.destroy();
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

  // ---------------------------------------------------------------------------
  // ------ Bookshelf Paranoia Support -----------------------------------------
  // ---------------------------------------------------------------------------

  modelExt.withDeleted = function() {
    // Retrieve with soft deleted rows.
    this.eloquent.fetchOptions.withDeleted = true;
    // Chainable.
    return this;
  };

  /**
   * Synonym for withDeleted.
   */
  modelExt.withTrashed = modelExt.withDeleted;

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
    for (let withRelationName in this.eloquent.withs) {
      // get the relatedData
      let withRelation = this.eloquent.withs[withRelationName];
      let relatedData = withRelation.relation.relatedData;

      // Check if parent ids required.
      if ((ids === null) && ((relatedData.type === 'belongsToMany') ||
        (relatedData.type === 'hasMany'))) {
        // Load ids.
        ids = [];
        // extract the model id for each model
        for (let model of collection.models) {
          if (!(this.idAttribute in model.attributes))
            throw new Error('Failed to eager load the "' + withRelationName +
              '" relation of the "' + this.tableName +
              '" model. If you want to eager load a hasMany or ' +
              'belongsToMany relation of a model then the model ' +
              'needs to have it\'s id column selected.');

          // push the model.id into the collection of ids
          ids.push(model.attributes[this.idAttribute]);
        }
      }

      // Apply the relation constraint
      switch (relatedData.type)	{
        case 'belongsToMany':
          loadRelationTasks.push(eagerLoadBelongsToManyRelation.apply(this,
            [ids, collection, withRelationName]));
          break;
        case 'hasMany':
          loadRelationTasks.push(eagerLoadHasManyRelation.apply(this,
            [ids, collection, withRelationName]));
          break;
        case 'belongsTo':
          loadRelationTasks.push(eagerLoadBelongsToRelation.apply(this,
            [collection, withRelationName]));
          break;
        default:
          throw new Error('Failed to eager load the "' + withRelationName +
            '" relation of the "' + this.tableName +
            '" model. Relation type ' + relatedData.type +
            ' not supported/implemented for the with statement.');
      }
    }

    // Wait for all tasks to complete.
    await Promise.all(loadRelationTasks);

    // Return the result.
    return localUnwrap(collection, isSingle);
  };

  async function eagerLoadBelongsToManyRelation(ids, collection,
    withRelationName) {
    let withRelation = this.eloquent.withs[withRelationName];

    // get the relation, relatedData and relatedQuery
    let relation = withRelation.relation;
    let relatedData = relation.relatedData;
    let relatedQuery = withRelation.query;

    // get the columns
    let relatedFkAttribute = relatedData.foreignKey;
    let relatedIdAttribute = relatedQuery.idAttribute;

    // build the pivot table query
    let pivotQuery = knex.select([relatedData.foreignKey, relatedData.otherKey])
      .from(relatedData.joinTableName).whereIn(relatedData.foreignKey, ids);

    // fetch from pivot table
    let pivotRows = await pivotQuery;

    // build foreignKey and otherKey indexes
    let foreignKeyIndex = new Map();
    let otherKeySet = new Set();
    for (let pivotRow of pivotRows) {
      let foreignKeyValue = pivotRow[relatedData.foreignKey];
      if (foreignKeyValue === null) continue;
      let otherKeyValue = pivotRow[relatedData.otherKey];
      if (otherKeyValue === null) continue;
      if (!foreignKeyIndex.has(foreignKeyValue))
        foreignKeyIndex.set(foreignKeyValue, []);
      foreignKeyIndex.get(foreignKeyValue).push(otherKeyValue);
      otherKeySet.add(otherKeyValue);
    }

    // apply the whereIn constraint to the relatedQuery
    relatedQuery.eloquent.relationColumns.push(relatedIdAttribute);
    relatedQuery.whereIn(relatedIdAttribute, Array.from(otherKeySet));

    // fetch from related table
    let relatedModels = await relatedQuery.get();

    // index the relatedModels by their ids
    let relatedModelIndex = new Map();
    for (let relatedModel of relatedModels.models) {
      if (!(relatedIdAttribute in relatedModel.attributes))
        throw new Error('Failed to eager load the "' + withRelationName +
              '" relation of the "' + this.tableName +
              '" model. If you want to eager load a belongsToMany ' +
              'relation of a model then the related model ' +
              'needs to have the id column selected. ' +
              'Please add the "' + relatedIdAttribute +
              '" column to the select statement.');
      let relatedIdValue = relatedModel.attributes[relatedIdAttribute];

      // insert the related model into the index
      relatedModelIndex.set(relatedIdValue, relatedModel);
    }

    // attach the relatedModels to the model(s)
    for (let model of collection.models) {
      let rModels = [];
      let rById = {};

      let relatedIdsList = [];
      let modelId = model.attributes[this.idAttribute];
      if (foreignKeyIndex.has(modelId))
        relatedIdsList = foreignKeyIndex.get(modelId);

      for (let relatedId of relatedIdsList) {
        if (!relatedModelIndex.has(relatedId)) continue;
        // Resule the related model.
        let relatedModel = relatedModelIndex.get(relatedId);
        // Add the model to the collection.
        rModels.push(relatedModel);
        if (relatedIdAttribute in relatedModel.attributes)
          rById[relatedModel.attributes[relatedIdAttribute]] = relatedModel;
        rById[relatedModel.cid] = relatedModel;
      }

      // add the relation
      let newRelation = this[withRelationName]();
      newRelation.models = rModels;
      newRelation._byId = rById;
      newRelation.length = rModels.length;

      // relations attribute should already exist on each model
      model.relations[withRelationName] = newRelation;
    }
  };

  async function eagerLoadHasManyRelation(ids, collection, withRelationName) {
    let withRelation = this.eloquent.withs[withRelationName];

    // get the relation, relatedData and relatedQuery
    let relation = withRelation.relation;
    let relatedData = relation.relatedData;
    let relatedQuery = withRelation.query;

    // get the columns
    let relatedFkAttribute = relatedData.foreignKey;
    let relatedIdAttribute = relatedQuery.idAttribute;

    // apply the whereIn constraint to the relatedQuery
    relatedQuery.whereIn(relatedFkAttribute, ids);

    // fetch from related table
    relatedQuery.eloquent.relationColumns.push(relatedFkAttribute);
    let relatedModels = await relatedQuery.get();
    // build foreignKey and otherKey indexes
    let foreignKeyIndex = new Map();
    for (let relatedModel of relatedModels.models) {
      if (!(relatedFkAttribute in relatedModel.attributes))
        throw new Error('Failed to eager load the "' + withRelationName +
              '" relation of the "' + this.tableName +
              '" model. If you want to eager load a hasMany ' +
              'relation of a model then it\'s related model ' +
              'needs to have the foreign key column selected. ' +
              'Please add the "' + relatedFkAttribute +
              '" column to the select statement.');

      let foreignKeyValue = relatedModel.attributes[relatedFkAttribute];
      if (foreignKeyValue === null) continue;
      if (!foreignKeyIndex.has(foreignKeyValue))
        foreignKeyIndex.set(foreignKeyValue, []);

      foreignKeyIndex.get(foreignKeyValue).push(relatedModel);
    }

    // attach the relatedModels to the model(s)
    for (let model of collection.models) {
      let rModels = [];
      let rById = {};

      let modelId = model.attributes[this.idAttribute];
      if (foreignKeyIndex.has(modelId))
        rModels = foreignKeyIndex.get(modelId);

      for (let relatedModel of rModels) {
        if (relatedIdAttribute in relatedModel.attributes)
          rById[relatedModel.attributes[relatedIdAttribute]] = relatedModel;
        rById[relatedModel.cid] = relatedModel;
      }

      // add the relation
      let newRelation = this[withRelationName]();
      newRelation.models = rModels;
      newRelation._byId = rById;
      newRelation.length = rModels.length;

      // relations attribute should already exist on each model
      model.relations[withRelationName] = newRelation;
    }
  };

  async function eagerLoadBelongsToRelation(collection, withRelationName) {
    let withRelation = this.eloquent.withs[withRelationName];

    // get the relation, relatedData and relatedQuery
    let relation = withRelation.relation;
    let relatedData = relation.relatedData;
    let relatedQuery = withRelation.query;

    // get the columns
    let relatedFkAttribute = relatedData.foreignKey;
    let relatedIdAttribute = relatedQuery.idAttribute;

    // build the fk ids array
    let fkIds = new Set();

    // extract the foreignKey for each model
    for (let model of collection.models) {
      if (!(relatedFkAttribute in model.attributes))
        throw new Error('Failed to eager load the "' + withRelationName +
              '" relation of the "' + this.tableName +
              '" model. If you want to eager load a belongsTo ' +
              'relation of a model then the model ' +
              'needs to have the foreign key column selected. ' +
              'Please add the "' + relatedFkAttribute +
              '" column to the select statement.');

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
    for (let model of collection.models) {
      // add/create the relation
      let newRelation = this[withRelationName]();

      // set the relation to be null by default
      model.attributes[withRelationName] = null;

      if (model.attributes[relatedFkAttribute] === null) continue;
      let relatedId = model.attributes[relatedFkAttribute];

      if (!relatedModelIndex.has(relatedId)) continue;
      let relatedModel = relatedModelIndex.get(relatedId);

      // copy over all own properties
      for (var property in relatedModel) {
        if (!relatedModel.hasOwnProperty(property)) continue;
        newRelation[property] = relatedModel[property];
      }

      // relations attribute should already exist on each model
      model.relations[withRelationName] = newRelation;
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

  /**
   * @param {object|string|string[]} relationNames An object where keys are relation names and values are subquery functions or null.
   * Can also be a single relations name or an array of relation names.
   * @param {function} [signleRelationSubquery] Only takes effect if the "relationNames" is a single relation name (string).
   */
  modelExt.with = function(relationNames, signleRelationSubquery = null) {
    // Validate arguments.
    // withRelated is an object where keys are relation names and values are callback functions or null
    let withRelated = formatWiths(relationNames, signleRelationSubquery);

    // Prepare all relations.
    for (let relationName in withRelated) {
      if (!withRelated.hasOwnProperty(relationName)) continue;

      // Check if the relationName is string.
      if (!isString(relationName))
        throw new Error('Must pass an object, string or an array of strings ' +
          'for the relationNames argument.');

      // Split relation name by . (dots) to handle nested/sub relations.
      let tokens = relationName.split('.');

      // Check if we have at least one token.
      if (tokens.length < 1) throw new Error('Invalid relation name.');

      // Pick the first relation name.
      let firstRelationName = tokens[0];

      // Check if the relation exists.
      if (!(firstRelationName in this))
        // TODO: make this error find the model name from the bookshelf registry plugin (instead of the tableName)
        throw new Error('Relation ' + firstRelationName +
          ' does not exist on this model (tableName = ' +
          knex.raw('??', [this.tableName]).toString() + ').');

      // Get the relation data.
      let relation = this[firstRelationName]();
      let relatedData = relation.relatedData;

      // Check if this relation already exists in the withs => if not then create a new related query.
      if (!(firstRelationName in this.eloquent.withs)) {
        // Check if this is a supported relation
        if ((relatedData.type !== 'belongsToMany') &&
          (relatedData.type !== 'belongsTo') &&
          (relatedData.type !== 'hasMany'))
          throw new Error('Relation type ' + relatedData.type +
            ' not supported/implemented for the with statement.');

        // Forge the related model/query.
        let relatedModel = relatedData.target.forge();

        // Add this relation to the withs.
        this.eloquent.withs[firstRelationName] = {
          query: relatedModel,
          relation: relation,
        };
      }

      // Get the related query.
      let relatedQuery = this.eloquent.withs[firstRelationName].query;

      // Get the callback.
      let callback = withRelated[relationName];

      // Check if tihs is the leaf relation/token.
      if (tokens.length > 1) {
        // This is not the leaf relation/token => pass the callback to the next relation/token
        // remove the firs token from tokens and join the tokens together into a subRelationName
        tokens.shift();
        let subRelationName = tokens.join('.');

        // Pass the callback to the next relation/token.
        relatedQuery.with(subRelationName, callback);
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
  modelExt.withSelect = function(relationName, attrs, subquery = null) {
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
    let relation = Model[firstRelationName]();
    let relatedData = relation.relatedData;

    // Forge the related/sub model/query.
    let subModel = relatedData.target.forge();
    let bookQuery = subModel;

    // Apply the relation constraint.
    switch (relatedData.type)	{
      case 'belongsToMany':
        // HasMany part.
        if (isString(subquery))
          subquery = knex.raw('(??.??)', [subquery, Model.idAttribute]);
        else subquery = subquery.select(Model.idAttribute);

        // Pivot table part.
        subquery = knex.select(relatedData.otherKey)
          .from(relatedData.joinTableName)
          .whereIn(relatedData.foreignKey, subquery);

        // BelongsTo part.
        bookQuery.whereIn(subModel.idAttribute, subquery);
        break;
      case 'hasMany':
        if (isString(subquery))
          subquery = knex.raw('(??.??)', [subquery, Model.idAttribute]);
        else subquery = subquery.select(Model.idAttribute);
        bookQuery.whereIn(relatedData.foreignKey, subquery);
        break;
      case 'belongsTo':
        if (isString(subquery))
          subquery = knex.raw('??.??', [subquery, relatedData.foreignKey]);
        else subquery = subquery.select(relatedData.foreignKey);
        bookQuery.whereIn(subModel.idAttribute, subquery);
        break;
      default:
        throw new Error('Failed to eager load the "' + firstRelationName +
          '" relation of the "' + Model.tableName +
          '" model. Relation type ' + relatedData.type +
          ' not supported/implemented for the withCount statement.');
    }

    // Handle circular relations. Set alias when there is a table name collision.
    if (bookQuery.tableName === baseTableName)
      bookQuery.useTableAlias(('t' === baseTableName) ? 't1' : 't');

    if (tokens.length < 1) return bookQuery;
    else {
      let syncSubquery = (await bookQuery.fakeSync()).query;
      return withCountSubQuery(subModel, syncSubquery, subPath, baseTableName);
    }
  }

  /**
   * @param {object|string|string[]} relationNames An object where keys are relation names and values are subquery functions or null.
   * Can also be a single relations name or an array of relation names.
   * @param {function} [signleRelationSubquery] If the "relationNames" parameter is a string you can pass the callback to this parameter.
   */
  modelExt.withCount = function(relationNames, signleRelationSubquery = null) {
    // Validate arguments.
    // withRelated is an object where keys are relation names and values are callback functions or null
    let withRelated = formatWiths(relationNames, signleRelationSubquery);

    // Loop through all the relation names. Build the select queries.
    for (let relationPath in withRelated) {
      if (!withRelated.hasOwnProperty(relationPath)) continue;

      // Check if the relationName is string.
      if (!isString(relationPath))
        throw new Error('Must pass an object, string or an array of strings ' +
          'for the relationNames argument.');

      // Get the callback.
      let callback = withRelated[relationPath];

      // Async wrapper.
      let withCountSubQueryTask = (async(Model, relationPath, callback) => {
        // Build the withCount sub query.
        let subQuery = await withCountSubQuery(Model, Model.tableName,
          relationPath, Model.tableName);

        // Build the alias.
        let tokens = relationPath.split('.');
        for (let i = 1; i < tokens.length; i++) {
          let token = tokens[i];
          token = token.substr(0, 1).toUpperCase() + token.substr(1);
          tokens[i] = token;
        }
        tokens.push('Count');

        // Check if the callback is a function and apply the callback.
        if (isFunction(callback)) callback(subQuery);

        // Add to select
        subQuery = (await subQuery.fakeSync())
          .query.count('*').as(tokens.join(''));

        // Wrap the result into an object to prevent execution on await.
        return {query: subQuery};
      })(this, relationPath, callback);

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

  /**
   * Where statement on a related model.
   * @param {string} relationName Relation name by which we want to filter.
   * @param {function} [subQuery] This filter can be nested.
   * @param {string} [operator] Filter operator.
   * @param {numeric|string} [operand1] Filter operand1.
   * @param {numeric|string} [operand2] Filter operand2.
   */
  modelExt.whereHas = function(relationName, subQuery = null,
    operator = null, operand1 = null, operand2 = null) {
    // Check if the relationName is string.
    if (!isString(relationName))
      throw new Error('Must pass a string for the relation name argument.');

    // Async wrapper.
    let whereHasSubQueryTask = (async(Model, relationName, callback,
      operator = null, operand1 = null, operand2 = null) => {
      // Build the withCount sub query.
      let subQuery = await withCountSubQuery(Model, Model.tableName,
        relationName, Model.tableName);

      // Check if the callback is a function and apply the callback.
      if (isFunction(callback)) callback(subQuery);

      // Fake sync sub query to trigger any plugins.
      subQuery = (await subQuery.fakeSync()).query;

      if (operator !== null) {
        // compose the operator string
        let operatorStr = composeOperator(knex, operator, operand1, operand2);

        // count the subquery
        subQuery.count('*');

        // compare the subquery count with the operator
        Model.query()
          .whereRaw('(' + subQuery.toString() + ') ' + operatorStr);
      } else {
        // Attach the where exists query to this model.
        Model.query().whereExists(subQuery);
      }
    })(this, relationName, subQuery, operator, operand1, operand2);

    // Push the task to the whereHas array.
    this.eloquent.whereHasAsync.push(whereHasSubQueryTask);

    // Chainable.
    return this;
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

  // Extend the model.
  Bookshelf.Model = Bookshelf.Model.extend(modelExt, staticModelExt);

  // ---------------------------------------------------------------------------
  // ------ Extend the Collection ----------------------------------------------
  // ---------------------------------------------------------------------------

  let collectionExt = {};

  // ---------------------------------------------------------------------------
  // ------ Add ----------------------------------------------------------------
  // ---------------------------------------------------------------------------

  /**
   * Similar to the add function but it returns the created model instead of the collection (it is not chainable).
   * @param {object} attrs Same as the model forge "attributes" parameter.
   * @param {object} options Same as the model forge options.
   */
  collectionExt.add = function(attrs, options) {
    // If attrs is an array then call add for each element.
    if (isArray(attrs)) {
      // Add all models to the collection.
      for (let model of attrs) this.add(model, options);
      // Return the whole collection.
      return this;
    } else {
      // Forge the new model.
      let model = this.model.forge(attrs, options);

      // Add this model to the collection.
      collectionAdd.apply(this, [model]);

      // Return this model.
      return model;
    }
  };

  const collectionAddMemo = memo(collectionExt.add, {
    length: 1,
    normalizer: function(args) {
      // "args" is arguments object as accessible in memoized function.
      // NOTE: If the database collation is case insensitive then it is good to use toLowerCase().
      // TODO: test this if
      if (this.model.caseSensitive === true) return JSON.stringify(args[0]);
      else return JSON.stringify(args[0]).toLowerCase();
    },
  });

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
      for (let model of attrs) collectionAddMemo.apply(this, [model, options]);
      // Return the whole collection.
      return this;
    } else collectionAddMemo.apply(this, [attrs, options]);
  };

  // ---------------------------------------------------------------------------
  // ------ Bulk Insert --------------------------------------------------------
  // ---------------------------------------------------------------------------

  /**
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
            model.set(idAttribute, id);
            this._byId[id] = model;
            // increment the id
            id++;
          }
        }
      })
      .return(this);
  };

  /**
   * Select [selectAttrs] from the table by the [uniqKeyAttrs] instead of the default id.
   * Not really useful for anything else than being a helper function for insertBy.
   * NOTE: the sequence of [uniqKeyAttrs] is important and should be the same as on the unique key in the database for best performance.
   * @param {string|string[]} uniqKeyAttrs List of unique key attributes.
   * @param {string|string[]} selectAttrs List of attributes that you want to get from database.
   */
  collectionExt.selectBy = function(uniqKeyAttrs = [], selectAttrs = []) {
    // validate arguments
    if (isString(uniqKeyAttrs)) uniqKeyAttrs = [uniqKeyAttrs];
    if (uniqKeyAttrs.constructor !== Array)
      throw new Error('Must pass an array or string for the ' +
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
      let uniqValues = uniqPath.slice(0);
      uniqValues.push(leafValue);

      // calculate the uniq hash of this wherePath
      let uniqPathHash = JSON.stringify(uniqPath);
      // NOTE: if the collation is case insensitive the it is good to use toLowerCase()
      let uniqHash = JSON.stringify(uniqValues);
      // TODO: test this if
      if (this.model.caseSensitive !== true) uniqHash = uniqHash.toLowerCase();

      // add the model to the index
      if (index.has(uniqHash))
        throw new Error('This collection has models duplicate unique keys. ' +
          'SelectBy cannot be performed.');
      index.set(uniqHash, model);

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

    // execute the bulk select
    return knexQuery
      .bind(this)
      .map(function(row) {
        // calculate the unique hash of this row
        let uniqValues = at(row, uniqKeyAttrs);
        // NOTE: If the collation is case insensitive the it is good to use toLowerCase().
        let uniqHash = JSON.stringify(uniqValues);
        // TODO: test this if
        if (this.model.caseSensitive !== true)
          uniqHash = uniqHash.toLowerCase();

        // check if a model with this hash exists - sanity check
        if (!index.has(uniqHash))
          throw new Error('The SelectBy query somehow got a row ' +
            'back that was not even requested.');

        // get the model to update
        let model = index.get(uniqHash);

        // update the model with the selected values
        model.set(row);

        // if the model idAttribute was also selected then we also need to update the _byId index
        if (idAttribute in row) {
          let id = row[idAttribute];
          this._byId[id] = model;
        }
      })
      .return(this);
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
  collectionExt.insertBy = function(uniqKeyAttrs = [], returnAttrs = []) {
    // validate arguments (uniqKeyAttrs will be validated by the selectBy function)
    if (isString(returnAttrs)) returnAttrs = [returnAttrs];
    if (returnAttrs.constructor !== Array)
      throw new Error('Must pass an array or string for ' +
        'the selectAttrs argument.');

    // get the tables id
    let idAttribute = this.idAttribute();

    // add the idAttribute to the returnAttrs - because we need the isNew() function on each model to work
    returnAttrs = union(returnAttrs, [idAttribute]);

    // first perform a selectBy to get the existing models
    return this.selectBy(uniqKeyAttrs, returnAttrs).then(function(collection) {
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
      return insertCollection.insert(true).then(function(insertCollection) {
        // after the models are inserted we have to get their returnAttrs
        return this.selectBy(uniqKeyAttrs, returnAttrs)
          .then(function(insertCollection) {
            // finally return the original collection
            // return this - this function is chainable
            return this;
          });
      });
    });
  };

  Bookshelf.Collection = Bookshelf.Collection.extend(collectionExt);
};
