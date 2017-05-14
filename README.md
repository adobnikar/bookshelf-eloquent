# bookshelf-eloquent

[Bookshelf.js](http://bookshelfjs.org/) plugin that adds some functionallity from the [eloquent ORM from Laravel](https://laravel.com/docs/master/eloquent). Most notably is improves nested eager loading (`with` function) and adds the `withCount` and `whereHas` functions while supporting existing Bookshelf plugins like the [registry](https://github.com/tgriesser/bookshelf/wiki/Plugin:-Model-Registry), [visibility](https://github.com/tgriesser/bookshelf/wiki/Plugin:-Visibility), [bookshelf-paranoia](https://github.com/estate/bookshelf-paranoia)) and others. All the functions documented here are accessible on both the static Bookshelf models and their instances.

**About Bookshelf:**
Bookshelf is a JavaScript ORM for Node.js, built on the [Knex](http://knexjs.org/) SQL query builder. Featuring both promise based and traditional callback interfaces, providing transaction support, eager/nested-eager relation loading, polymorphic associations, and support for one-to-one, one-to-many, and many-to-many relations. It is designed to work well with PostgreSQL, MySQL, and SQLite3.

## Installation

Run the npm install command:
`npm i --save bookshelf-eloquent`

After installing bookshelf-eloquent, all you need to do is add it as a bookshelf plugin to enable it on your models.
```javascript
let knex = require('knex')(require('./knexfile.js').development);
let bookshelf = require('bookshelf')(knex);

// Add the plugin
bookshelf.plugin(require('bookshelf-eloquent'));
```

## Get, First and Select functions

- **.get([options])** → Promise\<Bookshelf Collection\>
--- This function is the same as the Bookshelf's [fetchAll](http://bookshelfjs.org/#Model-instance-fetchAll) function. It triggers the execution of a SQL statement that returns all the records that match the query. **NOTE:** If this function gets called as **.get(string)** then the call will be passed on to the Bookshelf [get](http://bookshelfjs.org/#Model-instance-get) function. Examples:

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

- **.first([options])** → Promise\<Bookshelf Model\>
--- This function is the same as the Bookshelf's [fetch](http://bookshelfjs.org/#Model-instance-fetch) function. It triggers the execution of a SQL statement that returns the first record that matches the query. Examples:

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

- **.select(string|string[])** → Bookshelf  model (this) / function is chainable
--- This function a substitute for the [fetch](http://bookshelfjs.org/#Model-instance-fetch) columns option. Examples:

```javascript
    const User = require('../models/user');

    // Get usernames of all users.
    let users = await User.select('username').get();
    console.log(users.toJSON());
    // prints:
    // [
    //    {'username': 'user1'},
    //    {'username': 'user2'},
    //    ...
    // ]

    // Get 'id', 'username' and 'active' columns of the first active user.
    let users = await User.select(['id', 'active']).where('active', true).first();
    console.log(users.toJSON());
    // prints:
    // {'id': 1, 'username': 'user1', 'active': true}
```

## Complete list of function synonyms

- **.get([options])** is Bookshelf's [fetchAll](http://bookshelfjs.org/#Model-instance-fetchAll),
- **.first([options])** is Bookshelf's [fetch](http://bookshelfjs.org/#Model-instance-fetch),
- **.delete([options])** is Bookshelf's [destroy](http://bookshelfjs.org/#Model-instance-destroy),
- **.withDeleted()** is a synonym for **.withTrashed()**

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
  - .whereBetween(column, from, to) --- `added with this plugin (not in knex documentation)`
- .whereNotBetween(column, \~mixed\~) / .orWhereNotBetween
  - .whereNotBetween(column, range) --- range is an array with [from, to] values
  - .whereNotBetween(column, from, to) --- `added with this plugin (not in knex documentation)`
- .whereLike(column, value) / .orWhereLike --- `added with this plugin (not in knex documentation)`
- .whereNotLike(column, value) / .orWhereNotLike --- `added with this plugin (not in knex documentation)`

**Examples:**

```javascript
    const User = require('../models/user');
    const Account = require('../models/account');

    var users = await User.where({
      first_name: 'Test',
      last_name:  'User'
    }).select('id').get();
    // SQL: select `id` from `users` where `first_name` = 'Test' and `last_name` = 'User'

    var users = await User.where('id', 1).get();
    // SQL: select * from `users` where `id` = 1

    var users = await User.where(function() {
        // knex query
        this.where('id', 1).orWhere('id', '>', 10);
    }).orWhere({name: 'Tester'}).get();
    // SQL: select * from `users` where (`id` = 1 or `id` > 10) or (`name` = 'Tester')

    var users = await User.whereLike('columnName', '%rowlikeme%').get();
    // SQL: select * from `users` where `columnName` like '%rowlikeme%'

    var users = await User.where('votes', '>', 100).get();
    // SQL: select * from `users` where `votes` > 100

    var subquery = await User.where('votes', '>', 100).andWhere('status', 'active')
        .orWhere('name', 'John').select('id').buildQuery();
    var accounts = await Account.whereIn('id', subquery.query).get();
    // SQL:
    //  select * from `accounts` where `id` in (
    //      select `id` from `users` where `votes` > 100 and `status` = 'active' or `name` = 'John'
    //  )

    var users = await User.select('name').whereIn('id', [1, 2, 3])
        .orWhereIn('id', [4, 5, 6]).get();
    // SQL: select `name` from `users` where `id` in (1, 2, 3) or `id` in (4, 5, 6)

    var users = await User.select('name')
    .whereIn('account_id', function() {
        // knex query
        this.select('id').from('accounts');
    })
    // SQL: select `name` from `users` where `account_id` in (select `id` from `accounts`)

    var subquery = await Account.select('id').buildQuery();
    var users = await User.select('name')
        .whereIn('account_id', subquery.query).get();
    // SQL: select `name` from `users` where `account_id` in (select `id` from `accounts`)

    var users = await User.whereNull('updated_at').get();
    // SQL: select * from `users` where `updated_at` is null

    var users = await User.whereBetween('votes', 1, 100).get();
    // SQL: select * from `users` where `votes` between 1 and 100
```

## With (Eager loading)

- **.with(withRelated, [signleRelationCallback])** → Bookshelf  model (this) / function is chainable
    - {string|string[]|object} `withRelated` - A relation, or list of relations, to be eager loaded as part of the fetch operation (either one or more relation names or objects mapping relation names to query callbacks),
    - {function} `[signleRelationCallback]` - Only takes effect if the `withRelated` is a single relation name (string).

- **.withSelect(relationName, columns, [subquery])** → Bookshelf  model (this) / function is chainable
    - {string} `relationName` - Name of the relation that you want to eager load.
    - {string|string[]} `columns` - List of columns on the related model that we want to get from database.
    - {function} `[subquery]` - Optional nested query callback.

**Examples:**

```javascript
const User = require('../models/user');

// Simple eager loading example.
var users = await User.with('posts.comments').get();

// WithSelect example.
var users = await User.withSelect('posts.comments', ['text']).get();

// Nested example.
var users = await User.withSelect('posts', ['id', 'text'], (q) => {
    q.whereNotLike('title', 'a%');
    q.withSelect('comments', 'text');
}).get();

// Another nested example.
var comments = await Comment.withSelect('post', ['text', 'createdById'], (q) => {
    q.whereNotLike('title', 'a%');
    q.withSelect('createdBy', 'username');
}).withSelect('createdBy', 'username').get();

// Same as the previous example only with an object as the withRelated parameter.
var comments = await Comment.with({
    'post': (q) => {
        q.select(['text', 'createdById']);
        q.whereNotLike('title', 'a%');
        q.withSelect('createdBy', 'username');
    },
    'createdBy': (q) => {
        q.select('username');
    },
}).get();
```

## WithCount

## WhereHas

## WithDeleted / WithTrashed (bookshelf-paranoia)

## Miscellaneous
