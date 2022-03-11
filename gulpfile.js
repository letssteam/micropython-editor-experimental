var gulp = require("gulp");
var del = require("del");
var source = require("vinyl-source-stream");

var tsify = require("tsify");
var browserify = require("browserify");

gulp.task('clean', function(){
    return del('dist/**', {force:true});
});

gulp.task("copy-static", function(){
    return gulp.src("static/**").pipe(gulp.dest("dist", {overwrite: true}));
});

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
        .pipe( gulp.dest("dist/js", {overwrite: true}) );
});

gulp.task("default", 
    gulp.series(
        "clean",
        gulp.parallel(
            "copy-static",
            "ts-compilation"
        )
    )
);

gulp.watch( "src/**", gulp.series("ts-compilation") )
gulp.watch( "static/**", gulp.series("copy-static") )
