//serversite

const express = require('express');
const app = express();
const path = require('path');

const http = require('http').Server(app);

const port = process.env.PORT||8080;

//server to socket
const io = require('socket.io')(http);

app.use(express.static('assets'));

//route
app.get('/', (req,res) =>{
    res.sendFile(path.join(__dirname, 'src/index.html'))
})

//new connection
io.on('connection', socket => {

    console.log("User connected")

    io.emit("init")

    socket.on('disconnect', () =>{
        console.log("User disconnected")
    })

    socket.on('message', msg => {
        console.log(msg)
    })

    //emit event
    socket.emit("server", "Received from Server")

    socket.on("click", (data) => {

        console.log("User Click erkannt", data)

        io.emit("recClick", data);
    })

    socket.on("result", () =>{
        io.emit("result");
    })

    socket.on("question",(data) => {
        io.emit("recQuestion",data)
    })

})

http.listen(port, () =>{
    console.log("Listen to" + port)
})
