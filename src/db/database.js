const BetterSqlite3 = require('better-sqlite3');

class Database {
  constructor(filename) {
    this.connection = new BetterSqlite3(filename);
    this.connection.pragma('foreign_keys = ON');
  }

  async run(sql, params = []) {
    return Promise.resolve(this.connection.prepare(sql).run(...params));
  }

  async get(sql, params = []) {
    return Promise.resolve(this.connection.prepare(sql).get(...params));
  }

  async all(sql, params = []) {
    return Promise.resolve(this.connection.prepare(sql).all(...params));
  }

  exec(sql) {
    return this.connection.exec(sql);
  }
}

module.exports = { Database };
