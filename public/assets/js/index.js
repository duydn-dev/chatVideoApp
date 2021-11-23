const socket = io('/');
var app = new Vue({
    el: '#app',
    data: {
        currentUser: {},
        client: [],
        inMess: "",
        messages: []
    },
    methods: {
        makeId(length) {
            let result = '';
            let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let charactersLength = characters.length;
            for (var i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        },
        async openPopUser() {
            const name = await UIkit.modal.prompt('Tên của bạn:');
            const loginData = {
                userName: name ? name : "Người dùng ẩn danh",
                userId: this.makeId(10),
                roomId: r_id,
                isTurnOnCamera: true,
                isTurnOnAudio: true
            }
            localStorage.setItem('currentUser', JSON.stringify(loginData))
            return loginData;
        },
        async handlerSocketIo() {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            const myVideo = document.createElement('video');
            myVideo.muted = true;
            
            this.currentUser.roomId = r_id;
            socket.emit('join-room', this.currentUser);
            socket.on('clients', (data) => {
                this.client = data;
            })

            socket.on('user-connected', (data) => {
                this.currentUser.socketId = data.socketId;
                if ($(`#u_${data.userId}`).children().length > 0)
                    $(`#u_${data.userId}`).empty();
                
                this.addVideoStream(myVideo, stream, this.currentUser.userId);
                // // add other user connect
                const otherUser = document.createElement('video');
                this.client.forEach(element => {
                    if(element.userId != this.currentUser.userId){
                        this.addVideoStream(otherUser, stream, element.userId);
                    }
                });
            })

            // chat
            socket.on('send-message-to-room', (data) => {
                this.messages.push(data);
            })

            // tắt bật cam
            socket.on('send-toggle-camera', (user) => {
                const currVideo = this.client.find(n => n.userId == user.userId);
                currVideo.isTurnOnCamera = user.isTurnOnCamera;
                if(user.userId == this.currentUser.userId){
                    this.currentUser.isTurnOnCamera = user.isTurnOnCamera;
                }
            })

            // tắt bật audio
            socket.on('send-toggle-audio', (user) => {
                console.log(user);
                $(`#u_${user.userId} video`).prop('muted', !user.isTurnOnAudio);
                if(user.userId == this.currentUser.userId){
                    this.currentUser.isTurnOnAudio = user.isTurnOnAudio;
                }
            })
            
        },
        addVideoStream(video, stream, userId){
            video.srcObject = stream;
            video.addEventListener('loadedmetadata', () =>{
                video.play();
            })
            var vi = document.getElementById("u_" + userId);
            vi.append(video);
        },
        clearCurrentData() {
            localStorage.removeItem('currentUser');
            location.reload();
        },
        onSendMessage(){
            socket.emit('send-message', {
                userId: this.currentUser.userId,
                socketId: this.currentUser.socketId,
                userName: this.currentUser.userName,
                message: this.inMess
            });
            this.inMess = '';
        },
        onToggleCamera(){
            socket.emit('toggle-camera', this.currentUser);
        },
        onToggleMicrophone(){
            socket.emit('toggle-audio', this.currentUser);
        }
    },
    async created() {
        this.currentUser = (!localStorage.getItem('currentUser')) ? await this.openPopUser() : JSON.parse(localStorage.getItem('currentUser'));
        await this.handlerSocketIo();
    },
})
