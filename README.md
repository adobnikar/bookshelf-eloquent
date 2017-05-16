# bookshelf-eloquent

[Bookshelf.js](http://bookshelfjs.org/) plugin that adds some functionallity from the [eloquent ORM from Laravel](https://laravel.com/docs/master/eloquent). Most notably is improves nested eager loading (`with` function) and adds the `withCount` and `whereHas` functions while supporting existing Bookshelf plugins like the [registry](https://github.com/tgriesser/bookshelf/wiki/Plugin:-Model-Registry), [visibility](https://github.com/tgriesser/bookshelf/wiki/Plugin:-Visibility), [bookshelf-paranoia](https://github.com/estate/bookshelf-paranoia)) and others. All the functions documented here are accessible on both the static Bookshelf models and their instances.

**About Bookshelf:**
Bookshelf is a JavaScript ORM for Node.js, built on the [Knex](http://knexjs.org/) SQL query builder. Featuring both promise based and traditional callback interfaces, providing transaction support, eager/nested-eager relation loading, polymorphic associations, and support for one-to-one, one-to-many, and many-to-many relations. It is designed to work well with PostgreSQL, MySQL, and SQLite3.

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

## Get, First and Select functions

- **.get([options])** → Promise\<Bookshelf Collection\>
--- This function is the same as the Bookshelf's [fetchAll](http://bookshelfjs.org/#Model-instance-fetchAll) function. It triggers the execution of a SQL statement that returns all the records that match the query. **NOTE:** If this function gets called as **.get(string)** then the call will be passed on to the Bookshelf [get](http://bookshelfjs.org/#Model-instance-get) function. Examples:

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
--- This function is the same as the Bookshelf's [fetch](http://bookshelfjs.org/#Model-instance-fetch) function. It triggers the execution of a SQL statement that returns the first record that matches the query. Examples:

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

- **.select(string|string[])** → Bookshelf  model (this) / function is chainable
--- This function a substitute for the [fetch](http://bookshelfjs.org/#Model-instance-fetch) columns option. Examples:

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

## With (Eager loading)

- **.with(withRelated, [signleRelationSubquery])** → Bookshelf  model (this) / function is chainable
    - {string|string[]|object} `withRelated` - A relation, or list of relations, to be eager loaded as part of the fetch operation (either one or more relation names or objects mapping relation names to subquery callbacks),
    - {function} `[signleRelationSubquery]` - If the `withRelated` parameter is a single relation (string) you can pass the it's subquery callback to this parameter.

- **.withSelect(relationName, columns, [subquery])** → Bookshelf  model (this) / function is chainable
    - {string} `relationName` - Name of the relation that you want to eager load.
    - {string|string[]} `columns` - List of columns on the related model that we want to get from database.
    - {function} `[subquery]` - Optional nested query callback.

**Examples:**

Require the user model.
```javascript
const User = require('../models/user');
```
- Simple eager loading example. Get all users with their posts and comments.
    ```javascript
    var users = await User.with('posts.comments').get();
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
    - {object|string|string[]} `withRelated` An object where keys are relation names and their values are subquery functions (if you don't want to specify a subquery function you can set the value to null instead). Can also be a single relations name (string) or an array of relation names (string[]).
    - {function} [signleRelationSubquery] If the `withRelated` parameter is a single relation (string) you can pass the it's subquery callback to this parameter.

**Examples:**

Require the user model.
```javascript
const User = require('../models/user');
```
- Get all users with their post counts. Select only the 'id' and 'postsCount'.
    ```javascript
    var users = await User.select('id').withCount('posts').get();
    console.log(users.toJSON());
    ```
    prints:
    ```
    [
        {'id': 1, 'postsCount': 7},
        {'id': 2, 'postsCount': 3},
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

If you need even more power, you may use the `whereHas` and `orWhereHas` methods to put "where" conditions on your `has` queries. These methods allow you to add customized constraints to a relationship constraint, such as checking the content of a comment:

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

## WithDeleted / WithTrashed (bookshelf-paranoia)

## Miscellaneous
