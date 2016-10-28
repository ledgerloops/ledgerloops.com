module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        'esversion': 6
      },
      files: ['Gruntfiles.js', 'src/*.js', 'test/*/*.js'],
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          clearRequireCache: false, // Optionally clear the require cache before running tests (defaults to false) 
        },
        src: ['test/unit/*.js', 'test/integration/*.js'],
      }
    },
    browserify: {
      options: {
        bundleOptions: {
          debug: true
        }
      },
      main: {
        src: 'src/index.js',
        dest: 'js/bundle.js',
      }
    },
  });

  // Load plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-browserify');
 
  // Default task(s).
  grunt.registerTask('test', ['jshint', 'mochaTest']);
  grunt.registerTask('build', ['browserify']);
  grunt.registerTask('default', ['test', 'build']);

};
