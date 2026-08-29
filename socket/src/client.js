/**
 * client.js
 *
 * Gemeinsame Spieler-Logik für das Geoguessr-Mini-Spiel.
 *
 * WICHTIG: Die Socket.IO-Events (Namen und Datenform) wurden bewusst
 * NICHT verändert - server.js und die Angular-Anwendung verlassen
 * sich darauf. Geändert wurden nur Code-Struktur, Lesbarkeit und ein
 * paar kleine, ungefährliche Bugfixes (siehe Kommentare unten).
 */

class Player {
  constructor(id, name, icon, role) {
    this.id = id;
    this.name = name;
    this.icon = icon;
    this.role = role;
    this.x = 0;
    this.y = 0;
    this.show = false;
    this.abstand = 0;
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
// Grundzustand
// ---------------------------------------------------------------

const socket = io();

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 592;

// canv/spieler werden bewusst ohne "const" auf Modul-Ebene deklariert
// (nicht "let" innerhalb einer Funktion), weil host.js im selben
// globalen Scope darauf zugreift (beide Dateien sind klassische,
// nicht-modulare <script>-Tags).
let canv = null;
let abstandDiv = null;
let spieler = null;

// Zielpunkt der aktuellen Frage (Default = Zustand nach "init").
let goalX = 377;
let goalY = 140;

/**
 * Fragen-Katalog: Bild + Zielkoordinaten pro Fragen-Nummer.
 * Neue Fragen einfach hier ergänzen statt eine if/else-Kette zu
 * verlängern (Koordinaten wie bisher per Konsolen-Klick ermitteln).
 */
const QUESTIONS = {
  1: { image: 'karte_der_Kolonie_remake.png', goalX: 299, goalY: 424 },
  2: { image: 'karte_der_Kolonie_remake.png', goalX: 182, goalY: 196 },
  3: { image: 'karte_der_Kolonie_remake.png', goalX: 427, goalY: 144 },
  4: { image: 'karte_der_Kolonie_remake.png', goalX: 223, goalY: 214 },
  5: { image: 'karte_der_Kolonie_remake.png', goalX: 308, goalY: 276 },
};

// Shift + Y zeigt den versteckten "HOST"-Button (unverändertes Feature).
document.addEventListener('keydown', (event) => {
  if (event.shiftKey && event.key.toLowerCase() === 'y') {
    document.getElementById('btn2').style.visibility = 'visible';
  }
});

// ---------------------------------------------------------------
// Spieler-Setup
// ---------------------------------------------------------------

function initPlayer() {
  document.getElementById('nameInput').style.display = 'none';

  // Vorher gab es zwei Variablen (img/canv) für dasselbe Canvas-
  // Element - hier reicht eine.
  canv = document.getElementById('canvas');
  canv.addEventListener('click', clickHandler);

  abstandDiv = document.getElementById('abstand');
  abstandDiv.textContent = '0 Pixel Abstand';

  const name = document.getElementById('inp').value;
  spieler = new Player(socket.id, name, 'testIcon', 'player');

  socket.emit('player', spieler);

  socket.on('playerSetup', (data) => {
    spieler.icon = data;
  });
}

// ---------------------------------------------------------------
// Fragen auswählen (wird vom Host-Bedienfeld aus aufgerufen)
// ---------------------------------------------------------------

/**
 * Wählt Frage n aus dem QUESTIONS-Katalog, setzt das Hintergrundbild
 * und sendet die neue Frage (inkl. Zielkoordinaten) an alle Clients.
 */
function chooseQuestion(n) {
  const question = QUESTIONS[n];
  if (!question) {
    console.warn(`Unbekannte Frage-Nummer: ${n}`);
    return;
  }

  canv.style.backgroundImage = `url(${question.image})`;
  goalX = question.goalX;
  goalY = question.goalY;

  const style = canv.style.backgroundImage;
  socket.emit('question', { style, goalX, goalY });
}

// ---------------------------------------------------------------
// Klick-Handling (Spieler gibt seine Vermutung ab)
// ---------------------------------------------------------------

function clickHandler(event) {
  const context = canv.getContext('2d');
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  abstandDiv.textContent = '0 Pixel Abstand';

  const klickPositionDiv = document.getElementById('klickPosition');
  const goalPositionDiv = document.getElementById('goalPosition');
  goalPositionDiv.style.display = 'none';

  spieler.x = event.clientX;
  spieler.y = event.clientY;

  klickPositionDiv.style.left = `${spieler.x - 15}px`;
  klickPositionDiv.style.top = `${spieler.y - 15}px`;
  klickPositionDiv.style.display = 'block';

  spieler.abstand = Math.round(
    Math.sqrt((goalX - spieler.x) ** 2 + (goalY - spieler.y) ** 2),
  );

  spieler.updatePosition(spieler.x, spieler.y);
  socket.emit('click', spieler);
}

// ---------------------------------------------------------------
// Ergebnis-Anzeige
// ---------------------------------------------------------------

function getResult() {
  const goalPositionDiv = document.getElementById('goalPosition');
  goalPositionDiv.style.left = `${goalX - 15}px`;
  goalPositionDiv.style.top = `${goalY - 15}px`;
  goalPositionDiv.style.display = 'block';

  if (spieler) {
    drawLine(spieler.x, spieler.y, goalX, goalY);
  }
}

/**
 * Zeichnet animiert eine Linie von (x1,y1) nach (x2,y2) und zeigt am
 * Ende den finalen Pixel-Abstand in abstandDiv an.
 */
function drawLine(x1, y1, x2, y2) {
  const context = canv.getContext('2d');
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const xIncrement = dx / steps;
  const yIncrement = dy / steps;

  let currentX = x1;
  let currentY = y1;
  let count = 0;

  const animation = setInterval(() => {
    strokeMapLine(context, x1, y1, currentX, currentY);

    currentX += xIncrement;
    currentY += yIncrement;
    count += 1;

    abstandDiv.textContent = `${count} Pixel Abstand`;

    if (count >= steps) {
      clearInterval(animation);
      if (spieler) {
        abstandDiv.textContent = `${spieler.abstand} Pixel Abstand`;
      }
    }
  }, 10);
}

/**
 * Zeichnet eine Linie mit dunklem "Outline"-Effekt darunter, damit sie
 * sich sowohl auf hellen als auch dunklen Kartenbereichen gut abhebt.
 */
function strokeMapLine(context, x1, y1, x2, y2) {
  context.lineCap = 'round';

  // Dunkler, breiterer Rand als Kontrast-Outline.
  context.lineWidth = 5;
  context.strokeStyle = 'rgba(20, 16, 10, 0.55)';
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();

  // Helle Hauptlinie darüber.
  context.lineWidth = 2.5;
  context.strokeStyle = '#fff3d6';
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

// ---------------------------------------------------------------
// Socket-Events (Server -> Client)
// WICHTIG: Namen/Datenform unverändert.
// ---------------------------------------------------------------

socket.on('connect', () => {
  console.log('Verbunden als', socket.id);
});

socket.on('init', () => {
  goalX = 377;
  goalY = 140;
});

socket.on('resultForClient', () => {
  getResult();
});

// Position eines (anderen) Spielers live aktualisieren.
socket.on('recClick', (data) => {
  const context = canv.getContext('2d');
  context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const goalPositionDiv = document.getElementById('goalPosition');
  goalPositionDiv.style.display = 'none';

  // Bugfix: "x"/"y" wurden vorher ohne let/const gelesen und dadurch
  // versehentlich zu impliziten globalen Variablen. Jetzt wird direkt
  // aus "data" gelesen, ohne Zwischenvariablen.
  const klickPositionDiv = document.getElementById('klickPosition');
  klickPositionDiv.style.left = `${data.x - 15}px`;
  klickPositionDiv.style.top = `${data.y - 15}px`;
  klickPositionDiv.style.display = 'block';
});

socket.on('result', () => {
  getResult();
});

socket.on('recQuestion', (data) => {
  canv.style.backgroundImage = data.style;
  goalX = data.goalX;
  goalY = data.goalY;
});

socket.on('stayConnected', (data) => {
  const names = data.map((player) => player.name).join(', ');
  console.log(`${names} are connected`);
  socket.emit('pong', 1);
});

window.addEventListener('message', (event) => {
  if (event.data === 'message') {
    getResult();
  }
});