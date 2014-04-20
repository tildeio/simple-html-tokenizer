var path = require('path');
var Module = require('module');

module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-broccoli');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadTasks('tasks');

  grunt.registerTask('server', 'broccoli:browser:serve');
  grunt.registerTask('dist', ['clean:dist', 'broccoli:dist:build']);
  grunt.registerTask('test', ['clean:node', 'broccoli:node:build', 'qunit:node']);

  grunt.initConfig({
    broccoli: {
      dist: {
        config: 'tasks/build/dist.js',
        dest: 'dist'
      },
      browser: {
        config: 'tasks/build/tests-browser.js'
      },
      node: {
        config: 'tasks/build/tests-node.js',
        dest: 'tmp/node'
      }
    },
    clean: {
      dist: 'dist',
      node: 'tmp/node'
    },
    qunit: {
      node: {
        qunitjs: './bower_components/qunit/qunit/qunit.js',
        run: function() {
          var oldNodePath = process.env.NODE_PATH;
          process.env.NODE_PATH = path.join(process.cwd(), 'tmp/node');
          Module._initPaths();

          require("simple-html-tokenizer/tests/generation-tests");
          require("simple-html-tokenizer/tests/tokenizer-tests");
          
          process.env.NODE_PATH = oldNodePath;
          Module._initPaths();
        }
      }
    }
  });
};
