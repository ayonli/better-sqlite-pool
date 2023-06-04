# Better-SQLite-Pool

**A connection pool for the module**
**[better-sqlite3](https://github.com/WiseLibs/better-sqlite3).**

Using this module to open pools and acquire connections, and `release` the 
connection once it has done its work.

NOTE: Since v0.3.1, this package no longer includes **better-sqlite3** by
default, you have to install it explicitly.

## Install

```sh
npm i better-sqlite3 better-sqlite-pool
```

## Example

```javascript
const { Pool } = require("better-sqlite-pool");

// Create a new pool:
var pool = new Pool("./example.db");

// use Promise:
pool.acquire().then(db => {
    var res = db.prepare("select * from users where id = 1").get();
    console.log(res);
    db.release();
});

// use async/await:
(async function() {
    var db = await pool.acquire();
    var res = db.prepare("select * from users where id = 2").get();
    console.log(res);
    db.release();
})();


setImmediate(() => {
    console.log(pool);
});
```

## API

### `new Pool(path: string, options:? object|boolean|number)`

**Creates a new pool to store database connections.**

- `path` A SQLite database file path, can be set to `:memory` to open a memory
    based database.
- `[options]` May contain any of these:
    - `readonly` Default is `false`.
    - `memory` Default is `false`.
    - `fileMustExist` Default is `false`.
    - `max` Max connections in the pool, default is `5`.
    - `timeout` The number of milliseconds to wait when executing queries on a 
        locked database, before throwing a SQLITE_BUSY error. Also, this option 
        is used to determine how long it'd be waited before throwing timeout 
        error when acquiring the connection. (default: 5000).
    - `verbose` A function that gets called with every SQL string executed by 
        the database connection (default: `null`).
    
    If this argument is set to a `boolean`, it's equivalent to `readonly`, 
    if set to a number, it's equivalent to `max`.

### `pool.acquire(): Promise<BetterSqlite3.Database>`

**Acquires a connection from the pool.**

### `pool.close()`

**Closes all connections in the pool.**

## Potential Issues

### `node-gyp` error

If you have any problem of downloading and installing this module, it's most 
likely that you're running an old version Node.js which doesn't include prebuilt
**better-sqlite3** binary files, and don't have a `node-gyp` installed, which is
used to compile **better-sqlite3**. so please install `node-gyp` first if this
situation occurs to you.

### `VCBulid.exe` error

Another problem you may face is your computer throwing an error that tells you 
the `VCBulid.exe` file is missing. This is probably you don't have a Visual 
Studio installed, install one with VC++ support, that will fix the problem.

### `statement may fall through` errors

These error may happen when compiling **better-sqlite3** (version under v7.0)
with GCC 7+, which is issued
in [Many "statement may fall through" while installing #3](https://github.com/ayonli/better-sqlite-pool/issues/3)
and [Ignore compilation warnings from SQLite3 itself #239](https://github.com/WiseLibs/better-sqlite3/issues/239),
you can still run the driver though, if it's not so much important, just leave 
the error alone.
