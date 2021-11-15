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

// const client = [
//     {
//         roomId: 'a',
//         users: []
//     }
// ]

let clients = [];
io.on("connection", (socket) => {
    const socketId = socket.id;
    let roomId = "";
    // server nhận sự kiện join room
    socket.on("join-room", (req) => {
        //console.log(req.roomId)
        // check xem xem room đã tồn tại chưa, chưa có thì thêm, đã có thì update user vào đó
        const exitsRoom = clients.find(n => n.roomId && n.roomId === req.roomId);
        req.socketId = socketId;
        if(!exitsRoom){
            // nếu room chưa có thì tạo room + thêm người
            clients.push({
                roomId: req.roomId,
                users: [
                    {...req}
                ]
            })
        }
        else{
            // nếu có rồi thì check xem user đó có đang trong phòng hay không, nếu không thì push vào phòng
            if(!exitsRoom.users || exitsRoom.users.length <= 0)
                exitsRoom.users = [];

            const users = exitsRoom.users.find(n => n.userId == req.userId);
            if(!users){
                exitsRoom.users.push(req);
            }
        }

        const usersInRoom = clients.find(n => n.roomId === req.roomId);
        console.log(clients);
        roomId = req.roomId;
        socket.join(roomId);
        io.in(roomId).emit('clients', usersInRoom.users);
        io.in(roomId).emit('user-connected', { userId: req.userId, socketId: socketId});
    });
    socket.on('disconnect', () => {
        const room = clients.find(n => n.roomId == roomId);
        if(room){
            const i = room?.users.findIndex(n => n.socketId === socketId);
            if(i !== -1)
                room?.users.splice(i, 1);
        }
        io.in(roomId).emit('clients', room?.users ? room.users: []);
    })
});

server.listen(3000);