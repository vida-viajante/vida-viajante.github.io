// Generated on 2015-08-13 using generator-jekyllized 0.7.3
'use strict';

var gulp = require('gulp');
// Loads the plugins without having to list all of them, but you need
// to call them as $.pluginname
var $ = require('gulp-load-plugins')();
//extra gulp plugin
var mainBowerFiles = require('main-bower-files');
// 'del' is used to clean out directories and such
var del = require('del');
// BrowserSync isn't a gulp package, and needs to be loaded manually
var browserSync = require('browser-sync');
// merge is used to merge the output from two different streams into the same stream
var merge = require('merge-stream');
// Need a command for reloading webpages using BrowserSync
var reload = browserSync.reload;
// And define a variable that BrowserSync uses in it's function
var bs;

// Deletes the directory that is used to serve the site during development
gulp.task('clean:dev', del.bind(null, ['serve']));

// Deletes the directory that the optimized site is output to
gulp.task('clean:prod', del.bind(null, ['site']));

// Runs the build command for Jekyll to compile the site locally
// This will build the site with the production settings
gulp.task('jekyll:dev', $.shell.task('jekyll build'));
gulp.task('jekyll-rebuild', ['jekyll:dev'], function () {
  reload();
});

// Almost identical to the above task, but instead we load in the build configuration
// that overwrites some of the settings in the regular configuration so that you
// don't end up publishing your drafts or future posts
gulp.task('jekyll:prod', $.shell.task('jekyll build --config _config.yml,_config.build.yml'));

// Grab libraries files from bower_components, minify and push in /src
gulp.task('bower', function() {
  var jsFilter = $.filter('*.js');
  var cssFilter = $.filter('*.css');
  var scssFilter = $.filter('*.scss');
  var fontFilter = $.filter(['*.eot', '*.woff', '*.svg', '*.ttf']);
  
  var dest_path = 'src/assets';
  return gulp.src(mainBowerFiles())
    // grab vendor js files from bower_components, minify and push in /src
    .pipe(jsFilter)
    .pipe(gulp.dest(dest_path + '/javascript'))
    .pipe($.uglify())
    .pipe($.rename({
        suffix: '.min'
    }))
    .pipe(gulp.dest(dest_path + '/javascript'))
    .pipe(jsFilter.restore())

    // grab vendor css files from bower_components, minify and push in /src
    .pipe(cssFilter)
    .pipe(gulp.dest(dest_path + '/stylesheets'))
    .pipe($.minifyCss())
    .pipe($.rename({
        suffix: '.min'
    }))
    .pipe(gulp.dest(dest_path + '/stylesheets'))
    .pipe(cssFilter.restore())

    // grab vendor scss files from bower_components and push in /src
    .pipe(scssFilter)
    .pipe(gulp.dest(dest_path + '/scss'))
    .pipe(scssFilter.restore())

    // grab vendor font files from bower_components and push in /src
    .pipe(fontFilter)
    .pipe($.flatten())
    .pipe(gulp.dest(dest_path + '/fonts'));
});

// Compiles the SASS files and moves them into the 'assets/stylesheets' directory
gulp.task('styles', function () {
  // Looks at the style.scss file for what to include and creates a style.css file
  return gulp.src('src/assets/scss/style.scss')
    .pipe($.sass())
    // AutoPrefix your CSS so it works between browsers
    .pipe($.autoprefixer('last 1 version', { cascade: true }))
    // Directory your CSS file goes to
    .pipe(gulp.dest('src/assets/stylesheets/'))
    .pipe(gulp.dest('serve/assets/stylesheets/'))
    // Outputs the size of the CSS file
    .pipe($.size({title: 'styles'}))
    // Injects the CSS changes to your browser since Jekyll doesn't rebuild the CSS
    .pipe(reload({stream: true}));
});

// Optimizes the images that exists
gulp.task('images', function () {
  return gulp.src('src/assets/images/**')
    .pipe($.changed('site/assets/images'))
    .pipe($.imagemin({
      // Lossless conversion to progressive JPGs
      progressive: true,
      // Interlace GIFs for progressive rendering
      interlaced: true
    }))
    .pipe(gulp.dest('site/assets/images'))
    .pipe($.size({title: 'images'}));
});

