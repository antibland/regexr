var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var sass = require('gulp-sass');
var uglify = require('gulp-uglify');
var watch = require('gulp-watch');
var connect = require('gulp-connect');
var open = require('gulp-open');
var minifyCss = require('gulp-minify-css');
var rimraf = require('gulp-rimraf');
var inline = require('gulp-inline');
var template = require('gulp-template');
var minifyHTML = require('gulp-minify-html');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var watchify = require('watchify');
var browserSync = require('browser-sync');
var runSequence = require('run-sequence');

var staticAssets = [
    "index.html",
    "./assets/**",
    "./php/!(cache)**",
    "*.ico",
    ".htaccess",
    "js/*.template.js"
];

function compileJs(watch) {
    var bundler = watchify(browserify('./js/RegExr.js', {debug: true}));

    function rebundle() {
        bundler.bundle()
            .on('error', function (err) {
                console.error(err);
                this.emit('end');
            })
            .pipe(source('scripts.min.js'))
            .pipe(buffer())
            .pipe(sourcemaps.init({loadMaps: true}))
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./build/js'))
            .pipe(browserSync.stream());
    }

    if (watch) {
        bundler.on('update', function () {
            rebundle();
        });
    }

    rebundle();
}

gulp.task('sass', function () {
    return gulp.src('./scss/regexr.scss')
        .pipe(sass({includePaths: ["scss/third-party/compass-mixins"]}).on('error', sass.logError))
        .pipe(gulp.dest('./build/css'))
        .pipe(browserSync.stream());
});

gulp.task('browser-sync', function () {
    return browserSync(
        {
            open: "local",
            server: {
                baseDir: "./build/"
            }
        });
});

gulp.task('watch-assets', function () {
    return gulp.src(staticAssets, {base: './'})
        .pipe(watch(staticAssets))
        .pipe(gulp.dest('build/'))
        .pipe(browserSync.stream());
});

gulp.task('watch-sass', function () {
    gulp.watch("./scss/**/*.scss", ['sass']);
});
gulp.task('copy-assets', function () {
    return gulp.src(staticAssets, {base: './'})
        .pipe(gulp.dest('build/'));
});

gulp.task('minify-js', function () {
    return gulp.src(['build/js/scripts.min.js', 'build/js/regExWorker.template.js'])
        .pipe(uglify({
            compress: {
                global_defs: {
                    DEBUG: false
                },
                dead_code: true
            },
            ASCIIOnly: true
        }))
        .pipe(gulp.dest('build/js'));
});

gulp.task('build-js', function () {
    return compileJs();
});

gulp.task('watch-js', function () {
    return compileJs(true);
});

gulp.task('server', function () {
    connect.server({
        root: 'build'
    });
});

gulp.task('minify-css', function () {
    return gulp.src('build/css/regexr.css')
        .pipe(minifyCss())
        .pipe(gulp.dest('build/css'));
});

gulp.task('open-build', function () {
    gulp.src(__filename)
        .pipe(open({uri: 'http://localhost:8080'}));
});

gulp.task('clean-pre-build', function () {
    return gulp.src(['./build/!(v1|.git|sitemap.txt|*.md)'], {read: false})
        .pipe(rimraf());
});

gulp.task('clean-post-build', function () {
    return gulp.src(['./build/js/index.template.js', './build/js/scripts.min.js.map'], {read: false})
        .pipe(rimraf());
});

gulp.task('inline', function() {
    return gulp.src('build/index.html')
        .pipe(inline({
                base: 'build/' ,js: uglify, css: minifyCss
            }
        ))
        .pipe(gulp.dest('build/'));
});

gulp.task('parse-index', function () {
    return gulp.src('build/index.html')
        .pipe(template({noCache: Date.now()}))
        .pipe(minifyHTML())
        .pipe(gulp.dest('build/'));
});

gulp.task('build', function (done) {
    runSequence(
        'clean-pre-build',
        ['build-js', 'copy-assets', 'sass'],
        ['minify-js', 'minify-css', 'inline'],
        ['parse-index', 'clean-post-build'],
        'server', 'open-build',
        done
    );
});

gulp.task('default', function (done) {
    runSequence(
        ['sass', 'watch-js', 'watch-sass'],
        'copy-assets',
        ['watch-assets', 'browser-sync'],
        done
    );
});
