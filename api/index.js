const app = require('../dist/index.js');

const handler = app.default || app;

module.exports = handler;
module.exports.default = handler;
