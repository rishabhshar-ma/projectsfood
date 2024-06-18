
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fileUpload = require("express-fileupload");
const session = require("express-session");

/* *
* * Import Route Modules
* */
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin')

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

/* *
* * Session Configuration
* */
app.use(
    session({
        key: "aahar",
        secret: "abc@123",
        saveUninitialized: true,
        resave: true,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

/* *
* * Serve static files from the 'public' directory
* */
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(cookieParser());
app.use(logger('dev'));
app.use(fileUpload({}));
app.use(express.urlencoded({extended: false}));

/* *
* * Use Route Modules
* */
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/admin', adminRouter);

/* *
* *  Handle 404 errors
* */
app.use((req, res) => {
    res.status(404).render('pageNotFound', {title: "404", text: "Page Not Found"});
});

// app.use(function (req, res, next) {
//     next(createError(404));
// });

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
