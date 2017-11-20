const Pool = require("./");

var pool = new Pool("./example.db");

pool.acquire().then(db => {
    var res = db.prepare("select * from users where id = 1").get();
    console.log(res);
    db.release();
});

(async function() {
    var db = await pool.acquire();
    var res = db.prepare("select * from users where id = 2").get();
    console.log(res);
    db.release();
})();


setImmediate(() => {
    console.log(pool);
});