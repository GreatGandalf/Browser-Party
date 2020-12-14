// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var app = express();
var server = http.Server(app);
var io = socketIO(server);
app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static'));// Routing
app.get('/', function(request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});// Starts the server.
server.listen(5000, function() {
  console.log('Starting server on port 5000');
});

var playerColors = ["#0077C0","#E74C3C","#F39C12","#1ABC9C","#8E44AD","#39D5FF","#D3623B","#FF7CB8","#9E6C4B","#95A5A6"];

// Add the WebSocket handlers
io.on('connection', function(socket) {

  socket.on('create', function(a) {
    socket.nickname = "bigScreen";
    socket.isBigScreen = true;
    var newRoomID = makeid(5);
    socket.join(newRoomID);
    socket.currentRoomId = newRoomID;
    socket.emit('createdRoom', newRoomID);
    console.log(socket.id + " has created room " + newRoomID);
  });

  socket.on('join', function(nameAndRoom) {
    if(typeof socket.currentRoomId === 'undefined') {

      var name = nameAndRoom[0];
      var room = nameAndRoom[1];

      playersInRoom = getNicknamesInRoom(room);
      if (playersInRoom.includes("bigScreen") && name != "bigScreen" && playersInRoom.includes(name) == false) {
        socket.join(room);
        socket.emit('joined', room);
        socket.currentRoomId = room;
        console.log(socket.id + " joined room " + room);

        socket.nickname = name;
        socket.emit('named', name);
        console.log(socket.id + " has taken nickname " + name);

        playerNumber = getAmountOfPlayersInRoom(room);
        socket.playerColor = playerColors[playerNumber-1];
        console.log(socket.nickname + " has taken color " + socket.playerColor);

        socket.score = 0;

        var playersInfo = getNicknamesColorsScoresInRoom(room);
        console.log(playersInfo);

        io.in(room).emit('playersInRoom', playersInfo);

      }
    } else {
      console.log("No join because currentRoomId " + socket.currentRoomId);
    }

  });

  socket.on('disconnect', function() {
    var playersInfo = getNicknamesColorsScoresInRoom(socket.currentRoomId);
    io.in(socket.currentRoomId).emit('playersInRoom', playersInfo);
  });

  socket.on('question', function(q) {
    if(socket.isBigScreen) {
      io.in(socket.currentRoomId).emit('askedQuestion', q);
      console.log(q);
    }
  });

  socket.on('startChoiceRound', function(a) {
    if(socket.isBigScreen) {
      var randPlayer = getRandomPlayerInRoom(socket.currentRoomId);
      socket.choicePlayer = randPlayer;
      quesPlayAnsTime = ["Which holiday does *** prefer?",randPlayer.nickname,"Mountains","Beach",30];
      socket.emit('newChoiceRound', quesPlayAnsTime);
      io.in(socket.currentRoomId).emit('newChoiceTime', "yes");
    } else {
      console.log("no choice round bc no bigscreen");
    }
  });

  socket.on('choiceTaken', function(choice) {
    socket.currentChoice = choice;
    socket.hasChoice = true;
    var bigScreenPlayer = getBigScreenInRoom(socket.currentRoomId);
    io.in(socket.currentRoomId).emit('hasChosen', socket.nickname);

    // If the player sending a choice is the player in the question
    if(socket.id === bigScreenPlayer.choicePlayer.id) {
      // Set their answer as goodChoice in bigScreen
      bigScreenPlayer.goodChoice = choice;
      console.log("Player in question answered choice: " + choice);
    }
    if(checkIfAllHaveChosen(socket.currentRoomId) == true) {
      var players = getPlayersInRoom(socket.currentRoomId);
      var choices = [];
      var changedScores = [];
      for (var i = 0; i < players.length; i++) {
        //Calculate score of players based on if their choice is the right one
        if(players[i].id != bigScreenPlayer.choicePlayer.id) {
          var nick = players[i].nickname;
          var playerChoice = players[i].currentChoice;
          var nickChoice = [nick,playerChoice]
          choices.push(nickChoice);

          var oldScore = players[i].score;
          var playerColorOldNew = [nick,players[i].playerColor,oldScore];
          if(playerChoice === bigScreenPlayer.goodChoice) {
            players[i].score += 3;
          }
          playerColorOldNew.push(players[i].score);
          changedScores.push(playerColorOldNew);
        } else { //For the player deciding the right answer old and new score are always the same
          var playerColorOldNew = [players[i].nickname,players[i].playerColor,players[i].score,players[i].score];
          changedScores.push(playerColorOldNew);
        }
      }
      io.in(socket.currentRoomId).emit('chosenAnswers', choices);
      io.in(socket.currentRoomId).emit('goodChoice', bigScreenPlayer.goodChoice);
      io.in(socket.currentRoomId).emit('changedScores', changedScores);
      resetChoices(socket.currentRoomId);
    }
  });

  socket.on('startBoxRound', function(a) {
    if(socket.isBigScreen) {
      var amountOfBoxes = getPlayersInRoom(socket.currentRoomId).length - 1;
      if(amountOfBoxes > 9) {
        amountOfBoxes = 9;
      }
      var boxes = [];
      var amountOfEmptyBoxes = 9 - amountOfBoxes;
      for (var i = 0; i < amountOfBoxes; i++) {
        boxes.push(i+1);
      }

      for (var i = 0; i < amountOfEmptyBoxes; i++) {
        boxes.push(0);
      }

      boxes = shuffleArray(boxes);

      socket.boxes = boxes;
      io.in(socket.currentRoomId).emit('newBoxRound', boxes);

    } else {
      console.log("no box round bc no bigscreen");
    }
  });

  socket.on('boxRoundChosen', function(box) {
    socket.selectedBox = box;
    socket.hasChoice = true;
    console.log(socket.nickname + " chose box " + socket.selectedBox);

    if(checkIfAllHaveChosen(socket.currentRoomId) == true) {
      console.log("All players have chosen a box");

      var bigScreenPlayer = getBigScreenInRoom(socket.currentRoomId);

      var players = getPlayersInRoom(socket.currentRoomId);
      var boxChoices = [];
      var simpleBoxChoices = [];
      var changedScores = [];

      for (var i = 0; i < players.length; i++) {
        var nick = players[i].nickname;
        var playerColor = players[i].playerColor;
        var playerChoice = players[i].selectedBox;
        var nickColorChoice = [nick,playerColor,playerChoice]
        boxChoices.push(nickColorChoice);
        simpleBoxChoices.push(players[i].selectedBox);
      }

      for (var i = 0; i < players.length; i++) {
        var oldScore = players[i].score;
        var playerColorOldNew = [players[i].nickname,players[i].playerColor,oldScore];

        var amountOfSameChoices = countInArray(simpleBoxChoices,players[i].selectedBox);
        if(amountOfSameChoices > 1) {
          players[i].score -= bigScreenPlayer.boxes[players[i].selectedBox];
        } else {
          players[i].score += bigScreenPlayer.boxes[players[i].selectedBox];
        }

        playerColorOldNew.push(players[i].score);
        changedScores.push(playerColorOldNew);
      }

      io.in(socket.currentRoomId).emit('chosenBoxes', boxChoices);
      io.in(socket.currentRoomId).emit('changedScores', changedScores);
      resetChoices(socket.currentRoomId);
    }
  });

  socket.on('startHighLowRound', function(a) {
    if(socket.isBigScreen) {
      var players = getPlayersInRoom(socket.currentRoomId);
      for (var i = 0; i < players.length; i++) {
        players[i].potentialPlusScore = 0;
        players[i].surePlusScore = 0;
        players[i].inHighLow = true;
      }

      socket.highLowNumber =  Math.floor(Math.random() * 10) + 1; //Random number between 1 and 10
      io.in(socket.currentRoomId).emit('newHighLowRound', socket.highLowNumber);
    } else {
      console.log("no highLow round bc no bigscreen");
    }
  });

  socket.on('highLowGuess', function(highOrLow) {
    if(socket.inHighLow === true) {
      if(highOrLow === "higher") {
        socket.highLowGuess = "H";
        socket.hasChoice = true;
      } else if(highOrLow === "lower") {
        socket.highLowGuess = "L";
        socket.hasChoice = true;
      } else if(highOrLow === "stop") {
        socket.highLowGuess = "S";
        socket.hasChoice = true;
      }

      if(checkIfAllHaveChosen(socket.currentRoomId) == true) {
        var goodGuess = "";
        var bigScreenPlayer = getBigScreenInRoom(socket.currentRoomId);
        var newNumber = randNumberExcept(1,10,bigScreenPlayer.highLowNumber)
        var players = getPlayersInRoom(socket.currentRoomId);
        var stopPlayers = [];
        var higherPlayers = [];
        var lowerPlayers = [];

        var someoneStillIn = false;

        if(newNumber > bigScreenPlayer.highLowNumber) {
          goodGuess = "H";
        } else {
          goodGuess = "L";
        }

        for (var i = 0; i < players.length; i++) {
          if(players[i].highLowGuess === "S") {
            players[i].surePlusScore = players[i].potentialPlusScore;
            players[i].inHighLow = false;
          } else if(goodGuess !== players[i].highLowGuess) {
            players[i].inHighLow = false;
            players[i].potentialPlusScore = 0;
          } else if(goodGuess === players[i].highLowGuess) {
            players[i].potentialPlusScore += 1;
            socket.hasChoice = false;
            var someoneStillIn = true;
          }

          if(players[i].highLowGuess === "S") {
            var nickColor = [players[i].nickname,players[i].playerColor];
            stopPlayers.push(nickColor);
          } else if(players[i].highLowGuess === "H") {
            var nickColor = [players[i].nickname,players[i].playerColor];
            higherPlayers.push(nickColor);
          } else if(players[i].highLowGuess === "L") {
            var nickColor = [players[i].nickname,players[i].playerColor];
            lowerPlayers.push(nickColor);
          }
        }

        var highLowGuesses = [higherPlayers,lowerPlayers,stopPlayers];

        bigScreenPlayer.emit('highLowGuesses', highLowGuesses);

        if(someoneStillIn == true) {
          bigScreenPlayer.highLowNumber = newNumber;
          bigScreenPlayer.emit('highLowNewNumber', newNumber);
          for (var i = 0; i < players.length; i++) {
            if(players[i].inHighLow === true) {
              players[i].emit('newHighLowRound', socket.highLowNumber);
            }
          }
        } else {
          console.log("No one in highlow anymore");
        }
      }
    }
  });

});

