const callButton = document.querySelector('#call');

let selectedUser;

const createPeerConnection = () => {
  return new RTCPeerConnection({
    iceServers: [
      {
        urls: "stun:stun.stunprotocol.org"
      }
    ]
  });
};

let peer = createPeerConnection();
const socket = io('http://localhost:3000');

const onSocketConnect = async () => {
  document.querySelector('#userId').innerHTML = `My user id is ${socket.id}`

  const constraints = {
    audio: true,
    video: true
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  document.querySelector('#localVideo').srcObject = stream;
  stream.getTracks().forEach(track => peer.addTrack(track, stream));
  callButton.disabled = false;
};

const onIceCandidateEvent = event => {
  socket.emit('iceCandidate', {
    to: selectedUser,
    candidate: event.candidate,
  });
};

const onRemotePeerIceCandidate = async (data) => {
  try {
    const candidate = new RTCIceCandidate(data.candidate);
    await peer.addIceCandidate(candidate);
  } catch (error) {
    // Handle error
  }
};

const onUpdateUserList = ({ userIds }) => {
  const usersList = document.querySelector('#usersList');
  const usersToDisplay = userIds.filter(id => id !== socket.id);

  usersList.innerHTML = '';
  
  usersToDisplay.forEach(user => {
    const userItem = document.createElement('div');
    userItem.innerHTML = user;
    userItem.className = 'user-item';
    userItem.addEventListener('click', () => {
      const userElements = document.querySelectorAll('.user-item');
      userElements.forEach((element) => {
        element.classList.remove('user-item--touched');
      })
      userItem.classList.add('user-item--touched');
      selectedUser = user;
    });
    usersList.appendChild(userItem);
  });
};

const onMediaOffer = async (data) => {
  try {
    await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
    const peerAnswer = await peer.createAnswer();
    await peer.setLocalDescription(new RTCSessionDescription(peerAnswer));

    socket.emit('mediaAnswer', {
      answer: peerAnswer,
      from: socket.id,
      to: data.from
    })
  } catch (er) {
    console.log(er)
  }
};

const onMediaAnswer = async (data) => {
  await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
};

const call = async () => {
  callButton.disabled = true;

  const localPeerOffer = await peer.createOffer();

  await peer.setLocalDescription(new RTCSessionDescription(localPeerOffer));
  socket.emit('mediaOffer', {
    offer: localPeerOffer,
    from: socket.id,
    to: selectedUser
  })
};

const gotRemoteStream = (event) => {
  const [stream] = event.streams;
  document.querySelector('#remoteVideo').srcObject = stream;
};

// To start, both sides need to get user media, create peer connection and add tracks to peer, so that ICE candidates are being sent out
socket.on('connect', onSocketConnect);
// Try adding remote candidate
socket.on('remotePeerIceCandidate', onRemotePeerIceCandidate)
// Update user list
socket.on('update-user-list', onUpdateUserList);
// Receive call from a user
socket.on('mediaOffer', onMediaOffer);
// Receive answer from callee
socket.on('mediaAnswer', onMediaAnswer);

callButton.addEventListener('click', call);

// Update remote video element when connection between peers is established
peer.addEventListener('track', gotRemoteStream);
// Gets possible ICE candidate and sends it to other peer
peer.onicecandidate = onIceCandidateEvent;