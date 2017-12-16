'use strict';

// source: https://stackoverflow.com/questions/8572826/generic-deep-diff-between-two-objects
const VALUE_CREATED = 'created';
const VALUE_UPDATED = 'updated';
const VALUE_DELETED = 'deleted';
const VALUE_UNCHANGED = 'unchanged';

function diff(obj1, obj2, stack = []) {
  if (isFunction(obj1) || isFunction(obj2)) {
    throw 'Invalid argument. Function given, object expected.';
  }
  if (isValue(obj1) || isValue(obj2)) {
    let type = compareValues(obj1, obj2);
    if (type !== VALUE_UNCHANGED) {
      console.log(type, obj1, "->", obj2, "at", stack.join("."));
    }
    return {
      type: type,
      data: (obj1 === undefined) ? obj2 : obj1
    };
  }

  var diffObj = {};
  for (var key in obj1) {
    if (isFunction(obj1[key])) {
      continue;
    }

    var value2 = undefined;
    if ('undefined' != typeof(obj2[key])) {
      value2 = obj2[key];
    }

    stack.push(key);
    diffObj[key] = diff(obj1[key], value2, stack);
    stack.pop();
  }
  for (var key in obj2) {
    if (isFunction(obj2[key]) || ('undefined' != typeof(diffObj[key]))) {
      continue;
    }

    stack.push(key);
    diffObj[key] = diff(undefined, obj2[key], stack);
    stack.pop();
  }

  return diffObj;

};

function compareValues(value1, value2) {
    if (value1 === value2) {
        return VALUE_UNCHANGED;
    }
    if (isDate(value1) && isDate(value2) && value1.getTime() === value2.getTime()) {
        return VALUE_UNCHANGED;
    }
    if ('undefined' == typeof(value1)) {
        return VALUE_CREATED;
    }
    if ('undefined' == typeof(value2)) {
        return VALUE_DELETED;
    }

    return VALUE_UPDATED;
}
function isFunction(obj) {
    return {}.toString.apply(obj) === '[object Function]';
}
function isArray(obj) {
    return {}.toString.apply(obj) === '[object Array]';
}
function isObject(obj) {
    return {}.toString.apply(obj) === '[object Object]';
}
function isDate(obj) {
    return {}.toString.apply(obj) === '[object Date]';
}
function isValue(obj) {
    return !isObject(obj) && !isArray(obj);
}

/**
 * Exported functions.
 * @type {Object}
 */
module.exports = {
	diff,
};
