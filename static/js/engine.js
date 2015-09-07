var mouse = {
	x: 0,
	y: 0
}
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var rect = canvas.getBoundingClientRect();

var images = {};

var atlas =  new Image();
atlas.onload = function() {
	$.getJSON("../img/atlas.json", loadImages);
}
atlas.src = "../img/atlas.png";

var loadImages = function(json) {
	for (var key in json.frames) {
		var spt = {};
		spt.x =	json.frames[key].frame["x"];
		spt.y = json.frames[key].frame["y"];
		spt.w = json.frames[key].frame["w"];
		spt.h = json.frames[key].frame["h"];
		spt.sh = 20;
		spt.sw = (spt.sh*spt.w)/spt.h;
		spt.cx = spt.x + spt.w * .5;
		spt.cy = spt.y + spt.h * .5;

		images[key] = spt;
	}
}

var board = new Image();
board.onload = function() {
	images["board.png"] = board;
}
board.src = "../img/board.png";

var spriteInfo = function(san) {
	return images[fenToPNG[san]];
}

var colors = {
	purple : "#714bbc",
	black : "black",
	green : "#3eb251"
};

var fenToPNG = {
	"P" : "pawn_p.png",
	"N" : "knight_p.png",
	"B" : "bishop_p.png",
	"R" : "rook_p.png",
	"Q" : "queen_p.png",
	"K" : "king_p.png",

	"p" : "pawn_b.png",
	"n" : "knight_b.png",
	"b" : "bishop_b.png",
	"r" : "rook_b.png",
	"q" : "queen_b.png",
	"k" : "king_b.png"
}

var CHOOSE_PLAYER = 0;
var GAME_IN_PROGRESS = 1;
var GAME_IS_OVER = 2;

var OVERLAY_TEXT_1 = "Type '1' in chat for a chance to";
var OVERLAY_TEXT_2 = " play against Twitch!";

var alertAlpha = 0.0;

