// ====================================================
// ===  REQUIRE   ==================================
// ==============================================

var gulp = require("gulp");
var del = require("del");
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");
var fs = require("fs");
var glob = require("glob");

var js_minify = require("gulp-minify");
var clean_css = require("gulp-clean-css");
var add_src = require("gulp-add-src");

var tsify = require("tsify");
var browserify = require("browserify");
var replace = require("gulp-replace");
var spawnSync = require("child_process").spawnSync;

// ====================================================
// ===  UTIL FUNTIONS   ============================
// ==============================================

function is_argument_found( arg ){
    return process.argv.indexOf(arg) != -1;
}

function git_last_sha(){
    return spawnSync("git", ["--no-pager", "log", "-n1", "--format=format:%h_%cs"]).stdout.toString();
}

function git_current_branch(){
    let branch = spawnSync("git", ["--no-pager", "branch", "--show-current", "--format=%(fieldname)"]).stdout.toString().replace(/[\r\n]*/g, "");
    return (branch.length == 0) ? "DETACH" : branch;
}

// ====================================================
// ===  CONFIGURATION   ============================
// ==============================================

const DIST_PATH = "dist";
const ASSETS_PATH = `assets`
const FAT_PATH = `${ASSETS_PATH}/fat`;


const IS_RELEASE = is_argument_found("--release");
const LAST_GIT_SHA = `${IS_RELEASE ? "REAL__" : "DEV__"}${git_current_branch()}_${git_last_sha()}`;


const APP_VERSION_TAG = "%%APP_VERSION%%";
// ====================================================
// ===  GULP TASK   ================================
// ==============================================

/**
 * Clean the DIST_PATH folder
 */
gulp.task('clean', function(){
    return del(`${DIST_PATH}/**`, {force:true});
});

/**
 * Processing CSS files
 */
gulp.task("static-css-files", function(){
    let g = gulp.src("static/css/*.css");

    if( IS_RELEASE ){
        g = g.pipe( clean_css() );
    }

    return g.pipe( add_src("static/css/*/**") )
            .pipe( gulp.dest(DIST_PATH + "/css", {overwrite: true}));
})

/**
 * Processing JS files
 */
gulp.task("static-js-files", function(){
    let g = gulp.src("static/js/*.js")
                .pipe( replace(APP_VERSION_TAG, LAST_GIT_SHA) );

    if( IS_RELEASE ){
            g = g.pipe( js_minify({
                noSource: true,
                ext:{ min: ".js" }
            }));
    }

    return g.pipe( add_src("static/js/*/**"))
            .pipe( gulp.dest(DIST_PATH + "/js", {overwrite: true}))
})

/**
 * Processing all pther static files
 */
gulp.task("static-files", function(){
    return gulp.src( "static/**", {ignore: ["static/css/**", "static/js/**"]} )
               .pipe( replace(APP_VERSION_TAG, LAST_GIT_SHA) )
               .pipe( gulp.dest(DIST_PATH, {overwrite: true}) );
})

/**
 * Copy all static files/folders to DIST_PATH folder
 */
gulp.task("copy-static", function(...args){
    gulp.parallel(
        "static-files",
        "static-css-files",
        "static-js-files"
    )(...args);
});

/**
 * Generate fat.json , that contains the list of files in the FAT_PATH folder (used by app to generate MicroPython's FAT)
 */
gulp.task("generate_json_fat", async function(cb){
    let files = glob.sync(`${DIST_PATH}/${FAT_PATH}/*`, {nodir: true});
    let result = [];

    files.forEach( (file) => {

        let filename = file.substring( file.lastIndexOf("/") + 1);

        result.push({ 
                        name: filename.substring(0, filename.lastIndexOf(".")).toUpperCase(),
                        extension: filename.substring(filename.lastIndexOf(".") + 1).toUpperCase(),
                        isBinary: fs.readFileSync(file, {encoding: null, flag: "r"}).slice(0, 300).findIndex( (value) => value == 0x00 ) != -1, // If there is a null (0x00) character in the first 300, so it's a binary file
                        path: "." + file.substring(DIST_PATH.length)
                    })
    });

    fs.writeFileSync(`${DIST_PATH}/${ASSETS_PATH}/fat.json`, JSON.stringify(result, null, IS_RELEASE ? "" : "\t"));

    cb();
});

/**
 * Compile Typescript files
 */
gulp.task("ts-compilation", function(){
    var b = browserify({
            basedir: ".",
            debug: !IS_RELEASE,
            entries: "src/app.ts",
            cache: {},
            packageCache: {},
        })
        .plugin(tsify)
        .bundle()
        .pipe( source("app.js") )
        .pipe( replace("%%APP_VERSION%%", LAST_GIT_SHA) );

    if( IS_RELEASE ){
        b = b.pipe( buffer() )
             .pipe( js_minify({
                noSource: true,
                ext:{ min: ".js" }
             }));
    }

    return b.pipe( gulp.dest(`${DIST_PATH}/js`, {overwrite: true}) );
});

/**
 * Default task
 */
gulp.task("default", 
    gulp.series(
        "clean",
        gulp.parallel(
            gulp.series("copy-static", "generate_json_fat"),
            "ts-compilation"
        )
    )
);

// Start watch if arg '--watch' is present
if( is_argument_found("--watch") ){
    console.log("\n\tWatching enabled\n");

    gulp.watch( "src/**", gulp.series("ts-compilation") );
    gulp.watch( "static/**", gulp.series("default") );
}