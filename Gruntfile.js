module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        'esversion': 6
      },
      src: 'src/*.js',
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          clearRequireCache: false, // Optionally clear the require cache before running tests (defaults to false) 
        },
        src: ['test/unit/*.js', 'test/integration/*.js'],
      }
    }
  });

  // Load plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');
 
  // Default task(s).
  grunt.registerTask('test', ['jshint', 'mochaTest']);
  grunt.registerTask('default', ['test']);

};
