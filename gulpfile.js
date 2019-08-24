const { src, dest, series, parallel, watch } = require("gulp");
const del = require("del");
const concat = require("gulp-concat");
const autoprefixer = require("gulp-autoprefixer");
const cleanCSS = require("gulp-clean-css");
const gulpif = require("gulp-if");
const sourcemaps = require("gulp-sourcemaps");
const browserSync = require("browser-sync").create();
const gcmq = require("gulp-group-css-media-queries");
const less = require('gulp-less');
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const webp = require('gulp-webp');
const svgSprite = require('gulp-svg-sprite');


const isDev = process.argv.includes("--dev");
const isProd = !isDev;
const isSync = process.argv.includes("--sync");

function clear() {
  return del("./build/**");
}

function styles() {
  return src("./src/styles/style.less")
    .pipe(gulpif(isDev, sourcemaps.init()))
    .pipe(less())
    .pipe(gcmq())
    .pipe(
      autoprefixer({
        cascade: false
      })
    )
    .pipe(gulpif(isProd,cleanCSS({
          level: 2
        })))
    .pipe(gulpif(isDev, sourcemaps.write()))
    .pipe(dest("./build/"))
    .pipe(gulpif(isSync, browserSync.stream()));
}

function fonts(){
  return src("./src/fonts/*.{woff,woff2}")
    .pipe(dest("./build/fonts"))
}

function html() {
  return src("./src/index.html")
    .pipe(gulpif(isProd, htmlmin({ collapseWhitespace: true }))) // минификация html без удаления пробелов внутри тегов
    .pipe(dest("./build/"))
    .pipe(gulpif(isSync, browserSync.stream()));
}

function js() {
  return src("./src/**/*.js")
    .pipe(dest("./build/"));
}

function picture(){
  return src(["./src/image/**/*.{png,jpg}","./src/image/pictureSVG/*.svg"], { base:"./src/image/" })
    .pipe(gulpif(isProd, imagemin([
      imagemin.jpegtran({progressive: true}), // Прогрессивное отображение jpg
      imagemin.optipng({optimizationLevel: 3}),
      imagemin.svgo()
  ])))
    .pipe(dest("./build/image"))
    .pipe(webp({quality:90}))
    .pipe(dest("./build/image"))
}

function svgInlineSprite(){ // создает спрайты для вставиавния в html через use 

  const svgConfig = {
    mode: {
      symbol: {
        dest:"./",
        sprite:"./sprite.svg"
      }
    }
  }

  return src("./src/image/sprite/*.svg")
    .pipe(imagemin([
      imagemin.svgo({plugins: [{
        removeAttrs: {
          attrs: 'path:fill' // удаляет всe fill атрибуты внутри path
        }
    }]}) // оптимизация svg
    ]))
    .pipe(svgSprite(svgConfig))
    .pipe(dest("./build/image/sprite"))
}

function svgCSS(){ // создает спрайты для встравивания в css background

  const svgConfig = {
    mode: {
      css: {
        dest:"./", // удаление лишних вложенностей папок
        sprite:"./sprite.svg",
        render: {
          css: {
            render: {
                css: true // создание css файла с описание расположения каждого спрайта
            }
          }
        }
      }
    },
    svg:{
      namespaceIDs:false
    }

  }

  return src("./src/image/css/*.svg")
    .pipe(imagemin([
      imagemin.svgo({plugins: [{
        removeAttrs: {
          attrs: ["width","height","g:fill", 'path:fill'] // удаляет width и height атрибуты (баг при конвертировании из ai в svg)
        }
    }]})
    ]))
    .pipe(svgSprite(svgConfig))
    .pipe(dest("./build/image/css"))
}

function watcher() {
  isSync && browserSync.init({
      server: {
        baseDir: "./build/"
      }
    });

  watch("./src/**/*.{less,css}", styles);
  watch("./src/index.html", html);
  watch("./src/**/*.js", js);
  watch(["./src/image/**/*.{png,jpg}","./src/image/pictureSVG/*.svg"], picture)
  watch("./src/image/sprite/*.svg", svgInlineSprite)
  watch("./src/image/CSS/*.svg", svgCSS)
}

exports.build = series(clear, parallel(styles, html, picture, svgInlineSprite, svgCSS, fonts, js));
exports.watch = series(clear, parallel(styles, html, picture, svgInlineSprite, svgCSS, fonts, js), watcher);
