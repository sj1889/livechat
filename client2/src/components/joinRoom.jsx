import React, { useState } from "react";

const JoinRoom = (props) => {
  const [roomID, setRoomID] = useState("");

  const handleInputChange = (e) => {
    setRoomID(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("hi");
    const response = await fetch(`http://localhost:8000/user?roomID=${roomID}`);
    const { userID } = await response.json();
    console.log(userID)
    props.history.push({
            pathname: `/room/${roomID}`,
            state: { roomID, userID }
        });
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>
          Room ID:
          <input type="text" value={roomID} onChange={handleInputChange} />
        </label>
        <button type="submit">Join Room</button>
      </form>
    </div>
  );
};

export default JoinRoom;