// Copy over fonts to the 'site' directory
gulp.task('fonts', function () {
  return gulp.src('src/assets/fonts/**')
    .pipe(gulp.dest('site/assets/fonts'))
    .pipe($.size({ title: 'fonts' }));
});

// Copy xml and txt files to the 'site' directory
gulp.task('copy', function () {
  return gulp.src(['serve/*.txt', 'serve/*.xml', 'CNAME'])
    .pipe(gulp.dest('site'))
    .pipe($.size({ title: 'xml & txt' }));
});

// Optimizes all the CSS, HTML and concats the JS etc
gulp.task('html', ['styles'], function () {
  var assets = $.useref.assets({searchPath: 'serve'});

  return gulp.src('serve/**/*.html')
    // useref has a bug with eol
    .pipe($.eol())
    .pipe(assets)
    // Concatenate JavaScript files and preserve important comments
    .pipe($.if('*.js', $.uglify({preserveComments: 'some'})))
    // Minify CSS
    .pipe($.if('*.css', $.minifyCss()))
    // Start cache busting the files
    .pipe($.revAll({ ignore: ['.eot', '.svg', '.ttf', '.woff', '.jpg'] }))
    .pipe(assets.restore())
    // Conctenate your files based on what you specified in _layout/header.html
    .pipe($.useref())
    // Replace the asset names with their cache busted names
    .pipe($.revReplace())
    // Minify HTML
    .pipe($.if('*.html', $.htmlmin({
      removeComments: true,
      removeCommentsFromCDATA: true,
      removeCDATASectionsFromCDATA: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeRedundantAttributes: true
    })))
    // Send the output to the correct folder
    .pipe(gulp.dest('site'))
    .pipe($.size({title: 'optimizations'}));
});


// Task to upload your site to your personal GH Pages repo
gulp.task('deploy', function () {
  // Deploys your optimized site, you can change the settings in the html task if you want to
  return gulp.src('./site/**/*')
    .pipe($.ghPages({
      // Currently only personal GitHub Pages are supported so it will upload to the master
      // branch and automatically overwrite anything that is in the directory
      branch: 'master',
      cacheDir: './.publish'
      }));
});

// Run JS Lint against your JS
gulp.task('jslint', function () {
  gulp.src('./serve/assets/javascript/*.js')
    // Checks your JS code quality against your .jshintrc file
    .pipe($.jshint('.jshintrc'))
    .pipe($.jshint.reporter());
});

// Runs 'jekyll doctor' on your site to check for errors with your configuration
// and will check for URL errors a well
gulp.task('doctor', $.shell.task('jekyll doctor'));

// BrowserSync will serve our site on a local server for us and other devices to use
// It will also autoreload across all devices as well as keep the viewport synchronized
// between them.
gulp.task('serve:dev', ['styles', 'jekyll:dev'], function () {
  bs = browserSync({
    notify: true,
    // tunnel: '',
    server: {
      baseDir: 'serve'
    }
  });
});

// These tasks will look for files that change while serving and will auto-regenerate or
// reload the website accordingly. Update or add other files you need to be watched.
gulp.task('watch', function () {
  gulp.watch(['src/**/*.md', 'src/**/*.html', 'src/**/*.xml', 'src/**/*.txt', 'src/**/*.js'], ['jekyll-rebuild']);
  gulp.watch(['serve/assets/stylesheets/*.css'], reload);
  gulp.watch(['src/assets/scss/**/*.scss'], ['styles']);
});

// Serve the site after optimizations to see that everything looks fine
gulp.task('serve:prod', function () {
  bs = browserSync({
    notify: false,
    // tunnel: true,
    server: {
      baseDir: 'site'
    }
  });
});

// Default task, run when just writing 'gulp' in the terminal
gulp.task('default', ['serve:dev', 'watch']);

// Checks your CSS, JS and Jekyll for errors
gulp.task('check', ['jslint', 'doctor'], function () {
  // Better hope nothing is wrong.
});

// Builds the site but doesn't serve it to you
gulp.task('build', ['jekyll:prod', 'styles'], function () {});

// Builds your site with the 'build' command and then runs all the optimizations on
// it and outputs it to './site'
gulp.task('publish', ['build'], function () {
  gulp.start('html', 'copy', 'images', 'fonts');
});
