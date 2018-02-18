'use strict';

const config = require('../config');
const Mongoose = require('mongoose');

// mpromise (mongoose's default promise library) is deprecated,
// Plug-in your own promise library instead.
// Use native promises
Mongoose.Promise = global.Promise;

// Connect to the database
Mongoose.connect(config.dbUrl);

// Throw an error if the connection fails
Mongoose.connection.on('error', (err) => {
	if(err) throw err;
});

module.exports = { Mongoose,
	models: {
		game: require('./game.js'),
	}
};
