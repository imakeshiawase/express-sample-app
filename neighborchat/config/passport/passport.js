//load bcrypt
var bCrypt = require('bcrypt-nodejs');




module.exports = function(passport,user){  //0



  var User = user;
  var LocalStrategy = require('passport-local').Strategy;



  passport.serializeUser(function(user, done) {
        done(null, user.id);
  });



  passport.deserializeUser(function(id, done) {
    User.findById(id).then(function(user) {
      if(user){
        done(null, user.get());
      }
      else{
        done(user.errors, null);
      }
    });
  });



  passport.use('local-signup', new LocalStrategy( //1


    {
      usernameField : 'username',
      passwordField : 'password',
      passReqToCallback : true //req全てをコールバック関数へ渡すよという、しるし
    },


    function(req, username, password, done){ //2 コールバック関数の始まり

      var generateHash = function(password) {
        return bCrypt.hashSync(
          password,
          bCrypt.genSaltSync(8),
          null
        );
      };

      User.findOne({where:
        { username : username }
      })
      .then(function(user){ //3
        if(user){

          return done(null, false,
            req.flash(
              'signupMessage',
              'そのユーザーネームはすでに使われています。.'
            )
          );

        }else{ //4

          var userPassword = generateHash(password);

          var data = {
            username : username,
            password : userPassword
          };

          User.create(data)
          .then(function(newUser){  //5
            if(!newUser){
              return done(null,false);
            }
            if(newUser){
              return done(null,newUser);
            }
          }); //5

        } //4
      }); //3

    } //2 コールバック関数の終わり


  ));//1



  //LOCAL SIGNIN
  passport.use('local-login', new LocalStrategy( //1


    {
      usernameField : 'username',
      passwordField : 'password',
      passReqToCallback : true //req全てをコールバック関数へ渡すよという、しるし
    },


    function(req, username, password, done) { //2 コールバック関数の始まり

      var User = user;

      var isValidPassword = function(userpass, password){
        return bCrypt.compareSync(password, userpass);
      }

      User.findOne({ where :
        { username : username }
      })
      .then(function (user) { //3
        if (!user) {

          return done(null, false,
            req.flash(
              'loginMessage',
              'そのユーザーネームは見つかりませんでした。'
            )
          );

        }
        if (!isValidPassword(user.password, password)) {

          return done(null, false,
            req.flash(
              'loginMessage',
              '間違ったパスワードが入力されました。'
            )
          );

        }
        var userinfo = user.get();
        return done(null, userinfo);
      }) //3
      .catch(function(err){ //4
        console.log("Error:",err);

        return done(null, false,
          req.flash(
            'loginMessage',
            '何らかの問題が起こり、ログインできませんでした。'
          )
        );

      }); //4

    } //2 コールバック関数の終わり


  )); //1



} //0