import { EventEmitter } from "events";
import * as BetterSqlite3 from "better-sqlite3";

const isV7 = parseInt(require("better-sqlite3/package.json").version) >= 7;
const releaseEvent = "release";

export interface PoolConnection extends BetterSqlite3.Database {
    /** Whether the connection is available and can be acquired. */
    readonly available: boolean;

    /** Releases the connection. */
    release(): void;
}

export interface PoolOptions extends BetterSqlite3.Options {
    /**
     * The number of milliseconds to wait when executing queries on a locked 
     * database, before throwing a SQLITE_BUSY error. Also, this option is used
     * to determine how long it'd be waited before throwing timeout error when 
     * acquiring the connection. (default: 5000).
     */
    timeout?: number;
    /**
     * A function that gets called with every SQL string executed by the 
     * database connection (default: `null`).
     */
    verbose?: (...args: any[]) => any;
    /** Max connections in the pool, default is `5`. */
    max?: number;
    onConnectionCreated?: (conn: PoolConnection) => void;
}

export class Pool extends EventEmitter implements PoolOptions {
    readonly path: string;
    readonly memory: boolean;
    readonly readonly: boolean = false;
    readonly fileMustExist: boolean = false;
    readonly timeout: number = 5000;
    readonly verbose: (...args: any[]) => any;
    onConnectionCreated?: (conn: PoolConnection) => void;
    readonly max: number = 5;
    protected connections: PoolConnection[] = [];
    private _closed = false;

    /**
     * Creates a new pool to store database connections.
     * 
     * @param path A SQLite database file path, can be set to 
     *  `:memory` to open a memory based database.
     * @param options If this argument is set to a boolean, it's equivalent to
     *  `readonly`, if set to a number, it's equivalent to `max`.
     * 
     * @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#new-databasepath-options
     */
    constructor(path: string, options?: number | boolean | PoolOptions) {
        super();

        if (options === undefined || options === null) {
            options = {};
        } else if (typeof options === "boolean") {
            options = { readonly: options };
        } else if (typeof options === "number") {
            options = { max: options };
        }

        Object.assign(this, {
            path,
            memory: path === ":memory",
            verbose: null,
        }, options);
    }

    /**
     * Acquires a connection from the pool.
     * @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#class-database
     */
    acquire(): Promise<PoolConnection> {
        if (this._closed) {
            throw new Error("Database already closed");
        }

        const conn = this._getAvailableConnection()
            || this._createConnection();

        if (conn) {
            return Promise.resolve(conn);
        } else {
            return this._waitConnection();
        }
    }

    private _getAvailableConnection() {
        for (let conn of this.connections) {
            if (conn.available && conn.open) {
                Object.assign(conn, {
                    available: false,
                } as Partial<PoolConnection>);

                return conn;
            }
        }

        return null;
    }

    private _createConnection() {
        if (this.connections.length < this.max) {
            let conn = this._rawCreateConnection() as PoolConnection;

            Object.assign(conn, {
                available: false,
            } as Partial<PoolConnection>);
            conn.release = () => {
                if (conn.open && conn.inTransaction)
                    conn.exec("rollback");

                if (this._closed) {
                    conn.close();
                }
                else {
                    Object.assign(conn, {
                        available: conn.open && true,
                    } as Partial<PoolConnection>);
                    this.emit(releaseEvent);
                }
            };

            if (this.onConnectionCreated) {
                this.onConnectionCreated(conn);
            }

            this.connections.push(conn);
            return conn;
        }

        return null;
    }

    /**
     * low level create connection
     * TODO: this should be abstract method for universal Database Pool
     */
    private _rawCreateConnection() {
        const options = {
            "readonly": this.readonly,
            "fileMustExist": this.fileMustExist,
            "timeout": this.timeout,
            "verbose": this.verbose,
        };

        if (isV7) {
            Object.assign(options, { [":memory"]: this.memory });
        } else {
            Object.assign(options, { memory: this.memory });
        }

        return new BetterSqlite3(this.path, options);
    }

    private _waitConnection() {
        return new Promise<PoolConnection>((resolve, reject) => {
            const handler = () => {
                clearTimeout(timer);
                resolve(this.acquire());
            };
            const timer = setTimeout(() => {
                this.removeListener(releaseEvent, handler);
                reject(new Error("Timeout to acquire the connection."));
            }, this.timeout);

            this.once(releaseEvent, handler);
        });
    }

    /**
     * Closes all connections in the pool.
     * @see https://github.com/JoshuaWise/better-sqlite3/wiki/API#close---this
     */
    close() {
        this._closed = true;
        for (let id in this.connections) {
            const conn = this.connections[id];
            if (conn.available && conn.open) {
                conn.close();
            }
        }
    }
}

export default Pool;
