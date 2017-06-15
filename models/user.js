var mongoose = require("mongoose");
var bcrypt = require("bcrypt-nodejs");

var Schema = mongoose.Schema;

var schema = new Schema({
	createdAt: {type: Date, default: Date.now},
	profilePictureUrl: {type: String, default: "/images/users/user.png"},
	local: {
		email: String,
		password: String,
		name: String
	},
	twitter: {
		twitterId: String,
		token: String,
		// email: String,
		name: String
	}
});

schema.methods.encryptPassword = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

schema.methods.validPassword = function(password) {
	return bcrypt.compareSync(password, this.local.password); // "this", refers to the current user
};

module.exports = mongoose.model("User", schema);