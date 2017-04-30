'use strict';

// xtend is a basic utility library which allows you to extend an object by appending all of the properties
// from each object in a list. When there are identical properties, the right-most property takes precedence.
const extend = require('xtend');
const isString = require('lodash/isString');
const isArray = require('lodash/isArray');

// TODO: check this function
function formatWiths(relations, signleRelationCallback = null) {
	// Validate arguments.
  if (isString(relations)) {
    let relObj = {};
    relObj[relations] = signleRelationCallback;
    relations = [relObj];
  } else if (relations.constructor === Object) {
    relations = [relations];
  }

  if (relations.constructor !== Array) {
    throw new Error('Must pass an object/dictionary, array or string for the relations argument.');
  }

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
      throw new Error('Must pass an object/dictionary, array or string for the relations argument.');
    }
  }

  return withRelated;
}


function mergeOptions(eloquent, options) {
  let withCountColumns = eloquent.withCountColumns;
  let fetchOptions = eloquent.fetchOptions;

	// copy any columns from fetchOptionsButtEnd to fetchOptions
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
      options.withRelated = extend(fetchOptions.withRelated, options.withRelated);
    }
  }

  return extend(fetchOptions, options);
}


// Eloquent plugin -
// Adds the functionality and function names of eloquent (like whereHas).
// -----
module.exports = function(Bookshelf) {
  const proto  = Bookshelf.Model.prototype;

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

  // Attach existing "knex where methods" to the model.
  const whereMethods = ['orWhere', 'whereNot', 'whereIn', 'whereNotIn',
    'whereNull', 'whereNotNull', 'whereExists', 'whereNotExists',
    'whereBetween', 'whereNotBetween',
  ];
  for (let method of whereMethods)
    modelExt[method] = (...args) => { return this.query(method, ...args); };

  // Set which columns you want to select on fetch.
  modelExt.select = function(attrs) {
    // If parameter attrs is not an array the wrap it into an array.
    if (!isArray(attrs)) attrs = [attrs];

    // Set or replace the columns array.
    this.eloquent.fetchOptions.columns = attrs;

    return this;
  };

  // Synonym for fetch.
  modelExt.first = function(...args) {
    return this.fetch(...args);
  };

  modelExt.fetch = function fetch(options) {
    // TODO:
    // return this.fetchWithWrapper(this._fetchInner, options);

    // Attach options that were built by eloquent/this extension.
    options = mergeOptions(this.eloquent, options);

    // Call the original fetch function.
    return modelFetch.apply(this, options);
  };

  // This one is a little bit tricky. Now it is also a synonym for fetchAll.
  // In eloquent function get() is similar to fetchAll() in bookshelf.
  // If the first parameter is a string we want to call the bookshelf get() function which gets an attribute.
  // Else we want to call the eloquent get() function which gets all result that match the built query.
  modelExt.get = function(...args) {
    if (isString(args[0])) return modelGet.apply(this, args);
    else return this.fetchAll(...args);
  };

  modelExt.fetchAll = function fetchAll(options) {
    // TODO
    //return this.fetchWithWrapper(this._fetchAllInner, options);

    // Attach options that were built by eloquent/this extension.
    options = mergeOptions(this.eloquent, options);

    // Call the original fetchAll function.
    return modelFetchAll.apply(this, options);
  };

  // Extend the model.
  Bookshelf.Model = Bookshelf.Model.extend(modelExt);
};
