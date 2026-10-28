import { authenticatedFetch } from "../api/client";
import { API_BASE } from "../api/endpoints";
import React, { useEffect, useState, useCallback } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/dashboard/Navbar";
import Sidebar from "../components/dashboard/Sidebar";
import { useAuth } from "../contexts/authcontext/Authcontext";
import { db } from "../firebase/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";

const Chat = () => {
  const { currentUser, userLoggedIn } = useAuth();
  const navigate = useNavigate();
  const { otherUserId } = useParams();

  const [conversationId, setConversationId] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(
    async (uid) => {
      if(uid===currentUser?.uid){
        const snapshot=await getDoc(doc(db,'users',uid)),data=snapshot.data() || {};
        return {userType:data.userType || 'farmer',displayName:[data.firstName,data.lastName].filter(Boolean).join(' ') || 'User'};
      }
      return (await authenticatedFetch(`${API_BASE}/api/public-profile/${encodeURIComponent(uid)}`)).json();
    },
    [currentUser?.uid]
  );

  useEffect(() => {
    if (!currentUser || !otherUserId) return;

    let unsubscribeMessages = null;

    const initConversation = async () => {
      setLoading(true);
      try {
        const otherProfile = await loadUserProfile(otherUserId);
        setOtherUser(otherProfile);

        const currentProfile = await loadUserProfile(currentUser.uid);

        const ids = [currentUser.uid, otherUserId].sort();
        const convId = ids.join("_");
        const convRef = doc(db, "conversations", convId);
        const convSnap = await getDoc(convRef);

        if (!convSnap.exists()) {
          await setDoc(convRef, {
            participants: ids,
            participantNames: {
              [currentUser.uid]: currentProfile.displayName,
              [otherUserId]: otherProfile.displayName,
            },
            participantRoles: {
              [currentUser.uid]: currentProfile.userType,
              [otherUserId]: otherProfile.userType,
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastMessageText: "",
            lastMessageSenderId: "",
            lastMessageSenderName: "",
            unreadFor: [],
          });
        }

        setConversationId(convId);

        const messagesCol = collection(convRef, "messages");
        const q = query(messagesCol, orderBy("createdAt", "asc"));
        unsubscribeMessages = onSnapshot(q, (snapshot) => {
          const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setMessages(list);
        });

        await updateDoc(convRef, {
          unreadFor: arrayRemove(currentUser.uid),
        });
      } catch (error) {
        console.error("Error initializing chat:", error);
      } finally {
        setLoading(false);
      }
    };

    initConversation();

    return () => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
    };
  }, [currentUser, otherUserId, loadUserProfile]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !currentUser) return;

    const text = newMessage.trim();
    setNewMessage("");

    try {
      const convRef = doc(db, "conversations", conversationId);
      const messagesCol = collection(convRef, "messages");
      const senderProfile = await loadUserProfile(currentUser.uid);

      await addDoc(messagesCol, {
        text,
        senderId: currentUser.uid,
        senderName: senderProfile.displayName,
        createdAt: serverTimestamp(),
      });

      const recipients = [otherUserId];

      await updateDoc(convRef, {
        lastMessageText: text,
        lastMessageSenderId: currentUser.uid,
        lastMessageSenderName: senderProfile.displayName,
        updatedAt: serverTimestamp(),
        unreadFor: recipients,
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (!userLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100">
      <Navbar currentUser={currentUser} />
      <Sidebar />

      <div className="pt-20 lg:ml-64 px-4 lg:px-8 pb-8">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-[70vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div>
              <p className="text-sm text-gray-500">Chat with</p>
              <h1 className="text-lg font-semibold text-gray-900">
                {otherUser?.displayName || "User"}
              </h1>
            </div>
            <button
              onClick={handleBack}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-100"
            >
              Back
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500">No messages yet. Start the conversation.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.senderId === currentUser.uid;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        isOwn
                          ? "bg-green-600 text-white rounded-br-none"
                          : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-[11px] text-gray-500 mb-0.5">
                          {msg.senderName || "Farmer"}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSend} className="border-t border-gray-200 px-4 py-3 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
