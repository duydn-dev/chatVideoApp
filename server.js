const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const common = require('./common');

app.set('view engine', 'ejs')
app.use(express.static('public'))

// router 
app.get("/", async (req, res) => {
    const roomId = common.makeId(30);
    return res.redirect(`/${roomId}`);
})
app.get("/:roomId", async (req, res) => {
    return res.render("index.ejs", { roomId: `${req.params.roomId}` });
})

let clients = [];
io.on("connection", (socket) => {
    const socketId = socket.id;
    let roomId = "";
    // server nhận sự kiện join room
    socket.on("join-room", (req) => {
        const userInRoom = clients.find(n => n.userId === req.userId);
        if (!userInRoom) {
            req.socketId = socketId;
            clients.push(req);
        }
        roomId = req.roomId;
        socket.join(roomId);
        io.in(roomId).emit('clients', clients);
        io.in(roomId).emit('user-connected', { userId: req.userId, socketId: socketId});
        // socket.to(req.roomId).emit("clients", req.userId);
        // socket.to(req.roomId).emit("user-connected", req.userId);
    });
    socket.on('disconnect', () => {
        clients.splice(clients.findIndex(n => n.socketId === socketId), 1);
        io.in(roomId).emit('clients', clients);
    })
});

server.listen(3000);