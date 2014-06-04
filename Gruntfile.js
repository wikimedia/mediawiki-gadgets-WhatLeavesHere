/*jshint node:true */
module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');

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
		watch: {
			files: [
				'.{jshintrc,jshintignore}',
				'<%= jshint.all %>'
			],
			tasks: 'test'
		}
	});

	grunt.registerTask('test', ['jshint']);
	grunt.registerTask('default', ['test']);
};