var Game = {
	FPS: 20,
	Tick: function(){
		Game.Update();
		Game.Draw();
	},
	Draw: function(){
		if (images["board.png"] != null) {
			ctx.drawImage(board, 0, 0);
			Game.DrawChessboard();
			Game.DrawMoves();
			Game.DrawCaptures();
			Game.DrawPlayerNames();
			Game.DrawText("55pt Pricedown", turn, 830-Game.TextSize("55pt Pricedown", turn).width, 1045, colors[turn]);
			Game.DrawVotes();
			Game.DrawTimer();
			Game.DrawAlert();
		}
	},
	Update: function(){
		Game.UpdateAlert();
	},
	Distance: function(x,y,x2,y2){
		var answer = (x2 - x)*(x2 - x) + (y2 - y)*(y2 - y);
		answer = Math.round(Math.sqrt(answer));
		return answer;
	},
	Random: function(min,max){
		return Math.floor(Math.random() * (max - min + 1)) + min;
	},

	DrawChessboard: function() {
		var x = 1024;
		var y = 60;
		var bigfen = fen.split(" ");
		var rows = bigfen[0].split('/');
		for (var i = 0; i < rows.length; i++) {
			var row = rows[i];
			for (var j = 0; j < row.length; j++) {
				var piece = row.charAt(j);
				var blank = parseInt(piece);
				if (isNaN(blank)) {
					Game.DrawSprite(fenToPNG[piece], x, y, true);
					x += 120;
				}
				else {
					x += 120 * blank;
				}
			}
			x = 1024;
			y+=119;
		}
	},
	DrawMoves: function() {
		var y = 351;
		var start = moves.length % 2 == 0 ? moves.length -2 : moves.length-1;
		var cap = moves.length-12 > 0 ? moves.length-12 : 0;
		for (var i = start; i >= cap; i-=2) {
			//White move
			

			//piece
			var move = moves[i];
			var piece = move.piece;
			Game.DrawSprite(fenToPNG[piece.toUpperCase()], 107, y, true, false, 45); 
			//votes
			Game.DrawCircle(40, y, 25, "#3eb251");
			//text
			Game.DrawText("21pt Helvetica", move.votes, 39, y+9, "white", true);


			//text
			var textSize = Game.TextSize("20pt Pricedown", move.to);
			Game.DrawText("38pt Pricedown", move.to, 134, y + 18, "#714bbc");
			//capture
			if (move.captured) {
				x = 225;
				Game.DrawSprite(fenToPNG[move.captured], x, y, true, false, 45);
			}


			//black move
			move = moves[i+1];
			if (move) {
				//piece
				piece = move.piece;
				var pieceInfo = spriteInfo(piece);
				Game.DrawSprite(fenToPNG[piece], 395, y, true, false, 45);
				
				//votes
				Game.DrawCircle(461, y, 25, "#3eb251");
				//text
				Game.DrawText("21pt Helvetica", move.votes, 460, y+9, "white", true);

				//text
				var textSize = Game.TextSize("20pt Pricedown", move.to);
				Game.DrawText("38pt Pricedown", move.to, 316, y + 18, "black");
				//capture
				if (move.captured) {
					var x  = 170 + Game.TextSize("20pt Pricedown", move.to).width;
					Game.DrawSprite(fenToPNG[move.captured.toUpperCase()], 280, y, true, false, 45);
				}
			}
			y += 70;
		}
	},
	DrawCaptures: function() {
		var y = 772;
		for (var i = 0; i < w_cap.length; i+=4) {
			var cap = w_cap.length > i+4 ? i+4 : w_cap.length; 
			var x = 105;
			for (var j = i; j < cap; j++) {
				var piece = w_cap[j];
				Game.DrawSprite(fenToPNG[piece], x, y, true, false, 30);
				x += 40;
			}
			y += 39;
		}

		var y = 772;
		for (var i = 0; i < b_cap.length; i+=4) {
			var cap = b_cap.length > i+4 ? i+4 : b_cap.length; 
			var x = 279;
			for (var j = i; j < cap; j++) {
				var piece = b_cap[j];
				Game.DrawSprite(fenToPNG[piece.toUpperCase()], x, y, true, false, 30);
				x += 40;
			}
			y += 40;
		}
	},
	DrawPlayerNames: function() {
		Game.DrawText("27pt Pricedown", "purple", 107, 310, "#714bbc");
		Game.DrawText("27pt Pricedown", "black", 334, 310, 'black', true);
	},
	DrawTimer: function() {
		
		var seconds = timer.startTime + timer.length - Math.floor(new Date().getTime()/1000);
		seconds = seconds > 0 ? seconds : 0;

		Game.DrawSprite("timer.png", 80, 980);
		Game.DrawText("40pt Pricedown", seconds % 30, 160, 1030, colors.black);
	},
	DrawVotes: function() {
		var voteList = [];		

		for (var key in votes) {
			if (voteList == []) {
				voteList.push(votes[key]);
			}
			else {
				for (var i = 0; i < voteList.length; i++) {
					if (votes[key].votes > voteList[i].votes) {
						voteList.splice(i,0,votes[key]);
						break;
					}
				}
				if (voteList.indexOf(votes[key]) == -1) {
					voteList.push(votes[key]);
				}			
			}
		}

		var y = 351;
		var cap = voteList.length > 5 ? 5 : voteList.length;
		for (var i = 0; i < voteList.length; i++) {
			var move = voteList[i];
			var piece = move.color == 'b' ? move.piece : move.piece.toUpperCase();
			Game.DrawSprite(fenToPNG[piece], 558, y, true, false, 45);

			var color = move.color == 'b' ? 'black' : 'purple';
			Game.DrawText("34pt Pricedown", move.to, 590, y + 15, colors[color]);

			//votes
			Game.DrawCircle(687, y, 26, colors.green);
			//text
			Game.DrawText("21pt Helvetica", move.votes, 685, y+9, "white", true);

			y += 66;
		}
	},
	DrawOverlay: function() {
		ctx.beginPath();
		ctx.rect(0,0,1920,1080);
		ctx.closePath();
		ctx.fillStyle ='rgba(92,92,92,.5)';
		ctx.fill();

		Game.DrawSprite('overlay.png', 960, 420, true);

		Game.DrawText('35pt OpenSans', OVERLAY_TEXT_1, 960, 230, 'white', true);
		Game.DrawText('35pt OpenSans', OVERLAY_TEXT_2, 960, 290, 'white', true);

		for (var i = 0; i < players.length; i++) {
			var p = players[i];
			p.color = p.color ? p.color : colors[Math.floor(Math.random() * colors.length)];
			Game.DrawText('12pt Helvetica-Neue', p['display-name'], p.x, p.y, p.color);
		}

		Game.DrawText('100pt Pricedown', players.length, 960, 480, 'white', true);
		Game.DrawText('40pt OpenSans', 'Players', 960, 585, 'white', true);

	},
	DrawSprite: function(name, x, y, center, small, custom_height) {
		var spt = images[name];
		if (spt != null) {
			var width = spt.w;
			var height = spt.h;
			if (small) {
				height = spt.sh;
				width = spt.sw;
			}
			if (custom_height) {
				height = custom_height;
				width = (custom_height*spt.w)/spt.h;
			}

			if (center) {
				ctx.drawImage(atlas, spt.x, spt.y, spt.w, spt.h, x-width/2, y-height/2, width, height);
			}
			else {
				ctx.drawImage(atlas, spt.x, spt.y, spt.w, spt.h, x, y, width, height);
			}
		}

	},
	DrawCircle: function(x, y, radius, color) {
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();
	},
	DrawText: function(font, text, x, y, color, center) {
		ctx.font = font;
		ctx.fillStyle = color ? color : "black";
		x = center ? x - Game.TextSize(font, text).width/2 : x;
		ctx.fillText(text, x, y);
	},

	TextSize: function(font, text) {
		ctx.font = font;
		return ctx.measureText(text);
	},
	SizeTextToWidth: function(text, size) {
		var fontSize = 50;
		var currentWidth = Game.TextSize(fontSize+"pt Helvetica-Neue", text).width;
		while (currentWidth > size) {
			fontSize--;
			currentWidth = Game.TextSize(fontSize+"pt Helvetica-Neue", text).width;
		}
		return fontSize;
	},
	UpdateAlert: function() {
		var rate =  .05;
		if (alertInProgress) {
			if (alertAlpha === 0) {
				setTimeout(function() { alertInProgress = false }, 10 * 1000);
			}
			if (alertAlpha < 1) {
				alertAlpha += rate;
			}
			if (alertAlpha > 1) {
				alertAlpha = 1;
			}
		}
		else {
			if (alertAlpha > 0) {
				alertAlpha -= rate;
			}
			if (alertAlpha < 0) {
				alertAlpha = 0;
			}
		}
	},
	DrawAlert: function() {
		ctx.save();
		ctx.globalAlpha = alertAlpha;
		Game.DrawSprite('alert.png', 420, 1014, true);
		var size = Game.SizeTextToWidth(alertText, 250);
		Game.DrawText(size +'pt Helvetica-Neue', alertText, 420, 1030, 'white', true);
		ctx.restore();
	}
};
setInterval(Game.Tick,1000/Game.FPS);
document.onkeydown = function(e){
	e = e || window.event;
	c = e.keyCode;
};
document.onkeyup = function(e){
	e = e || window.event;
	c = e.keyCode;
};
document.onmousemove = function mouseMove(e){
	e = e || window.event;
	mouse.x = e.pageX - rect.left || e.clientX - rect.left;
	mouse.y = e.pageY - rect.top || e.clientY - rect.top;
};
document.onmousedown = function mouseDown(e){
	e = e || window.event;
	mouse.down = true;
};
document.onmouseup = function mouseUp(e){
	e = e || window.event;
	mouse.down = false;
};