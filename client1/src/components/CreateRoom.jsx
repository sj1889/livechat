import React from "react";

const CreateRoom = (props) => {
    const create = async (e) => {
        e.preventDefault();
        // print(e)

        const response1 = await fetch("http://localhost:8000/create");
        const { roomID } = await response1.json();
        console.log(roomID)

        const response2 = await fetch(`http://localhost:8000/user?roomID=${roomID}`);
        const { userID } = await response2.json();
        console.log(userID)
		props.history.push({
            pathname: `/room/${roomID}`,
            state: { roomID, userID }
        });
    };
    return (
        <div>
            <button onClick={create}>Create Room</button>
        </div>
    );
};

export default CreateRoom;
