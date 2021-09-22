const socket = io('/');
var app = new Vue({
    el: '#app',
    data: {
        currentUser: {},
        client: []
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
            const myVideo = document.createElement('video');
            myVideo.muted = true;

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            socket.emit('join-room', this.currentUser);
            socket.on('clients', (data) =>{
                this.client = data;
            })
            socket.on('user-connected', (data) => {
                if ($(`#u_${data.userId}`).children().length > 0)
                    $(`#u_${data.userId}`).empty();
                
                this.addVideoStream(myVideo, stream, this.currentUser.userId);
                // add other user connect
                const otherUser = document.createElement('video');
                this.client.forEach(element => {
                    if(element.userId != this.currentUser.userId)
                        this.addVideoStream(otherUser, stream, element.userId);
                });
                
            })
            // socket.on('user-leave-room', () =>{
            //     const i = this.client.findIndex(n => n.userId === this.currentUser.userId);
            //     this.client.splice(i, 1);
            // })
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
        },
    },
    async created() {
        this.currentUser = (!localStorage.getItem('currentUser')) ? await this.openPopUser() : JSON.parse(localStorage.getItem('currentUser'));
        this.handlerSocketIo();
    },
})