function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function getAmountOfPlayersInRoom(room) {
  var amountOfPlayers = io.sockets.adapter.rooms[room];
  return amountOfPlayers.length - 1;
}

function getPlayersInRoom(room) {
  var players = [];
  var firstFiltered = false;
  if(typeof io.nsps['/'].adapter.rooms[room].sockets !== 'undefined') {

    for (socketID in io.nsps['/'].adapter.rooms[room].sockets) {
      if(firstFiltered) {
        const player = io.nsps['/'].connected[socketID];
        players.push(player);
      } else {
        firstFiltered = true;
      }
    }

  }
  return players;
}

function getRandomPlayerInRoom(room) {
  var players = getPlayersInRoom(room);
  var rand = Math.floor(Math.random() * players.length);
  var randPlayer = players[rand];

  return randPlayer;

}

function checkIfAllHaveChosen(room) {
  var players = getPlayersInRoom(room);
  var allChosen = true;

  for (var i = 0; i < players.length; i++) {
    if(players[i].hasChoice !== true) {
      allChosen = false;
      return allChosen;
    }
  }
  return allChosen;
}

function resetChoices(room) {
  var players = getPlayersInRoom(room);

  for (var i = 0; i < players.length; i++) {
    players[i].hasChoice = false
  }
}

function getBigScreenInRoom(room) {
  if(typeof io.nsps['/'].adapter.rooms[room].sockets !== 'undefined') {
    var first = Object.keys(io.nsps['/'].adapter.rooms[room].sockets)[0];
    var firstSocket = io.nsps['/'].connected[first];
    if(firstSocket.nickname == "bigScreen") {
      return firstSocket;
    } else {
      return false;
    }
  }
  return false;
}

