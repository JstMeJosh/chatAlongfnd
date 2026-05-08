import { useState } from "react";
import io from "socket.io-client";
import Chat from "./Chat";

const socket = io.connect(import.meta.env.VITE_API_URL);

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);

  const joinRoom = () => {
    if (username.trim() !== "" && room.trim() !== "") {
      setShowChat(true);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-blue-600 font-sans">
      {!showChat ? (
        <div className="bg-white p-8 rounded-lg shadow-xl w-80 flex flex-col gap-4">
          <h3 className="text-2xl font-bold text-center text-gray-800">
            Join A Chat
          </h3>
          <input
            type="text"
            placeholder="Username..."
            className="border-2 p-2 rounded text-gray-800 outline-none focus:border-blue-500"
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Room ID..."
            className="border-2 p-2 rounded text-gray-800 outline-none focus:border-blue-500"
            onChange={(e) => setRoom(e.target.value)}
            onKeyUp={(e) => e.key === "Enter" && joinRoom()}
          />
          <button
            onClick={joinRoom}
            className="bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition"
          >
            Join A Room
          </button>
        </div>
      ) : (
        <Chat
          socket={socket}
          username={username}
          room={room}
          setShowChat={setShowChat}
        />
      )}
    </div>
  );
}

export default App;
