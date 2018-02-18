'use strict';
const config = require("../config");
const Game = require('../database').models.game;

const request = require('request');
const Chess = require("./chess").Chess;
const TwitchBot = require("twitch-bot");
const Bot = new TwitchBot(config.twitchBot);

const defaultBoard = () => { return new Chess(); };
const defaultGame = () => {
    return new Game({
        startTime: new Date(),
        player: config.player,
        state: "NOT_STARTED",
        pgn: new Chess().pgn(),
        color: "w"
    });
};
const defaultVotes = () => {
    return {
        votes: {},
        alreadyVoted: []
    };
};

module.exports = function(io) {
    // Setup Defaults
    let currentBoard = defaultBoard();
    let currentGame = defaultGame();
    let currentVotes = defaultVotes();

    // Find Previous Game
    Game.find({ "player": config.player }).sort({ startTime: -1 }).limit(1).then(result => {
        if (result.length > 0) {
            let previousGame = result[0];
            currentGame = previousGame;
            currentBoard.load_pgn(currentGame.pgn);
            if (previousGame.state == "IN_PROGRESS") {
                startTimer();
            }
        }

        io.on('connection', function(socket) {
            emit(['board', 'moves', 'votes', 'state', 'players', 'stats'], socket);
        });

        Bot.on('message', (chatter) => {
            handleChatter(chatter);
        });
    });

    function newGame(previousGame) {
        if (!previousGame) { previousGame = currentGame; }
        const newGame = defaultGame();
        if (currentGame.state == "FINISHED") {
            newGame.color = previousGame.color == "b" ? "w" : "b";
        }
        newGame.state = "IN_PROGRESS";
        currentGame = newGame;
        currentBoard = defaultBoard();
        emit(['state', 'players']);

        startTimer();
    }

    function emit(events, socket) {
        // Default to io if socket wasn't passed.
        if (!socket) { socket = io; }
        events.forEach(event => {
            switch (event) {
                case 'board':
                    socket.emit('board', currentBoard.fen());
                    break;
                case 'moves':
                    socket.emit('moves', currentBoard.history({ verbose: true }));
                    break;
                case 'votes':
                    socket.emit('votes', currentVotes.votes);
                    break;
                case 'state':
                    socket.emit('state', currentGame.state);
                    break;
                case 'players':
                    if (currentGame.color == "b") {
                        socket.emit('players', {
                            player: config.player,
                            w: {
                                username: "Twitch",
                                showTimer: true
                            },
                            b: {
                                username: config.player,
                                showTimer: false
                            }
                        });
                    } else {
                        socket.emit('players', {
                            player: config.player,
                            w: {
                                username: config.player,
                                showTimer: false
                            },
                            b: {
                                username: "Twitch",
                                showTimer: true
                            }
                        });
                    }
                    break;
                case 'stats':
                    Promise.all([
                        Game.find({ winner: true }).count(),
                        Game.find({ winner: false }).count(),
                        Game.find({}).count()
                    ]).then(results => {
                        socket.emit('stats', {
                            wins: results[0],
                            losses: results[1],
                            games: results[2]
                        });
                    });
            }
        });
    }
    let moves = ["f3", "e6", "g4", "Qh4#"];
    function handleChatter(chatter) {
        if (!/^!/.test(chatter.message)) { return; } // Return early if it's not a command.
        const command = chatter.message.split(' ');

        const isCurrentPlayer = chatter.username.toLowerCase() == config.player.toLowerCase();

        switch (command[0]) {
            case "!pgn":
                Bot.say(`/w ${chatter.username} ${currentBoard.pgn()}`, [config.player]);
                return;
            case "!fen":
                Bot.say(`/w ${chatter.username} ${currentBoard.fen()}`, [config.player]);
                return;
            case "!move":
                if (currentGame.state == "IN_PROGRESS") {
                    let legalMove = currentBoard.move(command[1], {sloppy: true});
                    if (!legalMove) {
                        Bot.say(`/w ${chatter.username} ${command[1]} isn't a legal move.`, [config.player]);
                    } else {
                        currentBoard.undo(legalMove);
                        if (isCurrentPlayer && currentBoard.turn() == currentGame.color) {
                            vote(chatter, legalMove);
                            gameLoop();
                        } else if (!isCurrentPlayer && currentBoard.turn() != currentGame.color) {
                            vote(chatter, legalMove);
                        } else {
                            Bot.say(`/w ${chatter.username} It's not your turn!`, [config.player]);
                        }
                    } 
                }
                return;
            case "!newgame":
                if (isCurrentPlayer && currentGame.state != "IN_PROGRESS") {
                    newGame();
                }
        }

        function vote(chatter, move) {
            if (!currentVotes.alreadyVoted.includes(chatter.username)) {
                if (currentVotes.votes[move.san]) {
                    currentVotes.votes[move.san].votes += 1;
                } else {
                    move.votes = 1;
                    currentVotes.votes[move.san] = move; 
                }
                currentVotes.alreadyVoted.push(chatter.username);
                emit(['votes']);
            }
        }
    }

    function gameLoop() {
        // Make move and check if Game Over
        const moveWithMostVotes = Object.keys(currentVotes.votes).sort((v1, v2) => currentVotes.votes[v1].votes - currentVotes.votes[v2].votes)[0];
        if (moveWithMostVotes !== "") {
            var chosenMove = currentBoard.move(moveWithMostVotes);
            moves.shift();
            console.log(currentBoard.ascii());
            currentGame.pgn = currentBoard.pgn();

            if (currentBoard.game_over()) {
                const localGame = currentGame;
                if (currentBoard.in_checkmate()) {
                    currentGame.winner = currentBoard.turn() !== currentGame.color;
                }
                request.post({ 
                    url: "https://lichess.org/import", 
                    headers: { 'content-type': 'application/x-www-form-urlencoded' },
                    body: `pgn=${require('querystring').escape(currentBoard.pgn())}&analyse=on`,
                    followRedirect: false
                }, (error, response, body) => {
                    let lichessUrl = `https://lichess.org${response.headers.location}`;
                    localGame.lichessUrl = lichessUrl;
                    localGame.save();
                    Bot.say(`/w ${config.player} ${lichessUrl}`, [config.player]);
                    Bot.say(`Previous Game: ${lichessUrl}`);
                });
                currentGame.endTime = new Date();
                currentGame.state = "FINISHED";
                moves = ["f3", "e6", "g4", "Qh4#"];
            }

            currentGame.save();
        }
    
        // Reset votes
        currentVotes = defaultVotes();
    
        emit(['board', 'moves', 'votes', 'state']);
    
        // If the turn is Twitch chat, start the timer.
        if (currentGame.state == "IN_PROGRESS" && currentBoard.turn() != currentGame.color) {
            startTimer();	
        } else {
            // If the game ended, don't start timer and send game stats
            emit(['state', 'stats']);
            // TODO: Send Game Stats.
        }
    }

    let loopTimeoutId; // Stores the previous timerId
    function startTimer() {
        if (loopTimeoutId) {
            clearTimeout(loopTimeoutId);
        }
        loopTimeoutId = setTimeout(gameLoop, config.timer * 1000);
        io.emit('time', { startTime : Math.floor(new Date().getTime() / 1000), length: config.timer });
    }
};