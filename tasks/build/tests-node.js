var transpileES6 = require('broccoli-es6-module-transpiler');
var helpers = require('./helpers');

var src = helpers.pickLibAndTests();
module.exports = transpileES6(src, { type: 'cjs' });
