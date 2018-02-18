let mouse = {
	x: 0,
	y: 0
};

const canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var rect = canvas.getBoundingClientRect();

var images = {};

var atlas =  new Image();
atlas.onload = function() {
	$.getJSON("../img/atlas.json", loadImages);
};
atlas.src = "../img/atlas.png";

var loadImages = function(json) {
	for (var key in json.frames) {
		var spt = {};
		spt.x =	json.frames[key].frame.x;
		spt.y = json.frames[key].frame.y;
		spt.w = json.frames[key].frame.w;
		spt.h = json.frames[key].frame.h;
		spt.sh = 20;
		spt.sw = (spt.sh*spt.w)/spt.h;
		spt.cx = spt.x + spt.w * 0.5;
		spt.cy = spt.y + spt.h * 0.5;

		images[key] = spt;
	}
};

var board = new Image();
board.onload = function() {
	images["board.png"] = board;
};
board.src = "../img/board.png";

var spriteInfo = function(san) {
	return images[fenToPNG[san]];
};

var colors = {
	purple : "#714bbc",
	black : "black",
	green : "#3eb251"
};

var fenToPNG = {
	"P" : "pawn_w.png",
	"N" : "knight_w.png",
	"B" : "bishop_w.png",
	"R" : "rook_w.png",
	"Q" : "queen_w.png",
	"K" : "king_w.png",

	"p" : "pawn_b.png",
	"n" : "knight_b.png",
	"b" : "bishop_b.png",
	"r" : "rook_b.png",
	"q" : "queen_b.png",
	"k" : "king_b.png"
};

var OVERLAY_TEXT_1 = "Type '1' in chat for a chance to";
var OVERLAY_TEXT_2 = " play against Twitch!";

