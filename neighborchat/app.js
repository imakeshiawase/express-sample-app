var express = require('express');

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var session = require('express-session');
var passport = require('passport');
var flash = require('connect-flash');


var MongoStore = require('connect-mongo')(session);

var mongoose = require('mongoose');
mongoose.connect(
  'mongodb://localhost/jourcle_db',
  {useMongoClient: true}
);

var login2 = false;


var app = express();




// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');




// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));




// For Passport
app.use(session(
  {
    secret: 'keyboard cat',
    store: new MongoStore({
      mongooseConnection: mongoose.connection
    }),
    resave: true,
    saveUninitialized:true
  }
));

app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session




//Models
var models = require('./models');



//load passport strategies
require('./config/passport/passport')(passport, models.user);



//Sync Database
models.sequelize.sync()
.then(function(){
  console.log(
    'Database looks fine'
  )
})
.catch(function(err){
  console.log(
    err,
    "Something went wrong with the Database Update!"
  )
});



  app.get('/', function(req, res) {
    res.render('index');
  });


  app.get('/signup', function(req, res) {
    res.render('signup.ejs', { message: req.flash('signupMessage') });
  });

  app.post(
    '/signup',
    passport.authenticate(
      'local-signup',
      {
        successRedirect: '/dashboard',
        failureRedirect: '/signup'
      }
    )
  );


  app.get('/login', function(req, res) {
    res.render('login.ejs', { message: req.flash('loginMessage') });
  });

  app.post('/login', passport.authenticate(

    'local-login',

    {
      successRedirect: '/dashboard',
      failureRedirect: '/login'
    }

  ));


  app.get('/dashboard',isLoggedIn, function(req,res){
    res.render(
      'dashboard',
      { user2 : req.user }
    ); 
  });

  function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
      login2 = req.isAuthenticated();
      return next();
    }else {
      res.redirect('/login');
    }
  }


  app.get('/logout',function(req,res){
    req.session
    .destroy(function(err) {
      res.redirect('/');
    });
  });





app.get('/chat', function(req, res) {
  if (login2) return res.sendFile(__dirname + '/chat.html');
  res.redirect('/login');
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});




// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});






//./bin/wwwからコピーペースト始まり

var debug = require('debug')('crud-chat:server');
var http = require('http');



/**
 * Get port from environment and store in Express.
 */
var port = normalizePort(process.env.PORT || '7777');
app.set('port', port);



/**
 * Create HTTP server.
 */
var server = http.createServer(app);




//socket.ioのためのコード：始まり
//socket.ioを紐づける
var io = require('socket.io')(server);

var passportSocketIo = require("passport.socketio");

var username2 = '';

io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,       // the same middleware you registrer in express
  key:          'connect.sid',      // the name of the cookie where express/connect stores its session_id
  secret:       'keyboard cat',     // the session_secret to parse the cookie
  store:        new MongoStore({    // we NEED to use a sessionstore. no memorystore please
                  mongooseConnection: mongoose.connection
                }),
  success:      onAuthorizeSuccess, // *optional* callback on success - read more below
  fail:         onAuthorizeFail,    // *optional* callback on fail/error - read more below
}));


function onAuthorizeSuccess(data, accept){
  console.log(
    'successful connection to socket.io! '
  );
  accept();
}


function onAuthorizeFail(data, message, error, accept){
  if(error) throw new Error(message);
  console.log(
    'failed connection to socket.io:',
    message
  );
  accept(null, false);
}




//チャット機能：chat名前空間とfortune名前空間を設定
var chat = io.of('/chat').on('connection', function(socket) {;
  var room2 = ''
  var name2 = '';


  var id2 = socket.id;
  var message6 = "チャットしたい人達と申し合わせて、同じ部屋名を入力してください。";
  chat.to(id2).emit(
    'emit_from_server',
    {chat_msg_from_server : message6}
  );


  // roomへの入室は、「socket.join(room名)」
  socket.on('emit_from_client_join', function(data) {
    room2 = data.room
    socket.join(room2);
  });

  // emit_from_clientイベント・データを受信する
  socket.on('emit_from_client', function(data) {
    // emit_from_serverイベント・データを送信する
    chat.to(room2).emit('emit_from_server', {chat_msg_from_server : data.chat_msg_from_client});
  });

  // emit_from_client_broadcastイベント・データを受信し、送信元以外に送信する
  socket.on('emit_from_client_broadcast', function(data) {
    socket.broadcast.to(room2).emit('emit_from_server', {chat_msg_from_server : data.chat_msg_broadcast_from_client});
  });

  // emit_from_client_personalイベント・データを受信し、送信元のみに送信する
  socket.on('emit_from_client_personal', function(data) {
    var id = socket.id;
    room2 = data.room;
    name2 = data.name;
    var message4 = "あなたは、部屋名「" + room2 + "」に、" + name2 + "さんとして入室しました。"
    chat.to(id).emit('emit_from_server', {chat_msg_from_server : message4});
  });

  // dicconnectイベントを受信し、退出メッセージをログに送信する
  socket.on('disconnect', function() {
    if (name2 == '') {
      console.log("誰かがチャットページに来ましたが、入室せずに去りました。");
    } else {
      var message5 = name2 + "さんが退出しました。"
      chat.to(room2).emit('emit_from_server', {chat_msg_from_server : message5});
    }
  });
});


// 今日の運勢機能
var fortune = io.of('/fortune').on('connection', function(socket) {
    var id = socket.id;
    // 運勢の配列からランダムで取得してアクセスしたクライアントに送信する
    var fortunes = ["大吉", "吉", "中吉", "小吉", "末吉", "凶", "大凶"];
    var selectedFortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    var todaysFortune = "今日のあなたの運勢は… " + selectedFortune + " です。"
    fortune.to(id).emit('emit_from_server', {fortune_msg : todaysFortune});
});
//socket.ioのためのコード：終わり




/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);



/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}



/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}



/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

//./bin/wwwからコピーペースト終わり






module.exports = app;
