"use strict";
const socket = io('/');
var app = new Vue({
    el: '#app',
    data: {
        currentUser: {},
        client: [],
        inMess: "",
        messages: [],
        code: r_id,
        isShareScreen: false,
        peerConnections: {},
        watcherPeerConnection: null,
    },
    computed: {
        config() {
            return {
                iceServers: [
                    {
                        urls: ["stun:stun.l.google.com:19302"]
                    }
                ]
            }
        },
        constraints() {
            return {
                video: true,
                audio: false,
            }
        },
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
                isTurnOnAudio: true,
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
                    if (element.userId != this.currentUser.userId) {
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
                if (user.userId == this.currentUser.userId) {
                    this.currentUser.isTurnOnCamera = user.isTurnOnCamera;
                }
            })

            // tắt bật audio
            socket.on('send-toggle-audio', (user) => {
                const currVideo = this.client.find(n => n.userId == user.userId);
                currVideo.isTurnOnAudio = user.isTurnOnAudio;
                $(`#u_${user.userId} video`).prop('muted', !user.isTurnOnAudio);
                if (user.userId == this.currentUser.userId) {
                    this.currentUser.isTurnOnAudio = user.isTurnOnAudio;
                }
            })

            // share screen
            // người share
            socket.on("watcher", id => {
                this.isShareScreen = true;
                const screenVideo = document.getElementById("video-share");
                const peerConnection = new RTCPeerConnection(this.config);
                this.peerConnections[id] = peerConnection;

                let stream = screenVideo.srcObject;
                stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

                peerConnection.onicecandidate = event => {
                    if (event.candidate) {
                        socket.emit("candidate", id, event.candidate, this.currentUser.userId);
                    }
                };

                peerConnection
                    .createOffer()
                    .then(sdp => peerConnection.setLocalDescription(sdp))
                    .then(() => {
                        socket.emit("offer", id, peerConnection.localDescription);
                    });
            });

            socket.on("answer", (id, description) => {
                this.peerConnections[id].setRemoteDescription(description);
            });

            socket.on("candidate", (id, candidate, userId) => {
                if (this.currentUser.userId == userId) {
                    this.peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
                }
                else {
                    this.watcherPeerConnection
                        .addIceCandidate(new RTCIceCandidate(candidate))
                        .catch(e => console.error(e));
                }
            });

            socket.on("disconnectPeer", id => {
                this.peerConnections[id].close();
                delete this.peerConnections[id];
            });

            window.onunload = window.onbeforeunload = () => {
                socket.close();
            };
            // người kêt nối

            socket.on("offer", (id, description) => {
                this.isShareScreen = true;
                this.watcherPeerConnection = new RTCPeerConnection(this.config);
                this.watcherPeerConnection
                    .setRemoteDescription(description)
                    .then(() => this.watcherPeerConnection.createAnswer())
                    .then(sdp => this.watcherPeerConnection.setLocalDescription(sdp))
                    .then(() => {
                        socket.emit("answer", id, this.watcherPeerConnection.localDescription);
                    });
                this.watcherPeerConnection.ontrack = event => {
                    const screenVideo = document.getElementById("video-share");
                    screenVideo.srcObject = event.streams[0];
                };
                this.watcherPeerConnection.onicecandidate = event => {
                    if (event.candidate) {
                        socket.emit("candidate", id, event.candidate, this.currentUser.userId);
                    }
                };
            });

            socket.on("connect", () => {
                socket.emit("watcher", this.currentUser.roomId);
            });

            socket.on("broadcaster", () => {
                socket.emit("watcher", this.currentUser.roomId);
            });

            // end 
        },
        addVideoStream(video, stream, userId) {
            video.srcObject = stream;
            video.addEventListener('loadedmetadata', () => {
                video.play();
            })
            var vi = document.getElementById("u_" + userId);
            vi.append(video);
        },
        clearCurrentData() {
            localStorage.removeItem('currentUser');
            location.reload();
        },
        onSendMessage() {
            socket.emit('send-message', {
                userId: this.currentUser.userId,
                socketId: this.currentUser.socketId,
                userName: this.currentUser.userName,
                message: this.inMess
            });
            this.inMess = '';
        },
        onToggleCamera() {
            socket.emit('toggle-camera', this.currentUser);
        },
        onToggleMicrophone() {
            socket.emit('toggle-audio', this.currentUser);
        },
        async shareScreen() {
            this.isShareScreen = true;
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            const screenVideo = document.getElementById("video-share");
            screenVideo.srcObject = stream;
            socket.emit("broadcaster");
        }
    },
    async created() {
        this.currentUser = (!localStorage.getItem('currentUser')) ? await this.openPopUser() : JSON.parse(localStorage.getItem('currentUser'));
        await this.handlerSocketIo();
    },
})