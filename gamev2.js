//Read in settings
var fs = require('fs');
var data = fs.readFileSync('./settings.json');
var settings = JSON.parse(data);

var TIMER = 30;
var CURRENT_CHANNELS = ["#twitchchessbot"];
var DEV_MODE = true;

//------ IRC ------
var irc = require("tmi.js");
var chat = new irc.client({
	options : {
		debug : true
	},
	connection : {
		random: "chat",
		reconnect: true
	},
	identity : {
		username: settings.chat_username,
		password: settings.oauth
	},
	channels : CURRENT_CHANNELS
});
var whisper = new irc.client({
		options : {
		debug : true
	},
	connection : {
		random: "group",
		reconnect: true
	},
	identity : {
		username: settings.chat_username,
		password: settings.oauth
	},
	channels : CURRENT_CHANNELS
});
chat.connect();
whisper.connect();

//------ CHESS ------
var Chess = require("./chess").Chess;
var chess = new Chess();

//------ SERVER / socket.io -----
var express = require('express');
var app = express();
var http = require('http').Server(app);
app.use(express.static('static'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

http.listen(3001, function(){
  console.log('listening on *:3001');
});

var io = require('socket.io')(http);

//------- MYSQL -----
var mysql = require('mysql');
var con = mysql.createPool(settings.database_info);
var db = {players: DEV_MODE ? "TestPlayers" : "Players", wins: DEV_MODE ? "TestWins" : "Wins"}

//-------------------------------------------------
//     Variables
//-------------------------------------------------

var state = -1;
var CHOOSE_PLAYER = 0;
var GAME_IN_PROGRESS = 1;
var GAME_IS_OVER = 3;

var moves = {};
var alreadyVoted = [];
var history = [];

var chatColors = [
	"#FF0000",
	"#0000FF",
	"#008000",
	"#B22222",
	"#FF7F50",
	"#9ACD32",
	"#FF4500",
	"#2E8B57",
	"#DAA520",
	"#D2691E",
	"#5F9EA0",
	"#1E90FF",
	"#FF69B4",
	"#8A2BE2",
	"#00FF7F"
];

CHECKMATE_IN_ONE = "8/8/k1K5/8/8/8/8/1Q6 w - - 2 13";

var playerCache = {};

io.on('connection', function(socket){
  console.log('a user connected');
  socket.emit('board', chess.fen());
  socket.emit('moves', history);
  socket.emit('votes', moves);
});

chat.on('chat', function(channel, user, message, self) {
	handleChat(user, message);
});

var handleChat = function(user, message) {
	var command = message.split(' ');
	switch(command[0]) {
		case '!team': {
			con.query("SELECT * FROM " + db.players + " WHERE username LIKE ?;", [user.username],
				function(err, result) {
					if (result.length > 0) {
						whisper.whisper(user.username, "You are on TEAM " + result[0].team.toUpperCase() + "!");
					} 
					else {
						whisper.whisper(user.username, "You are not on a team.  Type !join purple or !join black.");
					}
				});
		} break;
		case '!move': {
			var legalMove = chess.move(command[1], true);
			legalMove = legalMove ? legalMove : chess.move({from: command[1].substring(0,2).toLowerCase(), to: command[1].substring(2,4).toLowerCase()}, true);
			console.log(legalMove);
			if (legalMove) {
				var side = playerCache[user.username];
				if (side) {
					user.side = side;
					move(user, legalMove);
				}
				else {
					con.query("SELECT * FROM " + db.players + " WHERE username LIKE ?;", [user.username],
						function(err, result) {
							console.log(result);
							if (result.length > 0) {
								user.side = result[0].team;
								playerCache[user.username] = user.side;
								move(user, legalMove);
							}
							else {
								whisper.whisper(user.username, "You are not on a team.  Type !join purple or !join black.");
							}
						});
				}
			}
			else {
				whisper.whisper(user.username, "Invalid move.");
			}
		} break;
		case '!stats': {
			con.query("SELECT * FROM " + db.wins + ";", [], 
				function(err, result) {
					whisper.whisper(user.username, result[0].team.toUpperCase() + " has " + result[0].wins + " wins and " +
												   result[1].team.toUpperCase() + " has " + result[1].wins + " wins.");
				});
		} break;
		case '!join': {
			join(user, command[1]);
		} break;
		case '!help': {
			whisper.whisper(user.username, "(!join <team>): either '!join purple' or '!join black'. Be careful! You can't change sides once you've picked.");
			whisper.whisper(user.username, "(!move <move>): casts a move vote for your team. Check the channel info for move syntax.");
			whisper.whisper(user.username, "(!team): Tells you what team you're on (in case you forget).");
		} break;
		case '!moves': {
			whisper.whisper(user.username, chess.moves());
		}break;
	}
}

var move = function(user, move) {
	console.log(alreadyVoted, move);
	if (alreadyVoted.indexOf(user.username) < 0) {
		if (chess.turn() === 'w' && user.side === 'purple' || chess.turn() === 'b' && user.side === 'black') {
			if (moves[move.san]) {
				moves[move.san].votes += 1;
			}
			else {
				move.votes = 1;
				moves[move.san] = move; 
			}
			con.query("UPDATE " + db.players + " SET moves = moves + 1 WHERE username LIKE ?;", [user.username],
				function(err, result) {
					if (err) console.log(err);
				});
			io.emit('votes', moves);
		}
	}
	else {
		whisper.whisper(user.username, "It's not your turn!");
	}
}

var join = function(user, side) {
	if (side) {
		side = side.toLowerCase().trim();
		if (side === 'purple' || side === 'black') {
			con.query("INSERT INTO " + db.players + " (username, team, points, moves) VALUES (?, ?, 0, 0);", 
				[user.username, side],
				function(err, result) {
					if (err) console.log(err);
				});
		}
	}
}

var win = function(side) {
	con.query("INSERT INTO " + db.players + " (team, wins) VALUES (?, 1) ON DUPLICATE KEY UPDATE wins = wins + 1", [side]);
}

var loop;
var gameLoop = function() {
	console.log('gameLoop');
	console.log(moves, playerCache);

	var highestRatedMove = "";
	for (var san in moves) {
		if (highestRatedMove === "" || moves[highestRatedMove].votes < moves[san].votes) {
			highestRatedMove = san;
		}
	}
	if (highestRatedMove !== "") {
		var chosenMove = chess.move(highestRatedMove);
		history.push(moves[highestRatedMove]);
		console.log(chess.ascii());

		checkGameOver();
	}


	moves = {};
	alreadyVoted = [];

	io.emit('board', chess.fen());
	io.emit('moves', history);
	io.emit('votes', moves);

	startTimer();
};


var checkGameOver = function() {
	if (chess.game_over()) {
		if (chess.in_checkmate()) {
			win(chess.turn() === 'b' ? 'purple' : 'black');
		}

		chess = new Chess();
		history = [];
	}
}

var startTimer = function() {
	if (loop) {
		clearTimeout(loop);
	}
	loop = setTimeout(gameLoop, TIMER * 1000);
	io.emit('time', {startTime : Math.floor(new Date().getTime() / 1000), length: TIMER});
};

var start = function() {
	chess = new Chess();
	startTimer();
}

start();


