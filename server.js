const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const common = require('./common');

app.set('view engine', 'ejs')
app.use(express.static('public'))

var roomId = common.makeId(30);
// router 
app.get("/", async (req, res) => {
    return res.redirect(`/${roomId}`);
})
app.get("/:roomId", async (req, res) => {
    return res.render("index.ejs", { roomId: `${req.params.roomId}` });
})

let clients = [];
io.on("connection", (socket) => {
    // server nhận sự kiện join room
    socket.on("join-room", (req) => {
        const userInRoom = clients.find(n => n.userId === req.userId);
        if (!userInRoom) {
            clients.push(req);
        }
        socket.join(req.roomId);
        io.in(req.roomId).emit('clients', clients);
        io.in(req.roomId).emit('user-connected', { userId: req.userId });
        console.log("connected");
        //socket.to().emit("user-connected", req.userId);
    });
    socket.on('disconnect', () => {
        console.log("leave")
        //socket.to(rmid).emit("user-leave-room");
    });
});

server.listen(3000);