var socket = io();

var roomId = "";

function join() {
  var userName = document.getElementById("userName").value;
  var roomID = document.getElementById("roomID").value.toUpperCase();

  console.log(userName,roomID);

  var nameAndRoom = [userName,roomID];

  socket.emit('join', nameAndRoom);
}

socket.on('named', function(name) {
  console.log("Taken nickname " + name);
});

socket.on('joined', function(room) {
  console.log("Joined room " + room);
  $("#JCboxContainer").hide();
  $("#RPboxContainer").show();
});

function create() {
  window.location.href = '/static/host.html';
  // document.getElementById("create").disabled = true;
  // socket.emit('create', "newRoom");
}

socket.on('createdRoom', function(roomID) {
  console.log("Made room " + roomID);
  roomId = roomID;
  $("#JCboxContainer").hide();
  $('#roomIDText').text(roomID)
  $("#RPboxContainer").show();
  $("#questionBox").show();
});

socket.on('askedQuestion', function(question) {
  console.log(question);
});

socket.on('newChoiceTime', function(quesPlayAnsTime) {
  $("#choiceRoundChooser").show();
});

function choice1() {
  socket.emit('choiceTaken', "1");
  $("#choiceRoundChooser").hide();
}

function choice2() {
  socket.emit('choiceTaken', "2");
  $("#choiceRoundChooser").hide();
}

var boxRoundSelectedBox;

socket.on('newBoxRound', function(boxes) {
  $("#boxRoundChooser").empty();
  for (var i = 0; i < boxes.length; i++) {
    if(boxes[i] == 0) {
      var box = "<div id=\"boxRoundBox\" class=\"boxRoundEmptyBox boxRoundBoxN"+i+"\" onclick=\"pickBox("+i+")\"><p>"+boxes[i]+"</p></div>"
    } else {
      var box = "<div id=\"boxRoundBox\" class=\"boxRoundBoxN"+i+"\" onclick=\"pickBox("+i+")\"><p>"+boxes[i]+"</p></div>"
    }
    $("#boxRoundChooser").append(box);
  }
  $("#boxRoundChooser").show();
  $("#boxRoundSelect").show();
});

function pickBox(number) {
  $(".boxRoundBoxN"+boxRoundSelectedBox).removeClass("boxRoundSelectedBox");
  $(".boxRoundBoxN"+number).addClass("boxRoundSelectedBox");
  boxRoundSelectedBox = number;
  console.log(number);
  $("#boxRoundSelect").css("background-color", "#16A085");
}

function confirmSelectedBox() {
  if(boxRoundSelectedBox >= 0 && boxRoundSelectedBox <= 9) {
    socket.emit('boxRoundChosen', boxRoundSelectedBox);
    $("#boxRoundChooser").hide();
    $("#boxRoundSelect").hide();
  }
}

socket.on('newHighLowRound', function(number) {
  $("#highLowChooser").show();
});

function chooseHigher() {
  socket.emit('highLowGuess', "higher");
  $("#highLowChooser").hide();
}

function chooseLower() {
  socket.emit('highLowGuess', "lower");
  $("#highLowChooser").hide();
}

function chooseStop() {
  socket.emit('highLowGuess', "stop");
  $("#highLowChooser").hide();
}
