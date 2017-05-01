'use strict';

// xtend is a basic utility library which allows you to extend an object by appending all of the properties
// from each object in a list. When there are identical properties, the right-most property takes precedence.
const extend = require('xtend');
const isString = require('lodash/isString');
const isArray = require('lodash/isArray');
const isFunction = require('lodash/isFunction');

// Eloquent plugin -
// Adds the functionality and function names of eloquent (like whereHas).
// -----
module.exports = function(Bookshelf) {
  const proto  = Bookshelf.Model.prototype;
  const knex = Bookshelf.knex;

  // Extract all methods that will be overridden.
  const modelGet = proto.get;
  const modelFetch = proto.fetch;
  const modelFetchAll = proto.fetchAll;

  // Build the extension object.
  let modelExt = {
    eloquent: {
      fetchOptions: {},
      withCountColumns: [],
      withs: {},
    },
  };

  // ---------------------------------------------------------------------------
  // ------ Knex Where Methods -------------------------------------------------
  // ---------------------------------------------------------------------------

  // Attach existing "knex where methods" to the model.
  const whereMethods = ['orWhere', 'whereNot', 'whereIn', 'whereNotIn',
    'whereNull', 'whereNotNull', 'whereExists', 'whereNotExists',
    'whereBetween', 'whereNotBetween',
  ];
  for (let method of whereMethods)
    modelExt[method] = (...args) => { return this.query(method, ...args); };

  // ---------------------------------------------------------------------------
  // ------ Select, Delete, First, Get -----------------------------------------
  // ---------------------------------------------------------------------------

  /**
   * Helper function that helps to merge the default bookshelf fetch
   * options parameter with the options that are built by this extension.
   * @param {object} eloquent
   * @param {object} options
   */
  function mergeOptions(eloquent, options) {
    let withCountColumns = eloquent.withCountColumns;
    let fetchOptions = eloquent.fetchOptions;

    // copy any columns from withCountColumns to fetchOptions
    if (withCountColumns.length > 0)	{
      // check if any columns already in the fetchOptions
      if (!('columns' in fetchOptions)) {
        // TODO: test if *, ... works. If it works the error can be removed.
        // throw new Error('Please define which columns you want to select. This is probably required because you are using the withCount statement.');
        fetchOptions.columns = ['*'];
      }

      // copy the columns
      for (let column of withCountColumns) {
        fetchOptions.columns.push(column);
      }
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
   * Synonym for fetch.
   */
  modelExt.first = function(...args) {
    return this.fetch(...args);
  };

  /**
   * Look at the bookshelf documentation.
   */
  modelExt.fetch = function fetch(options) {
    // Attach options that were built by eloquent/this extension.
    options = mergeOptions(this.eloquent, options);

    // Call the original fetch function with eager load wrapper.
    return fetchWithEagerLoad.apply(this, [modelFetch, options]);
  };

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
  modelExt.fetchAll = function fetchAll(options) {
    // Attach options that were built by eloquent/this extension.
    options = mergeOptions(this.eloquent, options);

    // Call the original fetchAll function with eager load wrapper.
    return fetchWithEagerLoad.apply(this, [modelFetchAll, options]);
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
  modelExt.withTrashed = function() {
    // Retrieve with soft deleted rows.
    this.eloquent.fetchOptions.withDeleted = true;
    // Chainable.
    return this;
  };

  // ---------------------------------------------------------------------------
  // ------ Eager Loading ------------------------------------------------------
  // ---------------------------------------------------------------------------

  async function fetchWithEagerLoad(fetchFunction, options) {
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
    let withsCount = Object.keys(this.withs).length;
    if ((collection.models.length < 1) || (withsCount < 1))
      // no need to get the with relations => just return the result
      return localUnwrap(collection, isSingle);

    // build the ids array
    let ids = [];

    // extract the model id for each model
    for (let model of collection.models) {
      if (!(this.idAttribute in model.attributes)) {
        throw new Error('If you want to perform a with statement on a model ' +
          'then its id needs to be selected.');
      }

      // push the model.id into the collection of ids
      ids.push(model.attributes[this.idAttribute]);
    }

    // fetch all withs
    let loadRelationTasks = [];
    for (let withRelationName in this.withs) {
      loadRelationTasks.push(eagerLoadRelation.apply(this,
        [ids, collection, withRelationName]));
    }

    // Wait for all tasks to complete.
    await Promise.all(loadRelationTasks);

    // Return the result.
    return localUnwrap(collection, isSingle);
  };

  async function eagerLoadRelation(ids, collection, withRelationName) {
    // get the relatedData
    let withRelation = this.withs[withRelationName];
    let relatedData = withRelation.relation.relatedData;

    // Apply the relation constraint
    switch (relatedData.type)	{
      case 'belongsToMany':
        await eagerLoadBelongsToManyRelation.apply(this,
          [ids, collection, withRelationName]);
        break;
      case 'hasMany':
        await eagerLoadHasManyRelation.apply(this,
          [ids, collection, withRelationName]);
        break;
      case 'belongsTo':
        await eagerLoadBelongsToRelation.apply(this,
          [ids, collection, withRelationName]);
        break;
      default:
        throw new Error('Relation type ' + relatedData.type +
          ' not supported/implemented for the with statement.');
    }
  };

  async function eagerLoadBelongsToManyRelation(ids, collection,
    withRelationName) {
    let withRelation = this.withs[withRelationName];

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
    let foreignKeyIndex = {};
    let otherKeyIndex = {};
    for (let pivotRow of pivotRows) {
      let foreignKeyValue = pivotRow[relatedData.foreignKey];
      let otherKeyValue = pivotRow[relatedData.otherKey];
      if (!(foreignKeyValue in foreignKeyIndex)) {
        foreignKeyIndex[foreignKeyValue] = [];
      }
      foreignKeyIndex[foreignKeyValue].push(otherKeyValue);
      otherKeyIndex[otherKeyValue] = 13;
    }

    // extract opther ids
    let otherIds = Object.keys(otherKeyIndex);

    // apply the whereIn constraint to the relatedQuery
    relatedQuery.whereIn(relatedQuery.idAttribute, otherIds);

    // fetch from related table
    let relatedModels = await relatedQuery.get();

    // index the relatedModels by their ids
    let relatedModelIndex = {};
    for (let relatedModel of relatedModels.models) {
      if (!(relatedIdAttribute in relatedModel.attributes)) {
        throw new Error('If you want to perform a with statement ' +
          'on a related model then its id needs to be selected.');
      }

      // insert the related model into the index
      relatedModelIndex[relatedModel.attributes[relatedIdAttribute]] =
        relatedModel;
    }

    // attach the relatedModels to the model(s)
    for (let model of collection.models) {
      let rModels = [];
      let rById = {};

      let relatedIdsList = [];
      let modelId = model.attributes[this.idAttribute];
      if (modelId in foreignKeyIndex) {
        relatedIdsList = foreignKeyIndex[modelId];
      }

      for (let relatedId of relatedIdsList) {
        if (!(relatedId in relatedModelIndex)) continue;

        let relatedModel = relatedModelIndex[relatedId];
        rModels.push(relatedModel);
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
    let withRelation = this.withs[withRelationName];

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
    let relatedModels = await relatedQuery.get();
    // build foreignKey and otherKey indexes
    let foreignKeyIndex = {};
    for (let relatedModel of relatedModels.models) {
      if (!(relatedIdAttribute in relatedModel.attributes)) {
        throw new Error('If you want to perform a with statement on a related model then its id needs to be selected.');
      }
      if (!(relatedFkAttribute in relatedModel.attributes)) {
        throw new Error('If you want to perform a with statement on a related model then its foreign key needs to be selected.');
      }

      let foreignKeyValue = relatedModel.attributes[relatedFkAttribute];
      if (!(foreignKeyValue in foreignKeyIndex)) {
        foreignKeyIndex[foreignKeyValue] = [];
      }
      foreignKeyIndex[foreignKeyValue].push(relatedModel.attributes[relatedIdAttribute]);
    }

    // index the relatedModels by their ids
    let relatedModelIndex = {};
    for (let relatedModel of relatedModels.models) {
      // insert the related model into the index
      relatedModelIndex[relatedModel.attributes[relatedIdAttribute]] = relatedModel;
    }

    // attach the relatedModels to the model(s)
    for (let model of collection.models) {
      let rModels = [];
      let rById = {};

      let relatedIdsList = [];
      let modelId = model.attributes[this.idAttribute];
      if (modelId in foreignKeyIndex) {
        relatedIdsList = foreignKeyIndex[modelId];
      }

      for (let relatedId of relatedIdsList) {
        if (!(relatedId in relatedModelIndex)) continue;

        let relatedModel = relatedModelIndex[relatedId];
        rModels.push(relatedModel);
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

  async function eagerLoadBelongsToRelation(ids, collection, withRelationName) {
    let withRelation = this.withs[withRelationName];

    // get the relation, relatedData and relatedQuery
    let relation = withRelation.relation;
    let relatedData = relation.relatedData;
    let relatedQuery = withRelation.query;

    // get the columns
    let relatedFkAttribute = relatedData.foreignKey;
    let relatedIdAttribute = relatedQuery.idAttribute;

    // build the fk ids array
    let fkIds = [];

    // extract the foreignKey for each model
    for (let model of collection.models) {
      if (!(relatedFkAttribute in model.attributes)) {
        throw new Error('If you want to perform a with statement on a model then its foreign key needs to be selected.');
      }

      // push the model.foreignKey into the collection of ids
      if (model.attributes[relatedFkAttribute] !== null) {
        fkIds.push(model.attributes[relatedFkAttribute]);
      }
    }

    // apply the whereIn constraint to the relatedQuery
    relatedQuery.whereIn(relatedIdAttribute, fkIds);

    // fetch from related table
    let relatedModels = await relatedQuery.get();

    // index the relatedModels by their ids
    let relatedModelIndex = {};
    for (let relatedModel of relatedModels.models) {
      if (!(relatedIdAttribute in relatedModel.attributes)) {
        throw new Error('If you want to perform a with statement on a related model then its id needs to be selected.');
      }

      // insert the related model into the index
      relatedModelIndex[relatedModel.attributes[relatedIdAttribute]] = relatedModel;
    }

    // attach the relatedModels to the model(s)
    for (let model of collection.models) {
      // add/create the relation
      let newRelation = this[withRelationName]();

      let relatedIdsList = [];
      if (model.attributes[relatedFkAttribute] !== null) {
        relatedIdsList.push(model.attributes[relatedFkAttribute]);
      }

      // set the relation to be null by default
      model.attributes[withRelationName] = null;

      for (let relatedId of relatedIdsList) {
        if (!(relatedId in relatedModelIndex)) continue;

        let relatedModel = relatedModelIndex[relatedId];

        // copy over the attributes and previous attributes
        newRelation.attributes = relatedModel.attributes;
        newRelation._previousAttributes = relatedModel._previousAttributes;

        // relations attribute should already exist on each model
        model.relations[withRelationName] = newRelation;
      }
    }
  };

  function formatWiths(relations, signleRelationCallback = null) {
    // Validate arguments.
    if (isString(relations)) {
      let relObj = {};
      relObj[relations] = signleRelationCallback;
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
      } else if (relObj.constructor === Object) {
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
   * @param {object|string|string[]} relations An object where keys are relation names and values are callback functions or null.
   * Can also be a single relations name or list of rlation names.
   * @param {function} [signleRelationCallback] Only takes effect if the "relations" is a single relation name (string).
   */
  modelExt.with = function(relations, signleRelationCallback = null) {
    // Validate arguments.
    // withRelated is an object where keys are relation names and values are callback functions or null
    let withRelated = formatWiths(relations, signleRelationCallback);

    // Prepare all relations.
    for (let relationName in withRelated) {
      // Check if the relation name is string.
      if (!isString(relationName))
        throw new Error('Must pass a string for the relation name.');

      // Split relation name by . (dots) to handle nested rlations.
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
      if (!(firstRelationName in this.withs)) {
        // Check if this is a supported relation
        if ((relatedData.type !== 'belongsToMany') &&
          (relatedData.type !== 'belongsTo') &&
          (relatedData.type !== 'hasMany'))
          throw new Error('Relation type ' + relatedData.type +
            ' not supported/implemented for the with statement.');

        // Forge the related model/query.
        let relatedModel = relatedData.target.forge();

        // Add this relation to the withs.
        this.withs[firstRelationName] = {
          query: relatedModel,
          relation: relation,
        };
      }

      // Get the related query.
      let relatedQuery = this.withs[firstRelationName].query;

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
   * @param {function} [callback] Optional nested query callback.
   */
  modelExt.withSelect = function(relationName, attrs, callback = null) {
    // Validate arguments.
    if (!isString(relationName))
      throw new Error('Must pass a string for the relation name argument.');

    // We want a list of attributes.
    if (attrs.constructor !== Array) attrs = [attrs];

    // Use the existing "with" function.
    // Check if the callback is a function.
    if (isFunction(callback)) {
      return this.with(relationName, function(q) {
        q.select(attrs);
        callback(q);
      });
    } else {
      return this.with(relationName, function(q) {
        q.select(attrs);
      });
    }
  };

  /**
   * @param {string|string[]} relationNames List of relations that you want to get the count of.
   */
  modelExt.withCount = function(relationNames) {
    // TODO: do the nested count
    // Example: .withCount("roles.permissions")

    // We want a list of relations.
    if (relationNames.constructor !== Array) relationNames = [relationNames];

    // Loop through all the relation names. Build the select queries.
    for (let relationName of relationNames)			{
      // Check if the relationName is string.
      if (!isString(relationName))
        throw new Error('Must pass a string or an array of strings for ' +
          'the relationNames argument.');

      // Check if the relation exists on this model.
      if (!(relationName in this))
        // TODO: make this error find the model name from the bookshelf registry plugin (instead of the tableName)
        throw new Error('Relation ' + relationName +
          ' does not exist on this model (tableName = ' +
          knex.raw('??', [this.tableName]).toString() + ').');

      // Get the relation data.
      let relation = this[relationName]();
      let relatedData = relation.relatedData;

      let idAttribute = this.idAttribute;
      let tableName = this.tableName;
      let foreignKey = relatedData.foreignKey;
      let relationCountName = relationName + 'Count';

      switch (relatedData.type) {
        case 'belongsToMany':
          let joinTableName = relatedData.joinTableName;

          // Compose the nested count query.
          let fkColumnName = joinTableName + '.' + foreignKey;
          let nestedCount = knex.select(fkColumnName).from(joinTableName)
            .groupBy(fkColumnName).count('* as ' + relationCountName)
            .as(relationCountName);

          // Attach the count to the main query.
          this.query().leftJoin(nestedCount, tableName + '.' + idAttribute,
            '=', relationCountName + '.' + foreignKey);

          // Push the column to be selected. (use COALESCE because left join produces null values)
          this.eloquent.withCountColumns.columns.push(
            knex.raw('COALESCE(??, ?) as ??',
              [relationCountName, 0, relationCountName]));

          break;
        case 'hasMany':
          let relatedTableName = relatedData.targetTableName;

          // Compose the nested count query.
          let fkColumnNameHasMany = relatedTableName + '.' + foreignKey;
          let nestedCountHasMany = knex.select(fkColumnNameHasMany)
            .from(relatedTableName).groupBy(fkColumnNameHasMany)
            .count('* as ' + relationCountName).as(relationCountName);

          // Attach the count to the main query.
          this.query().leftJoin(nestedCountHasMany, tableName + '.' +
            idAttribute, '=', relationCountName + '.' + foreignKey);

          // Push the column to be selected. (use COALESCE because left join produces null values)
          this.eloquent.withCountColumns.columns.push(
            knex.raw('COALESCE(??, ?) as ??',
              [relationCountName, 0, relationCountName]));

          break;
        default:
          throw new Error('Relation type ' + relatedData.type +
            ' not supported/implemented for the withCount statement.');
      }
    }

    // Chainable.
    return this;
  };

  // ---------------------------------------------------------------------------
  // ------ Where Has ----------------------------------------------------------
  // ---------------------------------------------------------------------------

  // TODO

  // Extend the model.
  Bookshelf.Model = Bookshelf.Model.extend(modelExt);
};
