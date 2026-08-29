/**
 * host.js
 *
 * Host-spezifische UI-Logik: Frage auswählen, Spielerpositionen
 * abfragen/anzeigen, Entfernungen auswerten.
 *
 * Baut auf den globalen Variablen aus client.js auf (socket, canv,
 * spieler, goalX, goalY, ...) - beide Dateien sind klassische Skripte
 * ohne Module und teilen sich deshalb den globalen Scope.
 *
 * WICHTIG: Socket-Events unverändert gelassen (playerList/list,
 * getResultForClient).
 */

let playerlist = [];
let positionPollInterval = null;

/*
 * Bugfix: Vorher wurde "socket.on('list', ...)" sowohl in
 * updatePlayerPositions() als auch in showResults() erneut
 * registriert. Bei jedem Klick auf "UpdatePositions" bzw.
 * "Zeige Entfernungen" kam ein weiterer Listener dazu, der nie wieder
 * entfernt wurde - mit der Zeit liefen dieselben Daten mehrfach durch
 * denselben Callback. Jetzt gibt es nur noch diese eine, einmalige
 * Registrierung.
 */
socket.on('list', (data) => {
  playerlist = data;
});

function setupPlayerView() {
  document.getElementById('canvas').style.display = 'block';
  document.getElementById('player-box').style.display = 'block';
  document.getElementById('playBtn').style.display = 'none';
  initCanvas();
}

function setupHostView() {
  document.getElementById('canvas').style.display = 'block';
  document.getElementById('host-box').style.display = 'block';
  document.getElementById('hostAbstand').style.display = 'block';
  document.getElementById('playBtn').style.display = 'none';

  updatePlayerPositions();
  initCanvas();
}

function initCanvas() {
  canv = document.getElementById('canvas');
}

function updatePlayerPositions(n = 0) {
  if (n !== 0) {
    document.getElementById('anzeigen').disabled = false;
    document.getElementById('entfernung').disabled = false;
  }

  if (canv) {
    document.getElementById('goalPosition').style.display = 'none';
    document.getElementById('hostAbstand').style.display = 'none';
    canv.getContext('2d').clearRect(0, 0, 800, 592);
  }

  for (let i = 0; i < 4; i += 1) {
    document.getElementById(`klickPositionHost${i}`).style.display = 'none';
    document.getElementById(`playerName${i}`).style.display = 'none';
  }

  // Falls schon ein Poll-Intervall läuft (z.B. erneuter Klick auf
  // "UpdatePositions"), erst stoppen statt ein zweites parallel
  // laufen zu lassen.
  clearInterval(positionPollInterval);
  positionPollInterval = setInterval(() => {
    socket.emit('playerList');
  }, 1000);
}

function revealPlayerLocations() {
  clearInterval(positionPollInterval);

  playerlist.forEach((player, i) => {
    const icon = document.getElementById(`klickPositionHost${i}`);
    const nameLabel = document.getElementById(`playerName${i}`);
    if (!icon || !nameLabel) {
      return;
    }

    icon.style.left = `${player.x - 15}px`;
    icon.style.top = `${player.y - 15}px`;
    nameLabel.style.left = `${player.x - 32}px`;
    nameLabel.style.top = `${player.y + 20}px`;
    icon.style.display = 'block';
    nameLabel.style.display = 'block';
    nameLabel.innerText = player.name;
  });
}

function showResults() {
  document.getElementById('entfernung').disabled = true;
  document.getElementById('anzeigen').disabled = true;

  socket.emit('playerList');
  socket.emit('getResultForClient');

  document.getElementById('hostAbstand').style.display = 'block';

  const goalPositionDiv = document.getElementById('goalPosition');
  goalPositionDiv.style.left = `${goalX - 15}px`;
  goalPositionDiv.style.top = `${goalY - 15}px`;
  goalPositionDiv.style.display = 'block';

  playerlist.forEach((player, i) => {
    drawLineHost(player.x, player.y, goalX, goalY, i, player.abstand, player.name);
  });
}

function drawLineHost(x1, y1, x2, y2, index, elementAbstand, name) {
  const context = canv.getContext('2d');
  const abstandRef = document.getElementById(`abstand${index}`);
  const nameRef = document.getElementById(`name${index}`);

  const dx = x2 - x1;
  const dy = y2 - y1;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const xIncrement = dx / steps;
  const yIncrement = dy / steps;

  let currentX = x1;
  let currentY = y1;
  let count = 0;

  context.clearRect(0, 0, 800, 592);

  const animation = setInterval(() => {
    strokeMapLine(context, x1, y1, currentX, currentY);

    currentX += xIncrement;
    currentY += yIncrement;
    count += 1;

    abstandRef.textContent = `${count} Pixel Abstand`;
    nameRef.textContent = `${name}:`;

    if (count >= steps) {
      clearInterval(animation);
      abstandRef.textContent = `${elementAbstand} Pixel Abstand`;
    }
  }, 10);
}

/**
 * Zeichnet eine Linie mit dunklem "Outline"-Effekt darunter, damit sie
 * sich sowohl auf hellen als auch dunklen Kartenbereichen gut abhebt.
 * (Gleiche Optik wie in client.js, damit Spieler- und Host-Ansicht
 * einheitlich aussehen.)
 */
function strokeMapLine(context, x1, y1, x2, y2) {
  context.lineCap = 'round';

  context.lineWidth = 5;
  context.strokeStyle = 'rgba(20, 16, 10, 0.55)';
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();

  context.lineWidth = 2.5;
  context.strokeStyle = '#fff3d6';
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}