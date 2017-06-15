var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var schema = new Schema({
	url: {type: String, required: true},
	title: {type: String, required: true},
	createdAt: {type: Date, default: Date.now},
	createdById: {type: String, required: true},
	createdByName: {type: String, required: true},
	likes: [String]
});

module.exports = mongoose.model("Image", schema);