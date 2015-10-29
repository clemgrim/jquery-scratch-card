var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

gulp.task('js', function () {
	return gulp.src('./src/main.js')
		.pipe($.plumber())
		.pipe($.jshint())
		.pipe($.jshint.reporter('jshint-stylish'))
		.pipe($.jshint.reporter('fail'))
		.pipe($.uglify())
		.pipe(gulp.dest('./dist'))
		.pipe($.size());
});

gulp.task('css', function () {
	return gulp.src('./src/style.css')
		.pipe($.plumber())
		.pipe($.autoprefixer({
			browsers: ['last 5 versions', '> 1%', 'IE 9']
		}))
		.pipe($.minifyCss())
		.pipe(gulp.dest('./dist'))
		.pipe($.size());
});

gulp.task('img', function () {
	return gulp.src('./src/*.png')
		.pipe($.imagemin())
		.pipe(gulp.dest('./dist'));
});

gulp.task('plato', function (cb) {
	var options = {
		title: 'jQuery Scratch Card report',
		jshint: {},
		complexity: {},
		newmi: true
	};
	
	require('plato').inspect(['./src/main.js'], './report', options, () => cb());
});

gulp.task('watch:js', ['js'], () => gulp.watch('./src/main.js', ['js']));

gulp.task('watch:css', ['css'], () => gulp.watch('./src/style.css', ['css']));

gulp.task('default', ['watch:js', 'watch:css', 'img']);