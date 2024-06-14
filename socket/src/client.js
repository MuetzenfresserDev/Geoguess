class Player {
  constructor(id, name, icon, role) {
    this.x = 0;
    this.y = 0;
    this.id = id;
    this.name = name;
    this.show = false;
    this.icon = icon;
    this.role = role;
    this.abstand = 0
  }

  updatePosition(x, y) {
    this.x = x;
    this.y = y;
  }

  showPlayer() {
    this.show = true;
  }

  hidePlayer() {
    this.show = false;
  }
}

// ---------------------------------------------------------------
const socket = io();

let img

var canv
//zielpunkt
let goalX = 377;
let goalY = 140;

//punktzahl
let abstand = 0;
let abstandDiv

let spieler;

//shift + y to start game
document.addEventListener("keydown", function (event) {
  if (event.shiftKey && event.keyCode === 89) {
    console.log("test")
    document.getElementById("btn2").style.visibility = "visible"
  }
});

function initPlayer(){

    nameInput.style.display = "none"

    img = document.getElementById("canvas");
    img.addEventListener("click", clickHandler);

     canv = document.getElementById("canvas");
    //canv.style.backgroundImage = "url(" + "khorinisSmall.jpg" + ")";

     abstandDiv = document.getElementById("abstand");
    abstandDiv.textContent = 0 + " Pixel Abstand";

    let name = document.getElementById("inp").value
    let icon = "testIcon"
    let role = "player"

    spieler = new Player(socket.id, name, icon, role)

    socket.emit("player", spieler)

    socket.on("playerSetup", (data) =>{
        spieler.icon = data
        console.log(spieler)
    })
}

//bild + zielpunkte festlegen
function chooseQuestion(n) {
  if (n == 1) { //Geo 1
    canv.style.backgroundImage = "url(" + "Map.png" + ")";
    let style = canv.style.backgroundImage;
    goalX = 467;
    goalY = 155;

    console.log(canv.style.backgroundImage)

    socket.emit("question", { style, goalX, goalY });
  } else if (n == 2) { //Geo 2
    canv.style.backgroundImage = "url(" + "Map.png" + ")";
    let style = canv.style.backgroundImage;
    goalX = 342;
    goalY = 571;

    socket.emit("question", { style, goalX, goalY });
  } else if (n == 3) { //Geo 3
    canv.style.backgroundImage = "url(" + "Map.png" + ")";
    let style = canv.style.backgroundImage;
    goalX = 134;
    goalY = 246;

    socket.emit("question", { style, goalX, goalY });
  }  else if (n == 4){ //Geo 4
    canv.style.backgroundImage = "url(" + "Map.png" + ")";
    let style = canv.style.backgroundImage;
    goalX = 23;
    goalY = 168;

    socket.emit("question", { style, goalX, goalY });
  } else if (n == 5){ //Geo 5
    canv.style.backgroundImage = "url(" + "Map.png" + ")";
    let style = canv.style.backgroundImage;
    goalX = 248;
    goalY = 437;

    socket.emit("question", { style, goalX, goalY });
  } 
}

function clickHandler(event) {
  let context = canv.getContext("2d");
  context.clearRect(0, 0, 800, 592);
  abstandDiv.textContent = 0 + " Pixel Abstand";
  let klickPositionDiv = document.getElementById("klickPosition");
  let goalPositionDiv = document.getElementById("goalPosition");
  goalPositionDiv.style.display = "none";

  spieler.x = event.clientX;
  spieler.y = event.clientY;

  console.log("X: " + spieler.x + " Y: " + spieler.y);

  klickPositionDiv.style.left = spieler.x - 15 + "px"; // Die Hälfte der Breite des Elements abziehen
  klickPositionDiv.style.top = spieler.y - 15 + "px"; // Die Hälfte der Höhe des Elements abziehen

  klickPositionDiv.style.display = "block";

  spieler.abstand = Math.sqrt(Math.pow(goalX - spieler.x, 2) + Math.pow(goalY - spieler.y, 2)).toFixed(
    0
  );

    spieler.updatePosition(spieler.x,spieler.y);
  socket.emit("click", spieler );
}

function getResult() {
  let goalPositionDiv = document.getElementById("goalPosition");

  goalPositionDiv.style.left = goalX - 15 + "px";
  goalPositionDiv.style.top = goalY - 15 + "px";
  goalPositionDiv.style.display = "block";

  if(spieler != undefined){
    drawLine(spieler.x, spieler.y, goalX, goalY);
  }
}

function drawLine(x1, y1, x2, y2) {
  let canvas = document.getElementById("canvas");
  let context = canvas.getContext("2d");

  context.lineWidth = 2;
  context.strokeStyle = "white";

  let dx = x2 - x1;
  let dy = y2 - y1;
  let steps = Math.max(Math.abs(dx), Math.abs(dy));

  let xIncrement = dx / steps;
  let yIncrement = dy / steps;
  let currentX = x1;
  let currentY = y1;

  let count = 0;

  context.clearRect(0, 0, 800, 592);


  let animation = setInterval(function () {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(currentX, currentY);
    context.stroke();

    currentX += xIncrement;
    currentY += yIncrement;
    count++;


    abstandDiv.textContent = count + " Pixel Abstand";

    console.log(spieler)

    if (count >= steps) {
      clearInterval(animation);

      if(spieler != undefined){
        abstandDiv.textContent = spieler.abstand + " Pixel Abstand";
      }

    }
  }, 10);
}

// ---------------------------------------------------------------

socket.on("connect", () => {
    console.log(socket.id);
  });
  
  socket.on("init", () => {
    goalX = 377;
    goalY = 140;
  });

  socket.on("resultForClient", () => {

    console.log("clientStart")
    getResult();
  })
  
  //Update Player Position
  socket.on("recClick", (data) => {
    x = data.x;
    y = data.y;
  
    let context = canv.getContext("2d");
    context.clearRect(0, 0, 800, 592);
    //abstandDiv.textContent = 0 + " Pixel Abstand";
  
    let goalPositionDiv = document.getElementById("goalPosition");
    goalPositionDiv.style.display = "none";
  
    let klickPositionDiv = document.getElementById("klickPosition");
  
    klickPositionDiv.style.left = x - 15 + "px"; // Die Hälfte der Breite des Elements abziehen
    klickPositionDiv.style.top = y - 15 + "px"; // Die Hälfte der Höhe des Elements abziehen
  
    klickPositionDiv.style.display = "block";
  });
  
  //Start get Result and Update all
  socket.on("result", (data) => {
    getResult();
  });
  
  socket.on("recQuestion", (data) => {

    console.log("recQuestion")

    canv.style.backgroundImage = data.style;
  
    goalX = data.goalX;
    goalY = data.goalY;
  });

  socket.on("stayConnected", (data) => {
    console.log("stayConnected")
    socket.emit("pong",1)
  })
  
  window.addEventListener("message", function (event) {
    console.log("EVENT");
  
    if (event.data === "message") {
      getResult();
    }
  });
  
