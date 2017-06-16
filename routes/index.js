var express = require('express');
var router = express.Router();
var AWS = require('aws-sdk');
var multer  = require('multer');
var multerS3 = require('multer-s3');
var csrf = require("csurf");
var passport = require('passport');

var User = require("../models/user");
var Image = require("../models/image");

// AWS (Amazon Web Services) and MulterS3 configuration
AWS.config.update({
	accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  region: 'us-east-2'
});
var s3 = new AWS.S3();
var storage = multerS3({
  s3: s3,
  bucket: 'harryteo-pinterest-clone',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  // acl: 'bucket-owner-read',
  key: function (req, file, callback) {
    callback(null, "public/images/users/" + Date.now() + "_" + file.originalname);
  }
});
// Multer configuration
// var storage = multer.diskStorage({
//   destination: function (req, file, callback) {
//   	callback(null, './public/images/users/');
//   },
//   filename: function (req, file, callback) {
//     callback(null, Date.now() + "_" + file.originalname);
//   }
// });

var csrfProtection = csrf();
router.use(csrfProtection);

router.get('/', function(req, res, next) { // Home Page
	Image.find({}, null, {sort: {createdAt: -1}}, function(err, docs){
	  if (err) return res.status(500).render('error', { errorStatus: 500, errorMessage: "Internal Server Error - Please try again later" });
		var images = [];
		for(var i=0; i<docs.length; i++) {
			images.push({
				_id: docs[i]._id,
				url: docs[i].url,
				title: docs[i].title,
				createdById: docs[i].createdById,
				createdByName: docs[i].createdByName,
				likes: docs[i].likes,
				createdAt: docs[i].createdAt,
				alreadyFavorite: req.isAuthenticated() ? (docs[i].likes.indexOf(req.user._id)<0 ? false : true) : false
			});
		}		
		res.render('index', { images: images, csrfToken: req.csrfToken() });
	});
});

router.get("/profile/:id", function(req, res, next) { // Uer Profile Page
	var userId = req.params.id;
	User.findOne({ _id: userId }, function(err, user) {
		if (err) return res.status(404).render('error', { errorStatus: 404, errorMessage: "User Not Found!" });
		if (!user) return res.status(404).render('error', { errorStatus: 404, errorMessage: "User Not Found!" });

		var profileOwnerId = userId;
		var profileOwnerName = user.twitter.name ? user.twitter.name : user.local.name;
		var profileOwnerImageUrl = user.profilePictureUrl;

		Image.find({ createdById: userId }, null, {sort: {createdAt: -1}}, function(err, docs){
			var profileOwnerImages = [];
			for(var i=0; i<docs.length; i++) {
				profileOwnerImages.push({
					_id: docs[i]._id,
					url: docs[i].url,
					title: docs[i].title,
					createdById: docs[i].createdById,
					createdByName: docs[i].createdByName,
					likes: docs[i].likes,
					createdAt: docs[i].createdAt,
					alreadyFavorite: req.isAuthenticated() ? (docs[i].likes.indexOf(req.user._id)<0 ? false : true) : false
				});
			}

			Image.find({}, null, {sort: {createdAt: -1}}, function(err, docs){
				var favoriteImages = [];
				for(var i=0; i<docs.length; i++) {
					if(docs[i].likes.indexOf(userId)>=0) {
						favoriteImages.push({
							_id: docs[i]._id,
							url: docs[i].url,
							title: docs[i].title,
							createdById: docs[i].createdById,
							createdByName: docs[i].createdByName,
							likes: docs[i].likes,
							createdAt: docs[i].createdAt,
							alreadyFavorite: req.isAuthenticated() ? (docs[i].likes.indexOf(req.user._id)<0 ? false : true) : false
						});
					}
				}
				res.render("profile", { profileOwnerId: profileOwnerId , profileOwnerName: profileOwnerName, profileOwnerImageUrl: profileOwnerImageUrl, profileOwnerImages: profileOwnerImages, favoriteImages: favoriteImages, csrfToken: req.csrfToken() });
			});
		});
	});
});


router.get("/logout", isLoggedIn, function(req, res, next) {
	req.logout();
	res.redirect("/");
});

router.post("/newimage", isLoggedIn, function(req, res, next) { // Add New Image
	var newImageInput = req.body;
	var newImage = new Image({
		url: newImageInput.imageUrlInput,
		title: newImageInput.imageTitleInput,
		createdById: req.user._id,
		createdByName: req.user.twitter.name ? req.user.twitter.name : req.user.local.name,
		likes: []
	});
	newImage.save(function(err, savedImage) {
	  if (err) return res.status(500).render('error', { errorStatus: 500, errorMessage: "Internal Server Error - Please try again later" });
		res.send(savedImage);
	});
});

