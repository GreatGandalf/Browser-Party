var socket = io();

var roomId = "";

var playerScoreLines = [];
var playerScoreLinesPlus = [];

socket.emit('create', "newRoom");

socket.on('joined', function(room) {
  console.log("Joined room " + room);
  $("#JCboxContainer").hide();
  $("#RPboxContainer").show();
});

socket.on('playersInRoom', function(players) {
  $('#playersAndPoints').empty();
  for (var i = 0; i < players.length; i++) {
    var playerLine = "<div id=\"playerLine\" style=\"background-color:"+players[i][1]+";\"><p id=\"playerLinePlayer\">" + players[i][0] + "</p><span id=\"pointsBarScore\">"+players[i][2]+"</span></div>";
    $('#playersAndPoints').append(playerLine);
  }
  console.log("players: " + players);
});

socket.on('changedScores', function(scores) {
  console.log("Received changed scores");
  console.log(scores);
  playerScoreLines = [];
  playerScoreLinesPlus = [];
  for (var i = 0; i < scores.length; i++) {

    var change = scores[i][3] - scores[i][2];
    var extraScoreBit = "";
    if(change > 0) { //If the old score is smaller than the new score
      extraScoreBit = "<span id=\"plusPointsBit\">+"+change+"</span>"
    } else if(change < 0) {
      extraScoreBit = "<span id=\"minusPointsBit\">"+change+"</span>"
    }

    var playerLinePlus = "<div id=\"playerLine\" style=\"background-color:"+scores[i][1]+";\"><p id=\"playerLinePlayer\">" + scores[i][0] + "</p><span id=\"pointsBarScore\">"+scores[i][2]+"</span>"+extraScoreBit+"</div>";
    playerScoreLinesPlus.push(playerLinePlus);

    var playerLine = "<div id=\"playerLine\" style=\"background-color:"+scores[i][1]+";\"><p id=\"playerLinePlayer\">" + scores[i][0] + "</p><span id=\"pointsBarScore\">"+scores[i][3]+"</span></div>";
    playerScoreLines.push(playerLine);
  }
});

function showChangedScores() {
  $('#playersAndPoints').empty();
  for (var i = 0; i < playerScoreLinesPlus.length; i++) {
    $('#playersAndPoints').append(playerScoreLinesPlus[i]);
  }
  setTimeout(showScoreLines,2500)
}

function showScoreLines() {
  $('#playersAndPoints').empty();
  for (var i = 0; i < playerScoreLines.length; i++) {
    $('#playersAndPoints').append(playerScoreLines[i]);
  }
  // setTimeout(nextRound,2000)
}

socket.on('createdRoom', function(roomID) {
  console.log("Made room " + roomID);
  roomId = roomID;
  $('#roomIDText').text(roomID);
  $("#RPboxContainer").show();
  $("#questionBox").show();
});

function askQuestion() {
  var q = $("#question").val();
  socket.emit('question', q);
}

function startCoiceRound() {
  socket.emit('startChoiceRound', "now");
}

socket.on('newChoiceRound', function(quesPlayAnsTime) {

  var q = quesPlayAnsTime[0].toUpperCase();
  var play = quesPlayAnsTime[1].toUpperCase();
  var a1 = quesPlayAnsTime[2].toUpperCase();
  var a2 = quesPlayAnsTime[3].toUpperCase();
  var time = quesPlayAnsTime[4];
  var qSplit = q.split('***');

  $('#QPart1').text(qSplit[0]);
  $('#QPart2').text(qSplit[1]);
  $('#gold').text(play);
  $('#choiceRoundA1Text').text(a1);
  $('#choiceRoundA2Text').text(a2);
  $('#choiceRoundA1Box').show();
  $('#choiceRoundA2Box').show();
  $('#choiceRoundAns1Box').empty();
  $('#choiceRoundAns2Box').empty();
  $("#choiceRoundBox").show();
});

var choice1Players = [];
var choice2Players = [];

socket.on('hasChosen', function(nickname) {
  console.log(nickname + " has chosen");
});

socket.on('chosenAnswers', function(choices) {
  console.log(choices);
  choice1Players = [];
  choice2Players = [];
  for (var i = 0; i < choices.length; i++) {
    var name = choices[i][0];
    var choice = choices[i][1];
    if(choice === "1") {
      $('#choiceRoundAns1Box').append("<p>" + name + "</p>");
      choice1Players.push(name);
    } else if(choice === "2") {
      $('#choiceRoundAns2Box').append("<p>" + name + "</p>");
      choice2Players.push(name);
    }
  }
});

socket.on('goodChoice', function(good) {
  if(good === "1") {
    $('#choiceRoundA2Box').delay(3000).fadeOut(500);
  } else if(good === "2") {
    $('#choiceRoundA1Box').delay(3000).fadeOut(500);
  }
  $('#choiceRoundBox').delay(7000).fadeOut(500);
  setTimeout(showChangedScores,5000)
});


function awardPlayers(players, amount) {
  for (var i = 0; i < players.length; i++) {
    $('#giveBoxPeople').append("<p>" + players[i] + "</p>");
  }
  $('#giveBoxAmount').text(amount);
  $('#giveBox').delay(5000).fadeIn(500);
}

function punishPlayers(players, amount) {
  for (var i = 0; i < players.length; i++) {
    $('#punishBoxPeople').append("<p>" + players[i] + "</p>");
  }
  $('#punishBoxAmount').text(amount);
  $('#punishBox').delay(5000).fadeIn(500);
}

function nextRound() {
  startCoiceRound();
}

function startBoxRound() {
  socket.emit('startBoxRound', "now");
}

socket.on('newBoxRound', function(boxes) {
  console.log(boxes);
  $('#BoxesRoundBoxes').empty();
  $("#boxesRoundBox").fadeIn(300);
  for (var i = 0; i < boxes.length; i++) {
    if(boxes[i] == 0) {
      $('#BoxesRoundBoxes').append("<div id=\"BoxesRoundChoiceBox\" class=\" BoxesRoundEmptyBox boxRoundBoxN"+i+" \"></div>");
    } else {
      $('#BoxesRoundBoxes').append("<div id=\"BoxesRoundChoiceBox\" class=\" boxRoundBoxN"+i+" \"></div>");
    }
    $('.boxRoundBoxN'+i).append("<div id=\"BoxesRoundChoiceBoxOverlay\" class=\" boxRoundBoxOverlay"+i+" \"></div>");
    $('.boxRoundBoxN'+i).append("<p>" + boxes[i] + "</p>");
  }
});

socket.on('chosenBoxes', function(boxChoices) {
  for (var i = 0; i < boxChoices.length; i++) {
    var nick = boxChoices[i][0];
    var color = boxChoices[i][1];
    var box = boxChoices[i][2];

    var boxChoiceDot = "<div id=\"boxChoiceDot\" style=\"background-color:"+color+";\"></div>"
    $('.boxRoundBoxOverlay'+box).append(boxChoiceDot);
  }
  setTimeout(showChangedScores,3000)
});

function startHighLowRound() {
  socket.emit('startHighLowRound', "now");
}

socket.on('newHighLowRound', function(number) {
  $('#highLowRoundBox').fadeIn(500);
  $('#currentNumberBox').append("<p>"+number+"</p>");
  console.log(number);
});

socket.on('highLowGuesses', function(highLowStop) {
  console.log(highLowStop);
});

socket.on('highLowNewNumber', function(newNumber) {
  setTimeout(showNewHighLow,3000)
});

function showNewHighLow() {
  $('#currentNumberBox').empty();
  $('#currentNumberBox').append("<p>"+newNumber+"</p>");
}
