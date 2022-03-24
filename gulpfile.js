// ====================================================
// ===  REQUIRE   ==================================
// ==============================================

var gulp = require("gulp");
var del = require("del");
var source = require("vinyl-source-stream");
var fs = require("fs");
var glob = require("glob");

var tsify = require("tsify");
var browserify = require("browserify");



// ====================================================
// ===  CONFIGURATION   ============================
// ==============================================

const DIST_PATH = "dist";
const ASSETS_PATH = `assets`
const FAT_PATH = `${ASSETS_PATH}/fat`;



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
 * Copy all static files/folders to DIST_PATH folder
 */
gulp.task("copy-static", function(){
    return gulp.src("static/**").pipe(gulp.dest(DIST_PATH, {overwrite: true}));
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
                        name: filename.substring(0, filename.lastIndexOf(".")),
                        extension: filename.substring(filename.lastIndexOf(".") + 1),
                        path: file.substring(DIST_PATH.length)
                    })
    });

    fs.writeFileSync(`${DIST_PATH}/${ASSETS_PATH}/fat.json`, JSON.stringify(result, null, "\t"));

    cb();
});

/**
 * Compile Typescript files
 */
gulp.task("ts-compilation", function(){
    return browserify({
            basedir: ".",
            debug: true,
            entries: "src/app.ts",
            cache: {},
            packageCache: {}
        })
        .plugin(tsify)
        .bundle()
        .pipe( source("app.js") )
        .pipe( gulp.dest(`${DIST_PATH}/js`, {overwrite: true}) );
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
if( process.argv.indexOf("--watch") != -1 ){
    console.log("\n\tWatching enabled\n");

    gulp.watch( "src/**", gulp.series("ts-compilation") );
    gulp.watch( "static/**", gulp.series("default") );
}