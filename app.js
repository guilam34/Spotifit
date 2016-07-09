var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var request = require('request');
var querystring = require('querystring');

var app = express();
var router = express.Router();

var config = require('./config');

var index = require('./routes/index')(router, request, config);
var user = require('./routes/user')(router, request, config);
var api = require('./routes/api')(router, request, config);
var auth = require('./routes/auth')(router, request, config);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules')))

app.use('/', index);
app.use('/api/1', api);
app.use('/api/1/user', user);
app.use('/auth', auth);

router.use(function(req, res, next){
  if(req.cookies.access_token == undefined){
    var refresh_token = req.cookies.refresh_token;
    var post_options = {
      url: 'https://accounts.spotify.com/api/token',    
      form: {
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(config.client_id + ':' + config.client_secret).toString('base64'))
      },
      json: true
    }

    request.post(post_options, function(error, response, body){
      if(!error && response.statusCode == 200){                       
        req.cookies.access_token = body.access_token; 
        res.cookie('access_token', body.access_token, { maxAge: (body.expires_in * 1000) });        
        next();
      }else{
        res.redirect('/');
      }
    });
  }else{
    next();
  } 
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;
