//serversite

const express = require('express');
const app = express();
const path = require('path');

const http = require('http').Server(app);

const port = process.env.PORT||8080;

//server to socket
const io = require('socket.io')(http);

let playerlist = []
let iconList = ["Diego.png","Lester.png","Milten.png","Gorn.png"]

app.use(express.static('assets'));
app.use(express.static('src'));

//route
app.get('/', (req,res) =>{
    res.sendFile(path.join(__dirname, 'src/index.html'))
})

//new connection
io.on('connection', socket => {

    socket.on("join room", (roomName, cb) => {
        socket.join(roomName)
    })
    
    console.log("User connected")

    socket.emit("init")

    socket.on('playerList', () => {
        socket.emit('list',playerlist)
    })

    socket.on('disconnect', () =>{
        playerlist = playerlist.filter(item => item.id !== socket.id)
    })

    socket.on('message', msg => {
        console.log(msg)
    })

    socket.on("getResultForClient", () => {
        io.emit("resultForClient")
    })

    //emit event
    socket.emit("server", "Received from Server")

    socket.on("click", (data) => {


        for (let i = 0; i < playerlist.length; i++) {
            const element = playerlist[i];
            if(element.id == data.id){
                playerlist[i] = data 
                console.log(playerlist[i])
            }

        }
    
    

        socket.emit("recClick", data);
    })

    socket.on("result", () =>{
        socket.emit("result");
    })

    socket.on("question",(data) => {
        io.emit("recQuestion",data)
    })

    socket.on("player", (spieler) =>{

        if(playerlist.length > 0 && playerlist.length <4){
            spieler.icon = iconList[playerlist.length]
        } else if(playerlist.length == 0) {
            spieler.icon = iconList[0]
        }
        playerlist.push(spieler)



        socket.emit("playerSetup", spieler.icon)

    })

})

http.listen(port, () =>{
    console.log("Listen to" + port)
})
