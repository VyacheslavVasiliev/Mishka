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
  return isDev? del(["./build/*.css","./build/index.html","./build/**/*.js"]): del("./build/**");
}

function styles() {
  return src("./src/styles/style.less")
    .pipe(gulpif(isDev, sourcemaps.init()))
    .pipe(less())
    // .pipe(gcmq())
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
  return src("./src/scripts/**/*.js")
    .pipe(dest("./build/scripts"));
}

// function picture(){
//   return src(["./src/image/*.{png,jpg,svg}","./src/image/pictureSVG/*.svg"], { base:"./src/image/" })
//     .pipe(gulpif(isProd, imagemin([
//       imagemin.jpegtran({progressive: true}), // Прогрессивное отображение jpg
//       imagemin.optipng({optimizationLevel: 3}),
//       imagemin.svgo()
//   ])))
//     .pipe(dest("./build/image"))
//     .pipe(webp({quality:90}))
//     .pipe(dest("./build/image"))
// }

function picture(){
  return src(["./src/image/**/*.{png,jpg}","./src/image/content-SVG/*.svg", './src/image/background-picture/*.svg'], { base:"./src/image/" })
    .pipe(imagemin([
      imagemin.jpegtran({progressive: true}), // Прогрессивное отображение jpg
      imagemin.optipng({optimizationLevel: 3}),
      imagemin.svgo({plugins: [{
          removeViewBox: false
        }]})
  ]))
    .pipe(dest("./build/image"))
}

function webpPicture(){
  return src("./src/image/content-picture/**/*", { base:"./src/image/content-picture/" })
    .pipe( webp({quality:90}))
    .pipe(dest("./build/image/content-picture/"))
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

  return src("./src/image/spriteSVG/*.svg")
    .pipe(imagemin([
      imagemin.svgo({plugins: [{
        removeAttrs: {
          attrs: 'path:fill' // удаляет всe fill атрибуты внутри path
        }
    }]})
    ]))
    .pipe(svgSprite(svgConfig))
    .pipe(dest("./build/image/spriteSVG"))
}

function svgCSS(){ // создает спрайты для встравивания в css background

  const svgConfig = {
    mode: {
      css: {
        bust: false,
        dest:"./", // уьирает лишнюю вложенность папок
        sprite:"./sprite.svg",
        render: {
          css: isDev // во время разработки появляется css файл, при минификации нет
        }
      }
    },
    svg:{
      namespaceIDs:false
    }
  }

  const svgoConfig = {
          plugins: [{
            removeAttrs: {
              attrs: "clip-path" // clip-path обрезал пополам спрайты 
            }
          }]
        }

  return src("./src/image/cssSpriteSVG/*.svg")
    .pipe(imagemin([
      imagemin.svgo(svgoConfig)
    ]))
    .pipe(svgSprite(svgConfig))
    .pipe(dest("./build/image/cssSpriteSVG"))
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
  watch(["./src/image/**/*.{png,jpg}","./src/image/content-SVG/*.svg", './src/image/background-picture/*.svg'], picture)
  watch("./src/image/sprite/*.svg", svgInlineSprite)
  watch("./src/image/CSS/*.svg", svgCSS)
}

exports.build = series(clear, parallel(styles, html, picture, webpPicture, svgInlineSprite, svgCSS, fonts, js));
exports.watch = series(clear, parallel(styles, html, js,), watcher);
exports.preflight = series(clear, parallel(styles, html, picture, webpPicture, svgInlineSprite, svgCSS, fonts, js));
exports.test = svgCSS;