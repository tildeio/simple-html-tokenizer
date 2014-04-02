var path = require('path');

module.exports = function(grunt) {
  grunt.registerMultiTask('qunit', function() {
    var qunitPath = path.join(process.cwd(), this.data.qunitjs);
    var runTests = this.data.run;

    var QUnit = require(qunitPath);
    var testActive = false;
    var runDone = false;

    var done = this.async();
    
    QUnit.testStart(function() {
      testActive = true;
    });

    QUnit.log(function(details) {
      if (!testActive || details.result) {
        return;
      }
      var message = "name: " + details.name + " module: " + details.module +
        " message: " + details.message;
      grunt.log.error(message);
    });

    QUnit.testDone(function() {
      testActive = false;
    });

    QUnit.done(function(details) {
      if (runDone) {
        return;
      }
      var succeeded = (details.failed === 0),
        message = details.total + " assertions in (" + details.runtime + "ms), passed: " +
          details.passed + ", failed: " + details.failed;
      if (succeeded) {
        grunt.log.ok(message);
      } else {
        grunt.log.error(message);
      }
      done(succeeded);
      runDone = true;
    });
    
    QUnit.config.autorun = false;

    runTests();

    QUnit.load();
  });
};