import React, { useEffect, useRef, useState} from "react";

const Room = (props) => {
    const userVideo = useRef();
    const userStream = useRef();
    const partnerVideo = useRef();
    const peerRef = useRef();
    const webSocketRef = useRef();
    const [isMuted, setIsMuted] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isVideoPaused, setIsVideoPaused] = useState(false);
    const [isPartner, setisPartner] = useState(false);
    const roomID = props.location.state.roomID;
    const userID = props.location.state.userID;


    const openCamera = async () => {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const cameras = allDevices.filter(
            (device) => device.kind == "videoinput"
        );

        const constraints = {
            audio: true,
            video: {
                deviceId: cameras[cameras.length - 1].deviceId,
                width: {
                    max: 1280
                },
                height: {
                    max: 720
                },
            },
        };

        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        openCamera().then((stream) => {
            userVideo.current.srcObject = stream;
            userStream.current = stream;
            webSocketRef.current = new WebSocket(
                `ws://localhost:8000/join?roomID=${roomID}&userID=${userID}`
            );

            webSocketRef.current.addEventListener("open", () => {
                webSocketRef.current.send(JSON.stringify({ join: true }));
            });

            webSocketRef.current.addEventListener("message", async (e) => {
                const message = JSON.parse(e.data);

                if (message.join) {
                    console.log("Joining messagge");
                    callUser();
                }

				if (message.offer) {
                    console.log("Send/Receive Answer");
                    handleOffer(message.offer);
                }

                if (message.answer) {
                    console.log("Receiving Answer");
                    peerRef.current.setRemoteDescription(
                        new RTCSessionDescription(message.answer)
                    );
                }

                if (message.iceCandidate) {
                    console.log("Receiving and Adding ICE Candidate");
                    try {
                        await peerRef.current.addIceCandidate(
                            message.iceCandidate
                        );
                    } catch (err) {
                        console.log("Error Receiving ICE Candidate", err);
                    }
                }
            });
        });
    },[]);

    
    const handleOffer = async (offer) => {
        console.log("Received Offer, Creating Answer");
        peerRef.current = createPeer();

        await peerRef.current.setRemoteDescription(
            new RTCSessionDescription(offer)
        );


        userStream.current.getTracks().forEach((track) => {
            peerRef.current.addTrack(track, userStream.current);
        });
        
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        
        webSocketRef.current.send(
            JSON.stringify({ answer: peerRef.current.localDescription })
            );
        };
        
        const callUser = () => {
            console.log("Calling Other User");
            peerRef.current = createPeer();
            
            userStream.current.getTracks().forEach((track) => {
                peerRef.current.addTrack(track, userStream.current);
            });
        };
        
    const createPeer = () => {
        console.log("Creating Peer Connection");
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        
        peer.onnegotiationneeded = handleNegotiationNeeded;
        peer.onicecandidate = handleIceCandidateEvent;
        peer.ontrack = handleTrackEvent;

        return peer;
    };
    
    const handleNegotiationNeeded = async () => {
        console.log("Creating Offer");
        
        try {
            const myOffer = await peerRef.current.createOffer();
            await peerRef.current.setLocalDescription(myOffer);
            
            webSocketRef.current.send(
                JSON.stringify({ offer: peerRef.current.localDescription })
                );
            } catch (err) {}
        };
        
        const handleIceCandidateEvent = (e) => {
            console.log("Found Ice Candidate");
            if (e.candidate) {
            console.log(e.candidate);
            webSocketRef.current.send(
                JSON.stringify({ iceCandidate: e.candidate })
            );
        }
    };

    const handleTrackEvent = (e) => {
        console.log("Received Tracks");
        setisPartner(true);
        partnerVideo.current.srcObject = e.streams[0];
    };

    const EndCall = async (e) => {
        try{
            e.preventDefault()
            const resp = await fetch(`http://localhost:8000/disconnect?roomID=${roomID}&userID=${userID}`)
            props.history.push({
                pathname: `/disconnected/${roomID}`,
                state: { roomID, userID }
            });
        } catch (err) {
            console.log(err)
        }
    }

    //Mute:Unmute functions
    const handleMuteClick = async (e) => {
        try {
            e.preventDefault()
            const audioTrack = userStream.current.getAudioTracks()[0];
            console.log(audioTrack)
            audioTrack.enabled = false;
            setIsMuted(true);
            console.log(isMuted);
        } catch (err) {
            console.log(err);
        }
    };
    const handleUnmuteClick = (e) => {
        try{        
            e.preventDefault()
            console.log(userStream.current.getAudioTracks())
            const Audiotrack = userStream.current.getAudioTracks()[0];
            Audiotrack.enabled = true;
            setIsMuted(false);
            console.log(isMuted);
        } catch (err) {
            console.log(err);
        }

    };

    //Pause:Resume video functions
    function handlePauseClick() {
        try{
            const videoDevices = userStream.current.getVideoTracks();
            const videoDevice = videoDevices[0]; 
            console.log(videoDevice);
            videoDevice.enabled = false;
            setIsVideoPaused(true);
            console.log(isVideoPaused);
        }catch(err){
            console.log(err)
        }
      }
      
    function handleUnpauseClick() {
        try{
            const videoDevices = userStream.current.getVideoTracks();
            const videoDevice = videoDevices[0]; 
            console.log(videoDevice);
            videoDevice.enabled = true;
            setIsVideoPaused(false);
            console.log(isVideoPaused);
        }catch(err){
            console.log(err)
        }
    }

    const handleScreenShareClick = async () => {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia();
          console.log(displayStream);
          userVideo.current.srcObject = displayStream;
          userStream.current = displayStream;
      
          // Replace tracks in the peer connection with the screen sharing track
          peerRef.current.getSenders().forEach((sender) => {
            const track = sender.track;
            if (track.kind === "video") {
              sender.replaceTrack(displayStream.getVideoTracks()[0]);
            }
          });
      
          setIsScreenSharing(true);
        } catch (err) {
          console.log(err);
        }
      };

      const handleStopScreenShareClick = async () => {
        // Stop the screen sharing video track
        userStream.current.getTracks().forEach((track) => {
          if (track.kind === "video") {
            console.log(track.kind);
            track.stop();
          }
        });
      
        try {
          const constraints = {
            audio: true,
            video: true
          };
      
          const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log("UserMedia");
          console.log(mediaStream);
      
          const videoTrack = mediaStream.getVideoTracks()[0];
          const audioTrack = mediaStream.getAudioTracks()[0];
      
          // Replace tracks in the userStream with the original video and audio tracks
          userStream.current.getTracks().forEach((track) => {
            userStream.current.removeTrack(track);
          });
          userStream.current.addTrack(videoTrack);
          userStream.current.addTrack(audioTrack);
      
          // Replace tracks in the peer connection with the original video and audio tracks
          peerRef.current.getSenders().forEach((sender) => {
            const track = sender.track;
            console.log(track.kind);
            if (track && track.kind === "video") {
              sender.replaceTrack(videoTrack);
            } else if (track && track.kind === "audio") {
              sender.replaceTrack(audioTrack);
            }
          });
      
          userVideo.current.srcObject = userStream.current;
          setIsScreenSharing(false);
        } catch (err) {
          console.log(err);
        }
      };


    return (
        <div>
            <video autoPlay controls={true} ref={userVideo}></video>
            {isPartner ? (<video autoPlay controls={true} ref={partnerVideo}></video>
            ) : (
                <></>
            ) }

            {isMuted ? (
            <button onClick={handleUnmuteClick}>Unmute</button>
            ) : (
            <button onClick={handleMuteClick}>Mute</button>
            )}

            {isVideoPaused ? (
            <button onClick={handleUnpauseClick}>Continue Video</button>
            ) : (
            <button onClick={handlePauseClick}>Stop Video</button>
            )}
            
            {isScreenSharing ? (
            <button onClick={handleStopScreenShareClick}>Stop Sharing</button>
            ) : (
            <button onClick={handleScreenShareClick}>Share Screen</button>
            )}
        </div>
    );
};

export default Room;