var Game = {
	FPS: 20,
	Tick: function() {
		Game.Draw();
	},
	Draw: function(){
		if (images["board.png"] != null) {
			ctx.drawImage(board, 0, 0);
			Game.DrawChessboard(840, 0, "large", turn == "b");
			Game.DrawChessboard(394, 23, "small", turn == "w");
			Game.DrawMoves();
			Game.DrawCaptures();
			Game.DrawPlayerNames();
			Game.DrawText("55pt Pricedown", turn, 830-Game.TextSize("55pt Pricedown", turn).width, 1045, colors[turn]);
			Game.DrawVotes();
			Game.DrawTimer();
			if (state != "IN_PROGRESS") {
				Game.DrawOverlay();
			}
		}
	},
	DrawChessboard: function(x, y, size, reversed) {
		let originalY = y;
		let originalX = x;
		// Draw large board
		Game.DrawSprite(`board-${size}${reversed ? "-reversed" : ""}.png`, x, y);

		let squareSize = (size == "large" ? 120 : 47);
		let tempX = x + squareSize;
		let rows = fen.split(" ")[0].split('/'); // rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1 -> [rnbqkbnr, pppppppp, 8, 8, 8, 8, PPPPPPPP, RNBQKBNR]

		if (moves.length > 0) {
			let drawHighlight = (xOffset, yOffset) => { Game.DrawRect(originalX + (squareSize * xOffset), originalY + (squareSize * yOffset), squareSize, squareSize, 'rgba(67, 191, 88, .75)'); };
			let previousMove = moves[moves.length - 1];
			if (!reversed) {
				drawHighlight(previousMove.from.charCodeAt(0) - 96,  8 - previousMove.from.charAt(1));
				drawHighlight(previousMove.to.charCodeAt(0) - 96, 8 - previousMove.to.charAt(1));
			} else {
				drawHighlight(8 - (previousMove.from.charCodeAt(0) - 97), previousMove.from.charAt(1) - 1);
				drawHighlight(8 - (previousMove.to.charCodeAt(0) - 97), previousMove.to.charAt(1) - 1);
			}
		}

		if (reversed) {
			for (let i = rows.length - 1; i >= 0; i--) {
				let row = rows[i];
				for (let j = row.length - 1; j >= 0; j--) {
					let piece = row.charAt(j);
					let emptySpaces = parseInt(piece);
					if (isNaN(emptySpaces)) {
						Game.DrawSprite(fenToPNG[piece], tempX, y, false, false, squareSize);
						tempX += squareSize;
					}
					else {
						tempX += squareSize * emptySpaces;
					}
				}
				tempX = x + squareSize;
				y += squareSize;
			}
		} else {
			for (let i = 0; i < rows.length; i++) {
				let row = rows[i];
				for (let j = 0; j < row.length; j++) {
					let piece = row.charAt(j);
					let emptySpaces = parseInt(piece);
					if (isNaN(emptySpaces)) {
						Game.DrawSprite(fenToPNG[piece], tempX, y, false, false, squareSize);
						tempX += squareSize;
					}
					else {
						tempX += squareSize * emptySpaces;
					}
				}
				tempX = x + squareSize;
				y += squareSize;
			}
		}
	},
	DrawMoves: function() {
		let y = 322;
		let x = 60;
		// Assume white starts, so find the earliest white move.
		let whiteStart = moves.length % 2 == 0 ? moves.length - 2 : moves.length - 1;
		// Only display a certain amount of the most recent moves.
		let moveCap = moves.length - 12 > 0 ? moves.length - 12 : 0;
		for (let i = whiteStart; i >= moveCap; i -= 2) {
			//White move
			//piece
			let move = moves[i];
			let piece = move.piece;
			Game.DrawSprite(fenToPNG[piece.toUpperCase()], x, y, false, false, 45); 
			//text
			Game.DrawText("bold 30px Helvetica-Neue", move.to.toUpperCase(), x + 45, y + 36, "#714bbc");
			//capture
			if (move.captured) {
				Game.DrawSprite(fenToPNG[move.captured], x + 88, y, false, false, 45);
			}


			//black move
			move = moves[i+1];
			if (move) {
				//piece
				piece = move.piece;
				Game.DrawSprite(fenToPNG[piece], 298, y, false, false, 45);
				//text
				Game.DrawText("bold 30px Helvetica-Neue", move.to.toUpperCase(), 260, y + 36, "black");
				//capture
				if (move.captured) {
					Game.DrawSprite(fenToPNG[move.captured.toUpperCase()], 210, y, false, false, 45);
				}
			}
			y += 52;
		}
	},
	DrawCaptures: function() {
		let leftY = 675;

		for (let i = 0; i < w_cap.length; i+=4) {
			let cap = w_cap.length > i+4 ? i+4 : w_cap.length; 
			let x = 50;
			for (let j = i; j < cap; j++) {
				let piece = w_cap[j];
				Game.DrawSprite(fenToPNG[piece], x, leftY, false, false, 30);
				x += 34;
			}
			leftY += 34;
		}

		let rightY = 675;
		for (let i = 0; i < b_cap.length; i+=4) {
			let cap = b_cap.length > i+4 ? i+4 : b_cap.length; 
			let x = 220;
			for (let j = i; j < cap; j++) {
				let piece = b_cap[j];
				Game.DrawSprite(fenToPNG[piece.toUpperCase()], x, rightY, false, false, 30);
				x += 34;
			}
			rightY += 34;
		}
	},
	DrawPlayerNames: function() {
		let font = (name) => { return (name.toLowerCase() == "twitch" ? "21pt Age" : "bold 21pt Helvetica-Neue"); };
		// White
		Game.DrawText(font(players.w.username), players.w.username, 43, 300, "#714bbc", false);
		// Purple
		Game.DrawText(font(players.b.username), players.b.username, (357 - Game.TextSize(font(players.b.username), players.b.username).width), 300, 'black', false);

		// Draw TheGuyJoker underneath the logo.
		Game.DrawText("bold 49px Helvetica-Neue", "TheGuyJoker", 201, 201, colors.purple, true);
	},
	DrawTimer: function() {
		if (players[turn].showTimer) {
			var seconds = timer.startTime + timer.length - Math.floor(new Date().getTime()/1000);
			seconds = seconds > 0 ? seconds : 0;

			Game.DrawSprite("timer.png", 80, 980);
			Game.DrawText("40pt Pricedown", seconds % 30, 160, 1030, colors.black);
		}
	},
	DrawVotes: function() {
		let localVotes = votes;
		let totalVotes = Object.values(localVotes).reduce((acc, next) => {
			return acc + next.votes;
		}, 0);
		let voteList = Object.values(localVotes).sort((a, b) => {
			return b.votes - a.votes;
		});

		let y = 482;
		let cap = voteList.length > 6 ? 6 : voteList.length;
		for (let i = 0; i < cap; i++) {
			let x = (i < 3) ? 416 : 608;
			let move = voteList[i];
			let piece = move.color == 'b' ? move.piece : move.piece.toUpperCase();
			Game.DrawSprite(fenToPNG[piece], x, y, false, false, 60);

			let color = move.color == 'b' ? 'black' : 'purple';
			Game.DrawText("bold 30px Helvetica-Neue", move.to.toUpperCase(), x + 60, y + 44, colors[color]);

			//votes
			Game.DrawRoundRect(x + 112, y + 18, 65, 25, 4, true, false);
			
			let font = "20px Helvetica-Neue";
			let text = Math.floor((move.votes / totalVotes) * 100) + "%";
			let size = Game.TextSize(font, text);

			let midBox = x + 145;
			//text
			Game.DrawText(font, text, midBox, y + 38, "white", true);

			if (i == 2) { // reset for 2nd column
				y = 482;
			} else {
				y += 72;
			}
		}
	},
	DrawOverlay: function() {
		ctx.beginPath();
		ctx.rect(0,0,1920,1080);
		ctx.closePath();
		ctx.fillStyle = 'rgba(92,92,92,.5)';
		ctx.fill();

		ctx.fillStyle = '#714BBC';
		Game.DrawRoundRect(562, 328, 794, 288, 46, true, false);

		Game.DrawText('55px Helvetica-Neue', "Waiting for next game...", 644, 380 + 28, 'white', false);
		Game.DrawText('30px Helvetica-Neue', `${players.player} Wins: ${stats.wins}`, 644, 500, 'white', false);
		Game.DrawText('30px Helvetica-Neue', `Twitch Wins: ${stats.losses}`, 644, 540, 'white', false);
		Game.DrawText('30px Helvetica-Neue', `Games Played: ${stats.games}`, 644, 580, 'white', false);
	},
	DrawSprite: function(name, x, y, center, small, custom_height) {
		let spt = images[name];
		if (spt != null) {
			let width = spt.w;
			let height = spt.h;
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
	DrawRect(x, y, width, height, color) {
		ctx.beginPath();
		ctx.rect(x, y, width, height);
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();
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

	/**
	 * https://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
	 * 
	 * Draws a rounded rectangle using the current state of the canvas.
	 * If you omit the last three params, it will draw a rectangle
	 * outline with a 5 pixel border radius
	 * @param {Number} x The top left x coordinate
	 * @param {Number} y The top left y coordinate
	 * @param {Number} width The width of the rectangle
	 * @param {Number} height The height of the rectangle
	 * @param {Number} [radius = 5] The corner radius; It can also be an object 
	 *                 to specify different radii for corners
	 * @param {Number} [radius.tl = 0] Top left
	 * @param {Number} [radius.tr = 0] Top right
	 * @param {Number} [radius.br = 0] Bottom right
	 * @param {Number} [radius.bl = 0] Bottom left
	 * @param {Boolean} [fill = false] Whether to fill the rectangle.
	 * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
	 */
 	DrawRoundRect: function(x, y, width, height, radius, fill, stroke) {
		if (typeof stroke == 'undefined') {
		stroke = true;
		}
		if (typeof radius === 'undefined') {
		radius = 5;
		}
		if (typeof radius === 'number') {
		radius = {tl: radius, tr: radius, br: radius, bl: radius};
		} else {
		var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
		for (var side in defaultRadius) {
			radius[side] = radius[side] || defaultRadius[side];
		}
		}
		ctx.beginPath();
		ctx.moveTo(x + radius.tl, y);
		ctx.lineTo(x + width - radius.tr, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
		ctx.lineTo(x + width, y + height - radius.br);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
		ctx.lineTo(x + radius.bl, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
		ctx.lineTo(x, y + radius.tl);
		ctx.quadraticCurveTo(x, y, x + radius.tl, y);
		ctx.closePath();
		if (fill) {
			ctx.fillStyle = fill;
			ctx.fill();
		}
		if (stroke) {
			ctx.strokeStyle = stroke;
			ctx.stroke();
		}
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

window.addEventListener("resize", OnResizeCalled, false); 
 
function OnResizeCalled() { 
	var gameWidth = window.innerWidth; 
	var gameHeight = window.innerHeight; 
	var scaleToFitX = gameWidth / 1920; 
	var scaleToFitY = gameHeight / 1080; 
	 
	var currentScreenRatio = gameWidth / gameHeight; 
	var optimalRatio = Math.min(scaleToFitX, scaleToFitY); 
	 
	if (currentScreenRatio >= 1.77 && currentScreenRatio <= 1.79) { 
	    canvas.style.width = gameWidth + "px"; 
	    canvas.style.height = gameHeight + "px"; 
	} 
	else { 
	    canvas.style.width = 1920 * optimalRatio + "px"; 
	    canvas.style.height = 1080 * optimalRatio + "px"; 
	}
}

OnResizeCalled();
