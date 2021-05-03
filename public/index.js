// Creating the peer
const peer = new RTCPeerConnection({
  iceServers: [
    {
      urls: "stun:stun.stunprotocol.org"
    }
  ]
});

// Connecting to socket
const socket = io('http://localhost:3000');

const onSocketConnected = () => {
  const constraints = {
    audio: true,
    video: true
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  document.querySelector('#localVideo').srcObject = stream;
  stream.getTracks().forEach(track => peer.addTrack(track, stream));
}

// Handle call button
callButton.addEventListener('click', async () => {
  const localPeerOffer = await peer.createOffer();
  await peer.setLocalDescription(new RTCSessionDescription(localPeerOffer));
  
  sendMediaOffer(localPeerOffer);
});

// Create media offer
socket.on('mediaOffer', async () => {
  await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
  const peerAnswer = await peer.createAnswer();
  await peer.setLocalDescription(new RTCSessionDescription(peerAnswer));

  sendMediaAnswer(peerAnswer);
});

// Create media answer
socket.on('mediaAnswer', async () => {
  await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
});

// ICE layer
peer.onicecandidate = (event) => {
  sendIceCandidate(event);
}

socket.on('remotePeerIceCandidate', async (data) => {
  try {
    const candidate = new RTCIceCandidate(data.candidate);
    await peer.addIceCandidate(candidate);
  } catch (error) {
    // Handle error, this will be rejected very often
  }
})

peer.addEventListener('track', (event) => {
  const [stream] = event.streams;
  document.querySelector('#remoteVideo').srcObject = stream;
})


let callButton = document.querySelector('#call');

let selectedUser;

const sendMediaAnswer = (peerAnswer) => {
  socket.emit('mediaAnswer', {
    answer: peerAnswer,
    from: socket.id,
    to: data.from
  })
}

const sendMediaOffer = (localPeerOffer) => {
  socket.emit('mediaOffer', {
    offer: localPeerOffer,
    from: socket.id,
    to: selectedUser
  });
};

const sendIceCandidate = (event) => {
  socket.emit('iceCandidate', {
    to: selectedUser,
    candidate: event.candidate,
  });
}

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
socket.on('update-user-list', onUpdateUserList);
socket.on('connect', handleSocketConnected);

const handleSocketConnected = async () => {
  onSocketConnected();
  socket.emit('requestUserList');
};

