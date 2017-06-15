var passport = require("passport"); // Note that by requiring "passport" here, after defining it to app.js, we are not creating 2 different instances and hence the configuration applies
var User = require("../models/user");
var LocalStrategy = require("passport-local").Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;

passport.serializeUser(function(user, done) { // This will basically tell the "passport" how to store the user in the session
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, user) {
		done(err, user);
	});
});

passport.use("local.signup", new LocalStrategy({
	usernameField: "email",
	passwordField: "password",
	passReqToCallback: true
}, function(req, email, password, done) {
	req.checkBody("email", "Invalid email").notEmpty().isEmail(); // We get this functionality from the "express-validator" package
	req.checkBody("password", "Invalid password").notEmpty().isLength({min:4}); // We get this functionality from the "express-validator" package
	var errors = req.validationErrors(); // We get this functionality from the "express-validator" package
	if (errors) {
		var messages = [];
		errors.forEach(function(error) {
			messages.push(error.msg);
		});
		return done(null, false, req.flash("error", messages));
	}
	User.findOne({"local.email": email}, function(err, user) {
		if(err) {
			return done(err);
		}
		if(user) {
			return done(null, false, {message: "Email is already in use."}); // By using the "false" argument, we are saying although no error occured we are not succesful since the email already exists
		}
		var newUser = new User();
		newUser.local.email = email;
		newUser.local.name = email.split("@")[0];
		newUser.local.password = newUser.encryptPassword(password); // Note: the "encryptPassword" method was implemented in "user.js"
		newUser.save(function(err, result) {
			if(err) {
				return done(err);
			}
			return done(null, newUser);
		});
	});
}));

passport.use("local.signin", new LocalStrategy({
	usernameField: "email",
	passwordField: "password",
	passReqToCallback: true	
}, function(req, email, password, done) {
	req.checkBody("email", "Invalid email").notEmpty().isEmail(); // We get this functionality from the "express-validator" package
	req.checkBody("password", "Invalid password").notEmpty(); // We get this functionality from the "express-validator" package
	var errors = req.validationErrors(); // We get this functionality from the "express-validator" package
	if (errors) {
		var messages = [];
		errors.forEach(function(error) {
			messages.push(error.msg);
		});
		return done(null, false, req.flash("error", messages));
	}	
	User.findOne({"local.email": email}, function(err, user) {
		if(err) {
			return done(err);
		}
		if(!user) {
			return done(null, false, {message: "User not found."}); // By using the "false" argument, we are saying although no error occured we are not succesful since the email already exists
		}
		if(!user.validPassword(password)) { // The "validPassword" function was defined in "user.js"
			return done(null, false, {message: "Wrong password."});
		}
		return done(null, user);
	});			
}));

passport.use("twitter", new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: "http://localhost:8000/auth/twitter/callback"
    // callbackURL: "https://harryteo-votingapp.herokuapp.com/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
  	User.findOne({"twitter.twitterId": profile.id}, function(err, user){
  		if (err) { return done(err); }
  		if (user) { // Revisiting User -> Already exists in database
  			return done(null, user);
  		}
  		else { // First visit of this user
				var newUser = new User();
				newUser.twitter.token = token;
				newUser.twitter.twitterId = profile.id;
				// newUser.twitter.email = profile.emails ? profile.emails[0].value : null;
				newUser.twitter.name = profile.displayName;
				
				newUser.save(function(err, result) {
					if(err) { return done(err); }
					return done(null, newUser);
				});  			
  		}
  	});
  }
));