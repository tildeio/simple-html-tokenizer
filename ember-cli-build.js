/*jshint node:true*/

var Funnel = require('broccoli-funnel');
var typescript = require('broccoli-typescript-compiler');
var path = require('path');
var transpileES6 = require('broccoli-babel-transpiler');
var concat = require('broccoli-concat');
var stew = require('broccoli-stew');
var merge = require('broccoli-merge-trees');
var resolve = require('resolve');
var rollup = require('broccoli-rollup')

var find = stew.find;
var mv = stew.mv;

//////

function transpile(tree, label) {
  return transpileES6(tree, { modules: 'amd', moduleIds: true, sourceMaps: 'inline' });
}

var tsOptions = {
  tsconfig: {
    compilerOptions: {
      target: "es2015",
      inlineSourceMap: true,
      inlineSources: true,
      moduleResolution: "node",

      /* needed to get typescript to emit the desired sourcemaps */
      rootDir: '.',
      mapRoot: '/'
    }
  }
};

function transpileDirectory(packages, options) {
  var tsTree = find(packages, {
    include: ['**/*.ts']
  });

  var jsTree = find(packages, {
    include: ['**/*.js']
  });

  var es6Tree = merge([typescript(tsTree, tsOptions), jsTree]);

  var rollupTree = rollup(es6Tree, {
    inputFiles: ['**/*.js'],
    rollup: {
      entry: 'index.js',
      dest: options.name + '.js',
      external: options.extern
    }
  });

  var es5Tree = transpile(rollupTree, 'ES5 Lib Tree');
  es6Tree = mv(es6Tree, 'es6/' + options.name);
  es5Tree = mv(es5Tree, 'es5');

  return { es6: es6Tree, es5: es5Tree };
}

//////

module.exports = function(defaults) {
  var lib = transpileDirectory(__dirname + '/lib', {
    name: 'simple-html-tokenizer',
  });

  var test = transpileDirectory(__dirname + '/tests', {
    name: 'tokenizer-tests',
    extern: ['simple-html-tokenizer']
  });

  var testHarness = buildTarget('tests/', function(output) {
    output.pick(__dirname + '/tests', 'index.html');
    output.nodeModule('qunitjs', 'qunit.{css,js}');
    output.nodeModule(resolveModule(['broccoli-babel-transpiler', 'babel-core', 'regenerator']), 'runtime.js');
    output.nodeModule('loader.js', 'loader.js');
  });

  return merge([
    lib.es5,
    lib.es6,
    test.es5,
    testHarness
  ]);

};

function buildTarget(destination, callback) {
  var trees = [];

  var curried = {
    trees: trees,
    merge: function() { return merge(trees); },
    pick: curryBack(trees, pick, destination),
    nodeModule: curryBack(trees, nodeModule, destination)
  };

  if (callback) {
    callback(curried);
    return merge(trees);
  } else {
    return curried;
  }
}

function curryFront(mergeInto, func, dest) {
  return function() {
    var args = [dest].concat(arguments);
    mergeInto.push(func.apply(this, args));
  };
}

function curryBack(mergeInto, func, dest) {
  return function() {
    var args = [].slice.call(arguments).concat([dest]);
    mergeInto.push(func.apply(this, args));
  };  
}

function pick(source, glob, dest) {
  return new Funnel(source, {
    include: [glob],
    destDir: dest
  });
}

function nodeModule(name, files, dest) {
  if (name.indexOf('/') === -1) {
    name = path.dirname(require.resolve(name));
  }

  return new Funnel(name, {
    include: [files],
    destDir: dest,
    getDestinationPath: function(relativePath) {
      return path.basename(relativePath);
    }
  });
}

function resolveModule(names) {
  return names.reduce(function(parent, name) {
    return path.dirname(resolve.sync(name, { baseDir: parent || __dirname }));
  });
}

function concatLibs(libs, options) {
  return concat(libs, {
    inputFiles: ['**/*.js'],
    outputFile: options.outputFile,
    sourceMapConfig: {
      enabled: true,
      cache: null,
      sourceRoot: '/'
    }
  });
}