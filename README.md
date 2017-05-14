# bookshelf-eloquent

[Bookshelf.js](http://bookshelfjs.org/) plugin that adds some functionallity from the [eloquent ORM from Laravel](https://laravel.com/docs/master/eloquent). Most notably is improves nested eager loading (`with` function) and adds the `withCount` and `whereHas` functions while supporting existing Bookshelf plugins like the [registry](https://github.com/tgriesser/bookshelf/wiki/Plugin:-Model-Registry), [visibility](https://github.com/tgriesser/bookshelf/wiki/Plugin:-Visibility), [bookshelf-paranoia](https://github.com/estate/bookshelf-paranoia)) and others. All the functions documented here are accessible on both the static Bookshelf models and their instances.

**About Bookshelf**
Bookshelf is a JavaScript ORM for Node.js, built on the [Knex](http://knexjs.org/) SQL query builder. Featuring both promise based and traditional callback interfaces, providing transaction support, eager/nested-eager relation loading, polymorphic associations, and support for one-to-one, one-to-many, and many-to-many relations. It is designed to work well with PostgreSQL, MySQL, and SQLite3.

## Get and First methods

- .**get([options])** → Promise\<Bookshelf Collection\>

    This function is the same as the Bookshelf's [fetchAll](http://bookshelfjs.org/#Model-instance-fetchAll) function. It triggers the execution of a SQL statement that returns all the records that match the query. Examples:

```javascript
    const User = require('../models/user');

    // Get all users.
    let users = await User.get();
    console.log(users.toJSON());
    // prints:
    // [
    //    {'id': 1, 'username': 'user1', ... },
    //    {'id': 2, 'username': 'user2', ... },
    //    ...
    // ]

    // Get all active users.
    let users = await User.where('active', true).get();
    console.log(users.toJSON());
    // prints:
    // [
    //    {'id': 1, 'username': 'user1', 'active': true, ... },
    //    {'id': 3, 'username': 'user3', 'active': true, ... },
    //    ...
    // ]
```

- .**first([options])** → Promise\<Bookshelf Model\>

    This function is the same as the Bookshelf's [fetch](http://bookshelfjs.org/#Model-instance-fetch) function. It triggers the execution of a SQL statement that returns the first record that matches the query. Examples:

```javascript
    const User = require('../models/user');

    // Get first user.
    let users = await User.get();
    console.log(users.toJSON());
    // prints:
    // {'id': 1, 'username': 'user1', ... }

    // Get first active user.
    let users = await User.where('active', true).first();
    console.log(users.toJSON());
    // prints:
    // {'id': 1, 'username': 'user1', 'active': true, ... }
```

## Where statements

[Knex](http://knexjs.org/#Builder-wheres) has a lot of useful where methods that are not directly accessible from the Bookshelf Model. Now all of the Knex where methods are directly attached to the Bookshelf Model. For the detailed documentation you can checkout the [Knex documentation](http://knexjs.org/#Builder-wheres). All the where methods are chainable. The full list of methods:

- .where(\~mixed\~) / .orWhere
  - .where(column, value)
  - .where(column, operator, value)
  - .where(object) --- object is a list of keys and values
  - .where(knex builder) --- grouped subquery
- .whereNot(\~mixed\~) / .orWhereNot
  - .whereNot(column, value)
  - .whereNot(column, operator, value)
  - .whereNot(object) --- object is a list of keys and values
  - .whereNot(knex builder) --- grouped subquery
- .whereIn(column, array|callback|knex builder) / .orWhereIn
- .whereNotIn(column, array|callback|knex builder) / .orWhereNotIn
- .whereNull(column) / .orWhereNull
- .whereNotNull(column) / .orWhereNotNull
- .whereExists(builder | callback) / .orWhereExists
- .whereNotExists(builder | callback) / .orWhereNotExists
- .whereBetween(column, \~mixed\~) / .orWhereBetween
  - .whereBetween(column, range) --- range is an array with [from, to] values
  - .whereBetween(column, from, to) --- `added with this plugin`
- .whereNotBetween(column, \~mixed\~) / .orWhereNotBetween
  - .whereNotBetween(column, range) --- range is an array with [from, to] values
  - .whereNotBetween(column, from, to) --- `added with this plugin`
- .whereLike(column, value) / .orWhereLike --- `added with this plugin`
- .whereNotLike(column, value) / .orWhereNotLike --- `added with this plugin`

**Examples:**
