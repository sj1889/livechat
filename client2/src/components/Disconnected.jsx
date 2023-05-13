import React, { useState } from "react";

const Disconnected = (props) => {
  const roomID = props.match.params.roomID
  const reconnect = async (e) => {
    e.preventDefault();
    console.log("hi");
    props.history.push(`/room/${roomID}`);
  };

  return (
      <div>
        <p>You have disconnected from the call</p>
        <div>
            <button onClick={reconnect}>Reconnect</button>
        </div>
    </div>
  );
};

export default Disconnected;