router.post("/editprofile", isLoggedIn, function (req, res, next) {
	var upload = multer({
		storage: storage,
		limits: { fileSize: 1000000 },
		fileFilter: function(req, file, callback) {
			var regex = /(\.jpg|\.jpeg|\.gif|\.png)$/i;
			var fileName = file ? file.originalname : "";
			if (!regex.exec(fileName)) { return callback(new Error('Only JPG, JPEG, GIF and PNG files are allowed.')); }
			else { callback(null, true); }
		}	
	}).single('profilePictureInputFile');	
  upload(req,res,function(err) {
  	// req.file will hold the uploaded file info
  	// req.body will hold the text fields
  	
    if(err) return res.send({msg: "Error", newUsername: null, newProfilePictureFilename: null});
   
		User.findById(req.user._id, function(err, user) {
			if (err) return res.status(404).render('error', { errorStatus: 404, errorMessage: "User Not Found!" });
			if (!user) return res.status(404).render('error', { errorStatus: 404, errorMessage: "User Not Found!" });  

			// user.profilePictureUrl = req.file ? "/images/users/" + req.file.filename : user.profilePictureUrl;
			user.profilePictureUrl = req.file ? req.file.location : user.profilePictureUrl;

			var currentUsername = user.twitter.name ? user.twitter.name : user.local.name;
			var newUsername = req.body.usernameInput.trim();

			if (currentUsername!==newUsername && newUsername!=="") {
				if (user.twitter.name) { user.twitter.name = newUsername; }
				else { user.local.name = newUsername; }				
			}

			user.save(function (err, updatedUser) {
	    	if (err) return res.status(500).render('error', { errorStatus: 500, errorMessage: "Internal Server Error - Please try again later" });

	    	if (currentUsername!==newUsername && newUsername!=="") {
					Image.find({ createdById: req.user._id }, null, function(err, images){
						for(var i=0; i<images.length; i++) {
							images[i].createdByName = updatedUser.twitter.name ? updatedUser.twitter.name : updatedUser.local.name;
							images[i].save();
						}
					  res.send({msg: "Success", newUsername: updatedUser.twitter.name ? updatedUser.twitter.name : updatedUser.local.name, newProfilePictureFilename: updatedUser.profilePictureUrl});				
		  		});
			  }
			  else {
			  	res.send({msg: "Success", newUsername: updatedUser.twitter.name ? updatedUser.twitter.name : updatedUser.local.name, newProfilePictureFilename: updatedUser.profilePictureUrl});
			  }
			});
  	});  
	});
});

router.put("/setfavorite", isLoggedIn, function(req, res, next) { // Add Poll Option(s)
	var imageId = req.body.imageId;
	Image.findById(imageId, function (err, image) {
	  if (err) return res.status(500).render('error', { errorStatus: 500, errorMessage: "Internal Server Error - Please try again later" });
	  if (!image) return res.status(500).render('error', { errorStatus: 500, errorMessage: "Internal Server Error - Please try again later" });

	  var alreadyFavorite;
	  var indexOfUserId = image.likes.indexOf(req.user._id);
	  
	  if (indexOfUserId<0) {
	  	alreadyFavorite = false;
	  	image.likes.push(req.user._id);
	  }
	  else {
	  	alreadyFavorite = true;
	  	image.likes.splice(indexOfUserId,1);
	  }

	  image.save(function (err, updatedImage) {
	    if (err) return res.status(500).render('error', { errorStatus: 500, errorMessage: "Internal Server Error - Please try again later" });
	    res.send({alreadyFavorite: alreadyFavorite, totalLikes: updatedImage.likes.length, currentUserId: req.user._id, updatedImage: updatedImage});
	  });
	});		
});

router.delete("/deleteimage", isLoggedIn, function(req, res, next) { // Delete Poll 
	var imageId = req.body.imageId;
	Image.findByIdAndRemove(imageId, function (err, image) {
	  if (err) return res.status(500).render('error', { errorStatus: 500, errorMessage: "Internal Server Error - Please try again later" });
	  if (!image) return res.status(500).render('error', { errorStatus: 500, errorMessage: "Internal Server Error - Please try again later" });
	  if (image.createdById != req.user._id) return res.status(500).render('error', { errorStatus: "", errorMessage: "Invalid Action!" });
    var response = {
      message: "Image successfully deleted",
      id: image._id
    };
    res.send(response);	  
	});
});

router.get("/signup", notLoggedIn, function(req, res, next) { // Sign Up Page
	var messages = req.flash("error");
	res.render("signup", { csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0 });
});

router.get("/signin", notLoggedIn, function(req, res, next) { // Sign In Page
	var messages = req.flash("error");
	res.render("signin", { csrfToken: req.csrfToken(), messages: messages, hasErrors: messages.length>0 });
});

router.post("/signup", notLoggedIn, passport.authenticate("local.signup", { // If this second argument is executed <=> failure of authentication, the third argument(function) will not be executed
	successRedirect: "/",
	failureRedirect: "/signup",
	failureFlash: true
}));

router.post("/signin", notLoggedIn, passport.authenticate("local.signin", { 
	successRedirect: "/",
	failureRedirect: "/signin",
	failureFlash: true
}));

// Twitter Authentication
// Redirect the user to Twitter for authentication.  When complete, Twitter will redirect the user back to the application at /auth/twitter/callback
router.get('/auth/twitter', notLoggedIn, passport.authenticate('twitter'));
// Finish the authentication process by attempting to obtain an access token. If access was granted, the user will be logged in. Otherwise, authentication has failed.
router.get('/auth/twitter/callback', notLoggedIn, passport.authenticate('twitter', {
  successRedirect: '/',
  failureRedirect: '/signin' 
}));

module.exports = router;

function isLoggedIn(req, res, next) { // We will use this "middleware" function to all the routes we want to protect!
	if (req.isAuthenticated()) { // The "isAuthenticated" method is provided by the "passport" package
		return next();
	}
	res.redirect("/");
}

function notLoggedIn(req, res, next) {
	if (!req.isAuthenticated()) {
		return next();
	}
	res.redirect("/");
}