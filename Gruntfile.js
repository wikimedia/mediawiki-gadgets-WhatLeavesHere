/*jshint node:true */
module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-jscs');

	grunt.initConfig({
		jshint: {
			options: {
				jshintrc: true
			},
			all: [
				'*.js',
				'src/*.js'
			]
		},
		jscs: {
			all: '<%= jshint.all %>'
		},
		watch: {
			files: [
				'.{jscsrc,jshintrc,jshintignore}',
				'<%= jshint.all %>'
			],
			tasks: 'test'
		}
	});

	grunt.registerTask('test', ['jshint', 'jscs']);
	grunt.registerTask('default', ['test']);
};
