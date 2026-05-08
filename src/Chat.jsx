import { useState, useEffect, useRef } from "react";
import EmojiPicker from "emoji-picker-react";

const notificationSound = new Audio("/notify.mp3");

function Chat({ socket, username, room, setShowChat }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // --- NEW STATE FOR TYPING ---
  const [typingStatus, setTypingStatus] = useState({ active: false, user: "" });

  const lastMessageRef = useRef(null);
  const hasJoined = useRef(false);

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    if (date.toDateString() === today) return "Today";
    return date.toLocaleDateString([], {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  };

  useEffect(() => {
    if (!socket || !room || !username) return;
    if (!hasJoined.current) {
      socket.emit("join_room", { room, username });
      hasJoined.current = true;
    }

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
        const response = await fetch(`${apiUrl}/messages/${room}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          const mapped = data.map((msg) => ({
            ...msg,
            author: msg.username || msg.author,
            timestamp: msg.timestamp || msg.createdAt || Date.now(),
            time: new Date(msg.timestamp || msg.createdAt || Date.now()).toLocaleTimeString([], {
              hour: "2-digit", minute: "2-digit", hour12: false,
            }),
          }));
          setMessageList(mapped);
        }
      } catch (err) {
        console.error("History fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
    return () => { hasJoined.current = false; };
  }, [room, username, socket]);

  useEffect(() => {
    const handleReceiveMessage = (data) => {
      const formattedMsg = { ...data, timestamp: data.timestamp || Date.now() };
      setMessageList((prev) => [...prev, formattedMsg]);
      if (data.author !== username && data.author !== "System" && document.hidden) {
        notificationSound.play().catch((e) => console.log("Audio blocked"));
      }
    };

    // --- TYPING LISTENERS ---
    socket.on("receive_message", handleReceiveMessage);
    socket.on("user_list", (users) => setUserList(users));
    
    socket.on("display_typing", (user) => {
      setTypingStatus({ active: true, user: user });
    });

    socket.on("hide_typing", () => {
      setTypingStatus({ active: false, user: "" });
    });

    return () => {
      socket.off("receive_message");
      socket.off("user_list");
      socket.off("display_typing");
      socket.off("hide_typing");
    };
  }, [socket, username]);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList, typingStatus.active]); // Added typingStatus to trigger scroll

  // --- UPDATED INPUT HANDLER ---
  const handleInputChange = (e) => {
    setCurrentMessage(e.target.value);

    // Tell server we are typing
    socket.emit("typing", { username, room });

    // Stop typing indicator after 2.5 seconds of no keys
    clearTimeout(window.typingTimer);
    window.typingTimer = setTimeout(() => {
      socket.emit("stop_typing", { room });
    }, 2500);
  };

  const sendMessage = async () => {
    if (currentMessage.trim() !== "") {
      const messageData = {
        room,
        author: username,
        message: currentMessage,
        timestamp: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
      };
      await socket.emit("send_message", messageData);
      socket.emit("stop_typing", { room }); // Immediately hide typing for others
      setMessageList((prev) => [...prev, messageData]);
      setCurrentMessage("");
      setShowEmojiPicker(false);
    }
  };

  const onEmojiClick = (emojiObject) => {
    setCurrentMessage((prev) => prev + emojiObject.emoji);
  };

  return (
    <div className="flex flex-col h-screen w-screen md:h-150 md:w-175 md:max-w-[95vw] bg-white md:rounded-2xl shadow-2xl overflow-hidden font-sans border border-gray-200">
      {/* HEADER (Same as yours) */}
      <div className="bg-gray-900 p-4 text-white flex justify-between items-center z-30 shadow-md">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowChat(false)} className="bg-red-500/20 hover:bg-red-600 text-red-500 hover:text-white px-3 py-1 rounded-lg text-[10px] font-bold transition-all border border-red-500/30">LEAVE</button>
          <div>
            <h2 className="text-sm font-black tracking-tighter text-blue-400 uppercase">ChatAlong</h2>
            <p className="text-[10px] opacity-60 font-bold">Room: {room}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-gray-400 font-bold uppercase block leading-none">User</span>
            <span className="text-sm font-bold text-green-400">{username}</span>
          </div>
          <button onClick={() => setShowSidebar(!showSidebar)} className="md:hidden p-2 bg-gray-800 rounded-lg text-blue-400 text-[10px] font-bold border border-blue-400/20">
            {showSidebar ? "CHAT" : `USERS (${userList.length})`}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR (Same as yours) */}
        <div className={`absolute md:relative z-20 w-64 md:w-44 h-full bg-gray-50 border-r border-gray-200 p-5 transition-transform duration-300 ${showSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Online Now</h3>
          <div className="flex flex-col gap-3 overflow-y-auto">
            {userList.map((user, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className={`text-xs font-bold truncate ${user === username ? "text-blue-600" : "text-gray-700"}`}>{user}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MESSAGES SECTION */}
        <div className="flex-1 flex flex-col bg-white w-full relative">
          {showEmojiPicker && (
            <div className="absolute bottom-20 left-2 z-50 shadow-2xl">
              <EmojiPicker onEmojiClick={onEmojiClick} theme="light" width={window.innerWidth < 768 ? 250 : 320} height={350} previewConfig={{ showPreview: false }} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-[#a3a0f7] bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] bg-repeat shadow-inner">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold uppercase tracking-tighter">Syncing history...</p>
              </div>
            ) : (
              <>
                {messageList.map((msg, index) => {
                  const isMe = username === msg.author;
                  const isSystem = msg.author === "System";
                  const currDate = new Date(msg.timestamp).toDateString();
                  const prevDate = index > 0 ? new Date(messageList[index - 1].timestamp).toDateString() : null;
                  const isNewDay = currDate !== prevDate;

                  return (
                    <div key={index}>
                      {isNewDay && (
                        <div className="flex justify-center my-6">
                          <span className="bg-gray-200/60 text-gray-500 text-[10px] px-4 py-1 rounded-full font-bold uppercase tracking-widest border border-gray-300/30">
                            {formatDateHeader(msg.timestamp)}
                          </span>
                        </div>
                      )}

                      {isSystem ? (
                        <div className="flex justify-center my-2">
                          <span className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter italic">{msg.message}</span>
                        </div>
                      ) : (
                        <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-3`}>
                          <div className={`max-w-[85%] md:max-w-[75%] p-3 rounded-2xl shadow-sm ${isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200"}`}>
                            {!isMe && <p className="text-[10px] font-black text-blue-500 uppercase mb-1">{msg.author}</p>}
                            <p className="text-base font-medium leading-snug">{msg.message}</p>
                            <p className={`text-[8px] mt-1 text-right font-bold ${isMe ? "text-blue-100" : "text-gray-400"}`}>{msg.time}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* --- TYPING INDICATOR UI --- */}
                {typingStatus.active && (
                  <div className="flex justify-start mb-6 animate-pulse">
                    <div className="bg-white/50 backdrop-blur-sm px-4 py-2 rounded-2xl rounded-tl-none border border-white/20 shadow-sm">
                       <p className="text-[10px] font-black text-blue-500 uppercase mb-1">{typingStatus.user}</p>
                       <div className="flex gap-1 items-center">
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></span>
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                       </div>
                    </div>
                  </div>
                )}
                
                <div ref={lastMessageRef} />
              </>
            )}
          </div>

          {/* INPUT BAR */}
          <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`text-xl transition-all ${showEmojiPicker ? "scale-125" : "grayscale hover:grayscale-0"}`}>😊</button>

            <input
              type="text"
              className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none text-base font-medium focus:border-blue-500 transition-all"
              placeholder="Type message..."
              value={currentMessage}
              onChange={handleInputChange} // Updated to track typing
              onKeyUp={(e) => e.key === "Enter" && sendMessage()}
              onFocus={() => {
                setShowEmojiPicker(false);
                setShowSidebar(false);
              }}
            />

            <button onClick={sendMessage} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 font-black text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20">SEND</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;