/**
 * main.js
 *
 * Socket.IO-Server für das Geoguessr-Mini-Spiel.
 *
 * WICHTIG: Alle Socket-Events (Namen und Datenform) sind unverändert -
 * client.js/host.js und die Angular-Anwendung verlassen sich darauf.
 * Geändert wurden nur interne Struktur, Kommentare und zwei konkrete
 * Bugfixes (siehe Kommentare unten).
 */

const path = require('path');
const express = require('express');

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const http = require('http').Server(app);
const port = process.env.PORT || 8080;

// Socket-Server-Konfiguration unverändert (lange pingTimeout, damit
// Verbindungen z.B. bei kurzen Netzwerkausfällen nicht sofort
// getrennt werden).
const io = require('socket.io')(http, {
  pingInterval: 25000,
  pingTimeout: 600000,
  maxHttpBufferSize: 1e8,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const ICON_LIST = ['Diego.png', 'Lester.png', 'Milten.png', 'Gorn.png'];
const STAY_CONNECTED_INTERVAL_MS = 5000;

let playerlist = [];

app.use(express.static('assets'));
app.use(express.static('src'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/index.html'));
});

app.get('/keepalive', (req, res) => {
  console.log('KEEPALIVE');
  res.sendStatus(200);
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join room', (roomName) => {
    socket.join(roomName);
  });

  socket.emit('init');
  socket.emit('server', 'Received from Server');

  socket.on('playerList', () => {
    socket.emit('list', playerlist);
  });

  // Bugfix: Es gab vorher zwei getrennte "pong"-Handler (einer loggte
  // nur, der andere setzte lastPong). Beide liefen ohnehin bei jedem
  // "pong"-Event, wurden hier einfach zu einem zusammengefasst.
  socket.on('pong', () => {
    socket.lastPong = Date.now();
  });

  socket.on('message', (msg) => {
    console.log(msg);
  });

  socket.on('getResultForClient', () => {
    io.emit('resultForClient');
  });

  socket.on('click', (data) => {
    const index = playerlist.findIndex((player) => player.id === data.id);
    if (index !== -1) {
      playerlist[index] = data;
    }

    socket.emit('recClick', data);
  });

  socket.on('result', () => {
    socket.emit('result');
  });

  socket.on('question', (data) => {
    io.emit('recQuestion', data);
  });

  socket.on('player', (spieler) => {
    // Verhalten unverändert: Icon wird nach Reihenfolge des Beitritts
    // vergeben. Bei mehr als 4 Spielern bleibt das vom Client
    // geschickte Icon stehen (kein Icon aus der Liste mehr übrig) -
    // das war schon vorher so und wurde bewusst nicht angefasst.
    if (playerlist.length === 0) {
      spieler.icon = ICON_LIST[0];
    } else if (playerlist.length < 4) {
      spieler.icon = ICON_LIST[playerlist.length];
    }

    playerlist.push(spieler);
    socket.emit('playerSetup', spieler.icon);
  });

  // Bugfix: Dieses Intervall lief vorher für JEDE Verbindung ab dem
  // Moment ihres "connection"-Events und wurde nie wieder gestoppt -
  // auch nicht nach disconnect(). Über die Zeit sammeln sich so
  // immer mehr "tote" Intervalle an, die weiterhin (erfolglos) auf
  // einen längst geschlossenen Socket emitten. Jetzt wird die
  // Intervall-ID gespeichert und bei disconnect sauber gestoppt.
  const stayConnectedInterval = setInterval(() => {
    socket.emit('stayConnected', playerlist);
  }, STAY_CONNECTED_INTERVAL_MS);

  socket.on('disconnect', () => {
    clearInterval(stayConnectedInterval);

    const removedPlayers = playerlist.filter((player) => player.id === socket.id);
    removedPlayers.forEach((player) => {
      console.log(`Player ${player.name} disconnected`);
    });

    playerlist = playerlist.filter((player) => player.id !== socket.id);
  });
});

http.listen(port, () => {
  console.log('Listening on', port);
});