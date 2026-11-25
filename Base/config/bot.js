module.exports = {
  token: '',
  clientId: '',
  clientSecret: '',
  guildId: '',
  database: {
    enabled: false,
    type: 'json', // 'json', 'mysql', 'postgresql', 'sqlite', 'mongodb'
    host: 'localhost',
    port: 3306,
    name: '',
    user: '',
    password: '',
    uri: '',
    sqlitePath: './data/database.sqlite'
  }
};