function getNicknamesInRoom(room) {
  var playersInRoom = [];

  if(typeof io.sockets.adapter.rooms[room] !== 'undefined') {

    for (socketID in io.nsps['/'].adapter.rooms[room].sockets) {
      const nickname = io.nsps['/'].connected[socketID].nickname;
      playersInRoom.push(nickname);
    }
  }

  return playersInRoom;
}

function getNicknamesInRoomWithoutScreen(room) {
  var playersInRoom = [];

  if(typeof io.sockets.adapter.rooms[room] !== 'undefined') {

    for (socketID in io.nsps['/'].adapter.rooms[room].sockets) {
      const nickname = io.nsps['/'].connected[socketID].nickname;
      if(nickname !== "bigScreen") {
        playersInRoom.push(nickname);
      }
    }
  }

  return playersInRoom;
}

function getNicknamesColorsScoresInRoom(room) {
  var playersColorsInRoom = [];

  if(typeof io.sockets.adapter.rooms[room] !== 'undefined') {

    for (socketID in io.nsps['/'].adapter.rooms[room].sockets) {
      const nickname = io.nsps['/'].connected[socketID].nickname;
      const color = io.nsps['/'].connected[socketID].playerColor;
      const score = io.nsps['/'].connected[socketID].score;
      if(nickname !== "bigScreen") {
        var nickColorScore = [nickname,color,score]
        playersColorsInRoom.push(nickColorScore);
      }
    }
  }

  return playersColorsInRoom;
}

function shuffleArray(a) {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

function countInArray(array, what) {
  var count = 0;
  for (var i = 0; i < array.length; i++) {
    if (array[i] === what) {
      count++;
    }
  }
  return count;
}

function randNumberExcept(min,max,except) {
  var num = Math.floor(Math.random() * (max - min + 1)) + min;
  if(num === except) {
    return randNumberExcept(min, max,except);
  } else {
    return num;
  }
}
