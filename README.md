# bookshelf-eloquent

This is a plugin for [Bookshelf.js](http://bookshelfjs.org/) that adds some functionality from the Laravel's [eloquent ORM](https://laravel.com/docs/master/eloquent). Most notably it improves nested eager loading (`with` function) and adds the `withCount` and `whereHas` functions while supporting existing Bookshelf plugins like [registry](https://github.com/tgriesser/bookshelf/wiki/Plugin:-Model-Registry), [visibility](https://github.com/tgriesser/bookshelf/wiki/Plugin:-Visibility), [bookshelf-paranoia](https://github.com/estate/bookshelf-paranoia) and others. All the functions documented here are accessible on both the static Bookshelf models and their instances.

**About Bookshelf:**
Bookshelf is a JavaScript ORM for Node.js, built on the [Knex](http://knexjs.org/) SQL query builder. Featuring both promise based and traditional callback interfaces, providing transaction support, eager/nested-eager relation loading, polymorphic associations, and support for one-to-one, one-to-many, and many-to-many relations. It is designed to work well with PostgreSQL, MySQL, and SQLite3.

## Requirements

- requires **node v7.6.0** or higher for ES2015 and async function support,
- all the documented functions have been tested on **Bookshelf 0.12.0, 0.10.4, 0.10.3** and **MySQL**.

## Installation

Run the npm install command:
```bash
npm i --save bookshelf-eloquent
```

After installing bookshelf-eloquent, all you need to do is add it as a bookshelf plugin to enable it on your models.
```javascript
let knex = require('knex')(require('./knexfile.js').development);
let bookshelf = require('bookshelf')(knex);

// Add the plugin
bookshelf.plugin(require('bookshelf-eloquent'));
```

## List of supported relations

- hasOne
- belongsTo
- hasMany
- belongsToMany

## List of all functions

### Model

- **.get([options])** → Promise\<Bookshelf Collection\>
- **.first([options])** → Promise\<Bookshelf Model\>
- **.select(columns)** → Bookshelf  model (this) / function is chainable
- Knex where statements (see the **Where statements** section)
- **.orderBy(column, [direction])** → Bookshelf  model (this) / function is chainable [Knex docs for orderBy](http://knexjs.org/#Builder-orderBy)
- **.orderByRaw(sql)** → Bookshelf  model (this) / function is chainable [Knex docs for orderByRaw](http://knexjs.org/#Builder-orderByRaw)
- **.offset(value) / .skip** → Bookshelf  model (this) / function is chainable [Knex docs for offset](http://knexjs.org/#Builder-offset)
- **.limit(value) / .take** → Bookshelf  model (this) / function is chainable [Knex docs for limit](http://knexjs.org/#Builder-limit)
- **.with(withRelated, [signleRelationSubquery])** → Bookshelf  model (this) / function is chainable
- **.withSelect(relationName, columns, [subquery])** → Bookshelf  model (this) / function is chainable
- **.withCount(withRelated, [signleRelationSubquery])** → Bookshelf  model (this) / function is chainable
- **.has(relationName, [operator], [operand1], [operand2]) / .orHas** → Bookshelf  model (this) / function is chainable
- **.where(\~mixed\~) / .orWhere** → Bookshelf  model (this) / function is chainable (nested where support)
- **.whereHas(relationName, [subquery], [operator], [operand1], [operand2]) / .orWhereHas** → Bookshelf  model (this) / function is chainable
- **.destroyAll([options]) / .deleteAll** → Promise\<Bookshelf Model\>
- **.withDeleted() / .withTrashed** → Bookshelf model (this) / function is chainable
- **.fakeSync([options])** → Promise\<[Bookshelf  Sync](https://github.com/tgriesser/bookshelf/blob/master/src/sync.js)\>
- **.buildQuery([options])** → Promise\<[Bookshelf  Sync](https://github.com/tgriesser/bookshelf/blob/master/src/sync.js)\>
- **.useTableAlias(alias)** → Bookshelf  model (this) / function is chainable

### Collection

- **.add(data, [options])** → Bookshelf model | Bookshelf collection (this) / function is chainable
- **.addMemo(data, [options])** → Bookshelf model | Bookshelf collection (this) / function is chainable
- **.insert([ignoreDuplicates = false])** → Promise\<Bookshelf collection\> (Promise\<this\>)
- **.insertBy(uniqueColumns, [selectColumns])** → Promise\<Bookshelf collection\> (Promise\<this\>)
- **.replace()** → Promise\<Bookshelf collection\> (Promise\<this\>)

## Get, First and Select functions

- **.get([options])** → Promise\<Bookshelf Collection\>
    - {object} `[options]` Bookshelf [fetchAll options](http://bookshelfjs.org/#Model-instance-fetchAll).

    This function is the same as the Bookshelf's [fetchAll](http://bookshelfjs.org/#Model-instance-fetchAll) function. It triggers the execution of a SQL statement that returns all the records that match the query.

    **NOTE:** If this function gets called as **.get(string)** then the call will be passed on to the Bookshelf [get](http://bookshelfjs.org/#Model-instance-get) function.

    **Examples:**

    Require the user model.
    ```javascript
    const User = require('../models/user');
    ```
    - Get all users.
        ```javascript
        let users = await User.get();
        console.log(users.toJSON());
        ```
        prints:
        ```
        [
            {'id': 1, 'username': 'user1', ... },
            {'id': 2, 'username': 'user2', ... },
            ...
        ]
        ```
    - Get all active users.
        ```javascript
        let users = await User.where('active', true).get();
        console.log(users.toJSON());
        ```
        prints:
        ```
        [
            {'id': 1, 'username': 'user1', 'active': true, ... },
            {'id': 3, 'username': 'user3', 'active': true, ... },
            ...
        ]
        ```

- **.first([options])** → Promise\<Bookshelf Model\>
    - {object} `[options]` Bookshelf [fetch options](http://bookshelfjs.org/#Model-instance-fetch).

    This function is the same as the Bookshelf's [fetch](http://bookshelfjs.org/#Model-instance-fetch) function. It triggers the execution of a SQL statement that returns the first record that matches the query.

    **Examples:**

    Require the user model.
    ```javascript
    const User = require('../models/user');
    ```
    - Get the first user.
        ```javascript
        let users = await User.get();
        console.log(users.toJSON());
        ```
        prints:
        ```
        {'id': 1, 'username': 'user1', ... }
        ```
    - Get the first active user.
        ```javascript
        let users = await User.where('active', true).first();
        console.log(users.toJSON());
        ```
        prints:
        ```
        {'id': 1, 'username': 'user1', 'active': true, ... }
        ```

- **.select(columns)** → Bookshelf  model (this) / function is chainable
    - {string|string[]} `columns` List of columns that we want to select from the database.

    This function a substitute for the [fetch](http://bookshelfjs.org/#Model-instance-fetch) columns option.

    **Examples:**

    Require the user model.
    ```javascript
    const User = require('../models/user');
    ```
    - Select usernames of all users.
        ```javascript
        let users = await User.select('username').get();
        console.log(users.toJSON());
        ```
        prints:
        ```
        [
            {'username': 'user1'},
            {'username': 'user2'},
            ...
        ]
        ```
    - Select 'id', 'username' and 'active' columns of the first active user.
        ```javascript
        let users = await User.select(['id', 'active']).where('active', true).first();
        console.log(users.toJSON());
        ```
        prints:
        ```
        {'id': 1, 'username': 'user1', 'active': true}
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
  - .whereBetween(column, from, to) --- `added with this plugin (not in Knex documentation)`
- .whereNotBetween(column, \~mixed\~) / .orWhereNotBetween
  - .whereNotBetween(column, range) --- range is an array with [from, to] values
  - .whereNotBetween(column, from, to) --- `added with this plugin (not in Knex documentation)`
- .whereLike(column, value) / .orWhereLike --- `added with this plugin (not in Knex documentation)`
- .whereNotLike(column, value) / .orWhereNotLike --- `added with this plugin (not in Knex documentation)`

**Examples:**

Require account and user models.
```javascript
const User = require('../models/user');
const Account = require('../models/account');
```
- Get all users where their firstName is 'Test' and their lastName is 'User'.
    ```javascript
    var users = await User.where({
      firstName: 'Test',
      lastName:  'User'
    }).select('id').get();
    ```
    SQL:
    ```sql
    select `id` from `users` where `firstName` = 'Test' and `lastName` = 'User'
    ```
- Get all users with id 1.
    ```javascript
    var users = await User.where('id', 1).get();
    ```
    SQL:
    ```sql
    select * from `users` where `id` = 1
    ```
- Get all users where their id is 1 or is greater than 10 or their name is 'Tester'.
    ```javascript
    var users = await User.where(function() {
        // knex query
        this.where('id', 1).orWhere('id', '>', 10);
    }).orWhere({name: 'Tester'}).get();
    ```
    SQL:
    ```sql
    select * from `users` where (`id` = 1 or `id` > 10) or (`name` = 'Tester')
    ```
- Get all users where their columnName is like '%rowlikeme%'.
    ```javascript
    var users = await User.whereLike('columnName', '%rowlikeme%').get();
    ```
    SQL:
    ```sql
    select * from `users` where `columnName` like '%rowlikeme%'
    ```
- Get all users where their 'votes' column value is greater than 100.
    ```javascript
    var users = await User.where('votes', '>', 100).get();
    ```
    SQL:
    ```sql
    select * from `users` where `votes` > 100
    ```
- Get all accounts belonging to users that have more than 100 votes and have active status or have the name 'John'.
    ```javascript
    var subquery = await User.where('votes', '>', 100).andWhere('status', 'active')
        .orWhere('name', 'John').select('id').buildQuery();
    var accounts = await Account.whereIn('userId', subquery.query).get();
    ```
    SQL:
    ```sql
    select * from `accounts` where `userId` in (
        select `id` from `users` where `votes` > 100 and `status` = 'active' or `name` = 'John'
    )
    ```
- Select names of all users with id in [1, 2, 3] or in [4, 5, 6].
    ```javascript
    var users = await User.select('name').whereIn('id', [1, 2, 3])
        .orWhereIn('id', [4, 5, 6]).get();
    ```
    SQL:
    ```sql
    select `name` from `users` where `id` in (1, 2, 3) or `id` in (4, 5, 6)
    ```
- Select names of all users belonging to active accounts (with Knex subquery).
    ```javascript
    var users = await User.select('name')
    .whereIn('accountId', function() {
        // knex query
        this.select('id').from('accounts').where('status', 'active');
    })
    ```
    SQL:
    ```sql
    select `name` from `users` where `accountId` in (select `id` from `accounts` where `status` = 'active')
    ```
- Select names of all users belonging to active accounts (with Bookshelf subquery).
    ```javascript
    var subquery = await Account.select('id').where('status', 'active').buildQuery();
    var users = await User.select('name')
        .whereIn('accountId', subquery.query).get();
    ```
    SQL:
    ```sql
    select `name` from `users` where `accountId` in (select `id` from `accounts` where `status` = 'active')
    ```
- Get all users that were never updated (have the 'updatedAt' timestamp not set).
    ```javascript
    var users = await User.whereNull('updatedAt').get();
    ```
    SQL:
    ```sql
    select * from `users` where `updatedAt` is null
    ```
- Get all users where their vote count is between 1 and 100.
    ```javascript
    var users = await User.whereBetween('votes', 1, 100).get();
    ```
    SQL:
    ```sql
    select * from `users` where `votes` between 1 and 100
    ```
- Nested where example:

    Get (select) all users that have at least 100 votes and have at least one post or comment.

    Filter logic: (votes > 100) and ((at least one comment) or (at least one post)).

    ```javascript
    var users = await User.where((subQuery) => {
        subQuery.where('votes', '>', 100);
        subQuery.where((subSubQuery) => {
            subSubQuery.whereHas('comments');
            subSubQuery.orWhereHas('posts');
        });
    }).get();
    ```
    SQL:
    ```sql
    select `users`.* from `users` where (`votes` > 100 and ((exists (select * from `comments` where `createdById` in (`users`.`id`))) or (exists (select * from `posts` where `createdById` in (`users`.`id`)))))
    ```

## Other Knex functions

For the detailed documentation you can checkout the [Knex documentation](http://knexjs.org/). All these functions are chainable.

- .orderBy(column, [direction]) [Knex docs for orderBy](http://knexjs.org/#Builder-orderBy)
- .orderByRaw(sql) [Knex docs for orderByRaw](http://knexjs.org/#Builder-orderByRaw)
- .offset(value) / .skip [Knex docs for offset](http://knexjs.org/#Builder-offset)
- .limit(value) / .take [Knex docs for limit](http://knexjs.org/#Builder-limit)

**Examples:**

- Order users by the time of creation and get the **third page** of results if we display **10 users per page** (skip the first 20 users and display users from 21st to 30th place).
    ```javascript
    // Require the user model.
    const User = require('../models/user');

    var users = await User.select(['id', 'username', 'number'])
        .orderBy('createdAt')
        .offset(20).limit(10)
        .get();
    ```
    SQL:
    ```sql
    select `id`, `username`, `number` from `users` order by `users`.`createdAt` ASC limit 10 offset 20
    ```

## With (Eager loading)

- **.with(withRelated, [signleRelationSubquery])** → Bookshelf  model (this) / function is chainable
    - {string|string[]|object} `withRelated` - A relation (with an optional alias), or list of relations, to be eager loaded as part of the fetch operation (either one or more relation names or objects mapping relation names to subquery callbacks),
    - {function} `[signleRelationSubquery]` - If the `withRelated` parameter is a single relation (string) you can pass the it's subquery callback to this parameter.

- **.withSelect(relationName, columns, [subquery])** → Bookshelf  model (this) / function is chainable
    - {string} `relationName` - Name of the relation (with an optional alias) that you want to eager load.
    - {string|string[]} `columns` - List of columns on the related model that we want to get from database.
    - {function} `[subquery]` - Optional nested query callback.

**Examples:**

Require the user model.
```javascript
const User = require('../models/user');
```
- Simple eager loading example. Get all users with their posts and comments (in this example aliases are used but they are optional).
    ```javascript
    var users = await User.with('posts.comments as postsAlias.commentsAlias').get();
    ```
- Get all users with their posts and comments and only select the 'text' column of the comments.
    ```javascript
    var users = await User.withSelect('posts.comments', ['text']).get();
    ```
- Get all users with their posts and comments where post title doesn't start with 'a'.
Select only the 'id' and 'text' of posts and 'text' of comments.
    ```javascript
    var users = await User.withSelect('posts', ['id', 'text'], (q) => {
        q.whereNotLike('title', 'a%');
        q.withSelect('comments', 'text');
    }).get();
    ```
- Get all comments with their posts where the post title doesn't start with 'a'. Load also the creators (users) of posts and comments.
Select only the 'text' and 'createdById' columns of posts and the usernames of creators.
    ```javascript
    var comments = await Comment.withSelect('post', ['text', 'createdById'], (q) => {
        q.whereNotLike('title', 'a%');
        q.withSelect('createdBy', 'username');
    }).withSelect('createdBy', 'username').get();
    ```
- Same as the previous example only with an object as the withRelated parameter.
    ```javascript
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

If you want to count the number of results from a relationship without actually loading them you may use the withCount method, which will place a {camelCaseRelation}Count column on your resulting models.

- **.withCount(withRelated, [signleRelationSubquery])** → Bookshelf  model (this) / function is chainable
    - {object|string|string[]} `withRelated` An object where keys are relation names and their values are subquery functions (if you don't want to specify a subquery function you can set the value to null instead). Can also be a single relations name with an optional alias (string) or an array of relation names (string[]).
    - {function} [signleRelationSubquery] If the `withRelated` parameter is a single relation (string) you can pass the it's subquery callback to this parameter.

**Examples:**

Require the user model.
```javascript
const User = require('../models/user');
```
- Get all users with their post counts. Select only the 'id' and posts count as 'postsCountAlias' (Alias is optional - by default the generated attribute would be 'postsCount').
    ```javascript
    var users = await User.select('id').withCount('posts as postsCountAlias').get();
    console.log(users.toJSON());
    ```
    prints:
    ```
    [
        {'id': 1, 'postsCountAlias': 7},
        {'id': 2, 'postsCountAlias': 3},
        ...
    ]
    ```
- Get all users with:
    - the count of comments their recieved on their posts (count only the comments where the text doesn't start with 'q'),
    - the count of different tags attached to their posts,
    - the count of comments they have written where the text doesn't start with 'q'.
    ```javascript
    var users = await User.withCount('posts.comments', (q) => {
            q.whereNotLike('text', 'q%');
        })
        .withCount('posts.tags')
        .withCount('comments', (q) => {
            q.whereNotLike('text', 'q%');
        }).get();
    console.log(users.toJSON());
    ```
    prints:
    ```
    [
        { id: 1, username: 'admin', postsCommentsCount: 7, postsTagsCount: 5, commentsCount: 1, ... },
        { id: 2, username: 'admin.group', postsCommentsCount: 6, postsTagsCount: 9, commentsCount: 3, ... },
        ...
    ]
    ```
- Same as the previous example only with an object as the withRelated parameter.
    ```javascript
    var users = await User.withCount({
        'posts.comments': (q) => {
            q.whereNotLike('text', 'q%');
        },
        'posts.tags': null,
        'comments': (q) => {
            q.whereNotLike('text', 'q%');
        },
    }).get()
    console.log(users.toJSON());
    ```
    prints:
    ```
    [
        { id: 1, username: 'admin', postsCommentsCount: 7, postsTagsCount: 5, commentsCount: 1, ... },
        { id: 2, username: 'admin.group', postsCommentsCount: 6, postsTagsCount: 9, commentsCount: 3, ... },
        ...
    ]
    ```

## Has and WhereHas

When accessing the records for a model, you may wish to limit your results based on the existence of a relationship. For example, imagine you want to retrieve all blog posts that have at least one comment. To do so, you may pass the name of the relationship to the `has` method:

- **.has(relationName, [operator], [operand1], [operand2]) / .orHas** → Bookshelf  model (this) / function is chainable
    - {string} `relationName` Relation name by which we want to filter.
    - {string} `[operator]` Filter operator.
    - {numeric|string} `[operand1]` Filter operand1.
    - {numeric|string} `[operand2]` Filter operand2.

    **Examples:**

    Require the user model.
    ```javascript
    const User = require('../models/user');
    ```
    - Get all users which have at least one post.
        ```javascript
        var users = await User.has('posts').get();
        ```
        SQL:
        ```sql
        select * from `users` where exists (select * from `posts` where `createdById` in (`users`.`id`))
        ```
    - Get all users which have at least five posts.
        ```javascript
        var users = await User.has('posts', '>=', 5).get();
        ```
        SQL:
        ```sql
        select * from `users` where (select count(*) from `posts` where `createdById` in (`users`.`id`)) >= 5
        ```
    - Get all users which have at least one comment on their posts.
        ```javascript
        var users = await User.has('posts.comments').get();
        ```
        SQL:
        ```sql
        select * from `users` where exists (
            select * from `comments` where `postId` in (
                select `id` from `posts` where `createdById` in (`users`.`id`)
            )
        )
        ```

If you need even more power, you may use the `whereHas` and `orWhereHas` methods to put "where" conditions on your `has` queries. These methods allow you to add customized constraints to a relationship constraint, such as checking the content of a comment:

- **.whereHas(relationName, [subquery], [operator], [operand1], [operand2]) / .orWhereHas** → Bookshelf  model (this) / function is chainable
    - {string} `relationName` Relation name by which we want to filter.
    - {function} `[subquery]` This filter can be nested.
    - {string} `[operator]` Filter operator.
    - {numeric|string} `[operand1]` Filter operand1.
    - {numeric|string} `[operand2]` Filter operand2.

    **Examples:**

    Require the user model.
    ```javascript
    const User = require('../models/user');
    ```
    - Get all users which have at least one post where title starts with 'foo'.
        ```javascript
        var users = await User.whereHas('posts', (q) => {
            q.where('title', 'like', 'foo%');
        }).get();
        ```
        SQL:
        ```sql
        select * from `users` where exists (
            select * from `posts` where `createdById` in (`users`.`id`) and `title` like 'foo%'
        );
        ```
    - Get all users which have at least five posts where title starts with 'foo'.
        ```javascript
        var users = await User.whereHas('posts', (q) => {
            q.where('title', 'like', 'foo%');
        }, '>=', 5).get();
        ```
        SQL:
        ```sql
        select * from `users` where (
            select count(*) from `posts` where `createdById` in (`users`.`id`) and `title` like 'foo%'
        ) >= 5;
        ```
    - Get all users which have at least one comment on their posts where text starts with 'bar'.
        ```javascript
        var users = await User.whereHas('posts.comments', (q) => {
            q.where('text', 'like', 'bar%');
        }).get();
        ```
        SQL:
        ```sql
        select * from `users` where exists (
            select * from `comments` where `postId` in (
                select `id` from `posts` where `createdById` in (`users`.`id`)
            ) and `text` like 'bar%'
        );
        ```
    - Get all users which have at least one post where title starts with 'foo' and has at least one comment.
        ```javascript
        var users = await User.whereHas('posts', (q) => {
            q.where('title', 'like', 'foo%');
            q.has('comments');
        }).get();
        ```
        SQL:
        ```sql
        select * from `users` where exists (
            select * from `posts` where `createdById` in (`users`.`id`) and `title` like 'foo%' and exists (
                select * from `comments` where `postId` in (`posts`.`id`)
            )
        );
        ```

## Destroy / Delete All

- **.destroyAll([options]) / .deleteAll** → Promise\<Bookshelf Model\>
    - {object} `[options]` Bookshelf [destroy options](http://bookshelfjs.org/#Model-instance-destroy).

    This function deletes all model records where their id is bigger or equal 0 (>= 0). It supports the [bookshelf-paranoia](https://github.com/estate/bookshelf-paranoia) plugin for soft deleting.

    **Examples:**

    ```javascript
    // Require the user model.
    const User = require('../models/user');

    // Delete all users.
    await User.deleteAll();
    ```
    SQL:
    ```sql
    delete from `users` where `id` >= 0
    ```

## WithDeleted / WithTrashed (bookshelf-paranoia)

- **.withDeleted() / .withTrashed** → Bookshelf model (this) / function is chainable

    Support for [bookshelf-paranoia](https://github.com/estate/bookshelf-paranoia) Bookshelf plugin. Bookshelf-eloquent adds the **.withDeleted()** and **.withTrashed()** function which allow you to retrieve soft deleted rows.

    **Example:**

    Now you can use **.withDeleted()** / **.withTrashed()**
    ```javascript
    var user = await User.where('id', 57).withDeleted().first();
    ```
    instead of the fetch options (old way):
    ```javascript
    var user = await User.where('id', 57).first({ withDeleted: true });
    ```

## Complete list of function synonyms

- **.get([options])** is Bookshelf's [fetchAll](http://bookshelfjs.org/#Model-instance-fetchAll),
- **.first([options])** is Bookshelf's [fetch](http://bookshelfjs.org/#Model-instance-fetch),
- **.delete([options])** is Bookshelf's [destroy](http://bookshelfjs.org/#Model-instance-destroy),
- **.withDeleted()** is a synonym for **.withTrashed()**

## Miscellaneous

- **.fakeSync([options])** → Promise\<[Bookshelf  Sync](https://github.com/tgriesser/bookshelf/blob/master/src/sync.js)\>
    - {object} `[options]` Bookshelf [fetch options](http://bookshelfjs.org/#Model-instance-fetch).

    Triggers plugins (like [bookshelf-paranoia](https://github.com/estate/bookshelf-paranoia)) that listen to the Bookshelf fetch events by triggering the `fetching` event. Function returns a Promise\<[Bookshelf  Sync](https://github.com/tgriesser/bookshelf/blob/master/src/sync.js)\>.

    **Example**
    ```javascript
    const User = require('../models/user');
    var sync = await User.where('id', 57).fakeSync();
    var knexBuilder = sync.query;
    console.log(knexBuilder.toString());
    ```
    prints:
    ```sql
    select * from `users` where `id` = 57
    ```

- **.buildQuery([options])** → Promise\<[Bookshelf  Sync](https://github.com/tgriesser/bookshelf/blob/master/src/sync.js)\>
    - {object} `[options]` Bookshelf [fetch options](http://bookshelfjs.org/#Model-instance-fetch).

    Should be used for subquery building. Similar to the `fakeSync` function. Triggers plugins (like [bookshelf-paranoia](https://github.com/estate/bookshelf-paranoia)) that listen to the Bookshelf fetch events by triggering the `fetching` event. Also selects the Bookshelf [fetch options](http://bookshelfjs.org/#Model-instance-fetch) columns. Function returns a Promise\<[Bookshelf  Sync](https://github.com/tgriesser/bookshelf/blob/master/src/sync.js)\>.

    **Example**
    ```javascript
    const User = require('../models/user');
    var sync = await User.where('id', 57).buildQuery({columns: ['id', 'username']});
    var knexBuilder = sync.query;
    console.log(knexBuilder.toString());
    ```
    prints:
    ```sql
    select `id`, `username` from `users` where `id` = 57
    ```

- **.useTableAlias(alias)** → Bookshelf  model (this) / function is chainable
    - {string} `alias` Table alias name.

    **Example**
    ```javascript
    const User = require('../models/user');
    var sync = await User.where('id', 57).useTableAlias('t').buildQuery();
    var knexBuilder = sync.query;
    console.log(knexBuilder.toString());
    ```
    prints:
    ```sql
    select `t`.* from `users` as `t` where `id` = 57
    ```

## Bulk insert

- **.add(data, [options])** → Bookshelf model | Bookshelf collection (this) / function is chainable
    - {object|object[]} `data` Model data. Function returns a Bookshelf model if
    If the `data` parameter is an object then the function returns a Bookshelf model.
    If the `data` parameter is an object[] then the function returns a Bookshelf collection (this) / function is chainable
    - {object} `[options]` Bookshelf [model forge options](http://bookshelfjs.org/#Model-static-forge).

    This function is overriden Bookshelf [collection add](http://bookshelfjs.org/#Collection-instance-add) function.

    **NOTE:** this function is not chainable anymore unless you pass an object[] for the `data` parameter.

    **Examples**

    Add some users to a user collection.
    ```javascript
    // Require the user model.
    const User = require('../models/user');

    // Create a Bookshelf collection.
    var userCollection = User.collection();

    // Add the users to the collection.
    var user1 = userCollection.add({name: 'Geovanny Waelchi Jr.', number: 81});
    var user2 = userCollection.add({name: 'Christ Green', number: 35});
    var user3 = userCollection.add({name: 'Timmy Windler', number: 2});

    // Add some more users as an array.
    userCollection.add([
        {name: 'Francisca Altenwerth DDS', number: 33},
        {name: 'Lamont Brekke I', number: 55},
        {name: 'Georgiana Frami', number: 36}
    ]);
    ```

- **.insert([ignoreDuplicates = false])** → Promise\<Bookshelf collection\> (Promise\<this\>)
    - {boolean} `ignoreDuplicates` Add 'on duplicate ignore' to the SQL statement.
    If `ignoreDuplicates` is `false` then all the inserted models will also get their ids automatically attached.
    If `ignoreDuplicates` is `true` then the automatic retrieval of model ids is not possible (in MySQL). If you need this functionality please use the `insertBy` function instead.

    **Examples**

    Require the user model.
    ```javascript
    const User = require('../models/user');
    ```
    - Bulk insert 3 users to the database.
        ```javascript
        // Create a Bookshelf collection.
        var userCollection = User.collection();

        // Add the users to the collection.
        var user1 = userCollection.add({name: 'Geovanny Waelchi Jr.', number: 81});
        var user2 = userCollection.add({name: 'Christ Green', number: 35});
        var user3 = userCollection.add({name: 'Timmy Windler', number: 2});

        // Run the bulk insert sql statement.
        await userCollection.insert();

        // Print the third user.
        console.log(user3.toJSON());
        ```
        prints:
        ```
        { name: 'Timmy Windler', number: 2, id: 3 }
        ```

    - Now we bulk insert 2 users to the database one of wich already has a duplicate name in the database (the number of the duplicate user is also changed from 35 to 89 to show that the user won't be updated but just ignored). In the database the `name` column is set to `unique`.
        ```javascript
        // Create a new Bookshelf collection.
        var userCollection = User.collection();

        // Add the users to the collection.
        var user1 = userCollection.add({name: 'Christ Green', number: 89}); // This one already has a duplicate name in the database.
        var user2 = userCollection.add({name: 'Nellie Ortiz', number: 13}); // This one is new.

        // Run the bulk insert sql statement with `ignoreDuplicates` flag set to `true`.
        await userCollection.insert(true);

        // Print the duplicate user.
        console.log(user1.toJSON());
        ```
        prints:

        **NOTE:** The model id was not attached because the `ignoreDuplicates` flag was set to `true`.
        ```
        { name: 'Christ Green', number: 89 }
        ```
        **NOTE:** If we select all users from the database we can see that the duplicate user was not updated.
        ```javascript
        var users = await User.select(['id', 'name', 'number']).get();
        console.log(users.toJSON());
        ```
        prints:
        ```
        [
            { id: 145261, name: 'Geovanny Waelchi Jr.', number: 81 },
            { id: 145262, name: 'Christ Green', number: 35 },
            { id: 145263, name: 'Timmy Windler', number: 2 },
            { id: 145264, name: 'Nellie Ortiz', number: 13 }
        ]
        ```

- **.addMemo(data, [options])** → Bookshelf model | Bookshelf collection (this) / function is chainable
    - {object|object[]} `data` Model data. Function returns a Bookshelf model if
    If the `data` parameter is an object then the function returns a Bookshelf model.
    If the `data` parameter is an object[] then the function returns a Bookshelf collection (this) / function is chainable
    - {object} `[options]` Bookshelf [model forge options](http://bookshelfjs.org/#Model-static-forge).

    This function is add function with memoization. The [memoizee](https://github.com/medikoo/memoizee) package is used for this functionality.

    **Examples**

    **NOTE:** In the database the `name` column is set to `unique`.

    ```javascript
    // Require the user model.
    const User = require('../models/user');

    // Create a Bookshelf collection.
    var userCollection = User.collection();

    // Add the users to the collection.
    var user1 = userCollection.addMemo({name: 'Geovanny Waelchi Jr.'});
    var user2a = userCollection.addMemo({name: 'Christ Green'});
    var user2b = userCollection.addMemo({name: 'Christ Green'});
    var user3 = userCollection.addMemo({name: 'Timmy Windler'});

    // Add another user with additional data.
    // We have to set the 'unique' options setting to our unique key: ['name'].
    var user4a = userCollection.addMemo({name: 'Francisca Altenwerth DDS', number: 33}, {unique: ['name']});
    var user4b = userCollection.addMemo({name: 'Francisca Altenwerth DDS', number: 44}, {unique: ['name']});

    // Add some more duplicate users as an array.
    userCollection.addMemo([
        {name: 'Francisca Altenwerth DDS', number: 55},
        {name: 'Christ Green', number: 55},
        {name: 'Timmy Windler'},
    ], {unique: ['name']});

    // Print the whole collection.
    console.log(userCollection.toJSON());
    ```
    prints:
    ```
    [
        { name: 'Geovanny Waelchi Jr.' },
        { name: 'Christ Green' },
        { name: 'Timmy Windler' },
        { name: 'Francisca Altenwerth DDS', number: 33 }
    ]
    ```
    When a duplicate user is inserted the first model that was created is returned.
    ```javascript
    // Compare user references.
    console.log(user2a === user2b);
    console.log(user4a === user4b);
    ```
    prints:
    ```
    true
    true
    ```

- **.insertBy(uniqueColumns, [selectColumns])** → Promise\<Bookshelf collection\> (Promise\<this\>)
    - {string|string[]} `uniqueColumns` List of columns in the unique index.
    - {string|string[]} `[selectColumns]` List of columns that we want to select from the database. Id column will always be selected.

    This function is useful when we want to bulk insert some data to the database but we also expect to encounter some duplicates.

    **Example**

    **NOTE:** In the database the `name` column is set to `unique`.

    ```javascript
    // Require the user model.
    const User = require('../models/user');

    // Create a Bookshelf collection.
    var userCollection = User.collection();

    // Add the users to the collection. First we want to fill the database with some pre-existing users.
    var user1 = userCollection.add({name: 'Geovanny Waelchi Jr.', number: 81});
    var user2 = userCollection.add({name: 'Christ Green', number: 35});

    // Run the normal bulk insert sql statement.
    await userCollection.insert();

    var userCollection = User.collection();
    var user1 = userCollection.add({name: 'Geovanny Waelchi Jr.', number: 5});
    var user2 = userCollection.add({name: 'Christ Green'});
    var user3 = userCollection.add({name: 'Timmy Windler', number: 2});

    // Run the insertBy bulk insert sql statement.
    await userCollection.insertBy(['name'], ['number']);

    // Print all users.
    console.log(userCollection.toJSON());
    ```
    prints:
    ```
    [
        { name: 'Geovanny Waelchi Jr.', number: 81, id: 1 },
        { name: 'Christ Green', number: 35, id: 2 },
        { name: 'Timmy Windler', number: 2, id: 3 }
    ]
    ```

- **.replace()** → Promise\<Bookshelf collection\> (Promise\<this\>)

    This function compiles the sql insert statment and then replaces the word "insert" with "replace".

    **Examples**

    Require the user model.
    ```javascript
    const User = require('../models/user');
    ```
    - Bulk replace 3 users in the database.
        ```javascript
        // Create a Bookshelf collection.
        var userCollection = User.collection();

        // Add the users to the collection.
        // NOTE: Primary or unique keys should be given when using the replace statement.
        userCollection.add([
          {id: 1, name: 'Geovanny Waelchi Jr.', number: 81},
          {id: 2, name: 'Christ Green', number: 35},
          {id: 3, name: 'Timmy Windler', number: 2},
        ]);

        // Run the bulk replace sql statement.
        await userCollection.replace();
        ```
