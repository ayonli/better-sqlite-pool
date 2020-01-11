"use strict";

const Pool = require("./").Pool;
const assert = require("assert");
const fs = require("fs");

var filename = "./example.db";

if (fs.existsSync(filename)) {
    fs.unlinkSync(filename);
}

var pool = new Pool("./example.db"),
    connection = null;

pool.onConnectionCreated = function (conn) {
    conn.exec("ATTACH DATABASE 'log.db' AS log;");
}

pool.acquire().then(con => {
    connection = con;

    var ddl = [
        "create table if not exists `users` (",
        "  `id` integer primary key autoincrement not null,",
        "  `name` varchar(32) not null,",
        "  `email` varchar(255)",
        ")"
    ].join("\n");

    con.exec(ddl);

    var res = con.prepare("insert into `users` (`name`, `email`) values (?, ?)")
        .run(["Ayon Lee", "i@hyurl.com"]);

    var res2 = con.prepare("select * from `users` where `id` =  ?").get(res.lastInsertRowid);

    assert.deepStrictEqual(res2, {
        id: res.lastInsertRowid,
        name: "Ayon Lee",
        email: "i@hyurl.com"
    });

    var logDDL = [
        "create table if not exists `log`.`request` (",
        "  `id` integer primary key autoincrement not null,",
        "  `text` varchar(255)",
        ")"
    ].join("\n");

    con.exec(logDDL);

    var res3 = con.prepare("insert into `log`.`request` (`text`) values (?)")
        .run(["okay"]);

    var res4 = con.prepare("select * from `log`.`request` where `id` =  ?").get(res3.lastInsertRowid);

    assert.deepStrictEqual(res4, {
        id: res3.lastInsertRowid,
        text: "okay",
    });

    con.release();
}).catch(err => {
    console.log(err);
    process.exit(1);
});

setTimeout(() => {
    pool.acquire().then(con => {
        assert.equal(con, connection);
        pool.close();

        con.release();
        console.log("#### OK ####");
    });
}, 100);