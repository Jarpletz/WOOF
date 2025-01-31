import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  IconButton,
  TextField,
  Typography,
  Stack,
  Avatar,
} from "@mui/material";
import InfiniteScroll from "react-infinite-scroll-component";
import Stomp from "stompjs";
import SockJS from "sockjs-client";

import ChatMessage from "./ChatMessage";
import { useChat } from "@/utils/contexts/chatContext";
import userService from "@/utils/services/userService";
import chatService from "@/utils/services/chatService";
import { ArrowBack, Send } from "@mui/icons-material";
import ChatLink from "./ChatLink";
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function ChatThread(props) {
  const {
    currentChatId,
    openInbox,
    myMessage,
    setMyMessage,
    msgLink,
    setMsgLink,
  } = useChat();
  const currentUserId = useSelector((state) => state.currentUser.currentUserId);
  const currentUserFullName = useSelector(
    (state) => state.currentUser.currentUserFullName
  );

  const messagesEndRef = useRef(null);

  const {
    sendMessage,
    getChatByChatID,
    getMessagesByChatId,
    updateMessageStatus,
  } = chatService();
  const { getGenericUserInfo } = userService();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [recipient, setRecipient] = useState(null);

  /* This is the same as the messages page, unsure of the best way to refactor.
    It sets the stompClient which is necessary for connecting to the websocket and sending messages */
  const [stompClient, setStompClient] = useState(null);
  const isSubscribed = useRef(false);

  async function getChat() {
    if (currentChatId == null) {
      console.error("Unable to retrieve chat: current chat id is null!");
      return;
    }
    await getChatByChatID(currentChatId)
      .then((result) => {
        if (result != null) {
          setChat(result);
          getRecipient(result);
        } else console.error("Error fetching chat!");
      })
      .catch((error) => {
        console.error("Error fetching chat:", error);
      });
  }

  async function getMessages() {
    if (currentChatId == null) {
      console.error("Unable to retrieve messages: current chat id is null!");
      return;
    }

    //Get the messages already sent in this chat
    await getMessagesByChatId(currentChatId)
      .then((result) => {
        setMessages(result);
      })
      .catch((error) => {
        console.error("Error fetching chats:", error);
      });
  }
  async function getRecipient(currentChat) {
    if (!currentChat) {
      console.error("Unable to retrieve recipient: current chat is null!");
      return;
    }
    let recipientId = 0;

    // if the current user is the first id, the second id is the recipient.
    if (currentChat.userIDFirst == currentUserId) {
      recipientId = currentChat.userIDSecond;
    }
    // if the current user is the second id, the first id is the recipient.
    else if (currentChat.userIDSecond == currentUserId) {
      recipientId = currentChat.userIDFirst;
    }
    //if the current user is neither, they are not authorized to view this chat.
    //boot them to their inbox.
    else {
      openInbox();
    }

    await getGenericUserInfo(recipientId)
      .then((result) => {
        if (result) {
          setRecipient(result);
        } else {
          console.error("Error fetching recipient user!");
        }
      })
      .catch((error) => {
        console.error("Error fetching recipient user:", error);
      });
  }

  async function recieveMessage(newMessage) {
    setMessages((prevMessages) => {
      let newMessages = [newMessage, ...prevMessages];
      return newMessages;
    });
  }

  useEffect(() => {
    if (!currentChatId) {
      openInbox(); //return to the inbox if there is no currentChatID
    }

    const socket = new SockJS(`${apiUrl}/ws`);
    let client = Stomp.over(socket);

    // Disable logging
    client.debug = () => {};

    async function setup() {
      await getChat();
      await getMessages();
    }

    async function establishConnection() {
      client.connect(
        {},
        () => {
          // Check if already subscribed
          if (!isSubscribed.current) {
            client.subscribe(`/topic/messages/${currentChatId}`, (msg) => {
              const newMessage = JSON.parse(msg.body);
              recieveMessage(newMessage);
            });
            isSubscribed.current = true; // Mark as subscribed
          }
        },
        (error) => {
          console.error("WebSocket connection error:", error);
        }
      );

      setStompClient(client);
    }
    setup();
    establishConnection();

    // Cleanup function to disconnect the client
    return () => {
      if (client && client.connected) {
        client.disconnect();
      }
    };
  }, [currentChatId]);

  useEffect(() => {
    messages.forEach((message) => {
      checkMessageStatus(message);
    });
  }, [messages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMyMessage(value);
  };

  const handleSendKeyContact = async (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent the default behavior of adding a newline
      handleMessageSend();
    }
  };
  const handleMessageSend = async () => {
    if (myMessage != "") {
      if (recipient.id == null) return;

      if (msgLink && msgLink == "") {
        setMsgLink(null);
      }
      sendMessage(
        currentChatId,
        currentUserId,
        recipient.id,
        myMessage,
        msgLink,
        stompClient
      );
      setMsgLink(null);
      setMyMessage("");
    }
  };

  const checkMessageStatus = async (message) => {
    if (!message) {
      return;
    }
    if (message.senderID != currentUserId && !message.isRead) {
      const result = await updateMessageStatus(message.messageID, true);
    }
  };

  if (!chat || !recipient) {
    return;
  }

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "70vh",
      }}
    >
      <Stack
        direction="row"
        sx={{
          height: "4rem",
          alignItems: "center",
          backgroundColor: "primary.main",
          pt: "10px",
          pb: "10px",
          borderBottom: "1px solid #D4D4D4",
        }}
      >
        <IconButton sx={{ color: "white" }} onClick={openInbox}>
          <ArrowBack fontSize="large" />
        </IconButton>
        <Avatar
          alt="Remy Sharp"
          src={`${apiUrl}/api/images/users/${recipient.id}/profile`}
          sx={{
            mr: "15px",
          }}
        >
          {recipient.name[0]}
        </Avatar>
        <Typography variant="h6" noWrap sx={{ color: "white" }}>
          {recipient.name}
        </Typography>
      </Stack>

      {/* Display chat messages */}
      <Box
        id="messageDiv"
        sx={{
          flex: 1,
          flexDirection: "column-reverse",
          overflowY: "scroll",
          padding: "10px",
        }}
      >
        <InfiniteScroll
          dataLength={messages.length}
          style={{ display: "flex", flexDirection: "column-reverse" }} //To put endMessage and loader to the top.
          inverse={true} //
          hasMore={false}
          loader={<p>Loading...</p>}
          scrollableTarget="messageDiv"
        >
          {messages.map((message, index) => (
            <Box key={index}>
              {message.link != null && (
                <ChatLink
                  link={message.link}
                  message={message}
                  isSender={message.senderID == currentUserId}
                  senderName={
                    message.senderID == currentUserId
                      ? currentUserFullName
                      : recipient.name
                  }
                />
              )}
              <ChatMessage
                message={message}
                isSender={message.senderID == currentUserId}
                senderName={
                  message.senderID == currentUserId
                    ? currentUserFullName
                    : recipient.name
                }
              />
            </Box>
          ))}
        </InfiniteScroll>
        <div ref={messagesEndRef} />
      </Box>
      <Box
        sx={{
          minHeight: "5rem",
          width: "100%",
          backgroundColor: "#f4f4f4",
          pr: "10px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <TextField
          sx={{
            //width: "80%",
            ml: "20px",
            mt: "10px",
            mb: "10px",
            backgroundColor: "white",
          }}
          fullWidth
          multiline
          maxRows={4}
          onChange={handleChange}
          onKeyDown={handleSendKeyContact}
          value={myMessage}
        ></TextField>
        <IconButton
          sx={{ color: "secondary.main" }}
          onClick={handleMessageSend}
        >
          <Send fontSize="large" />
        </IconButton>
      </Box>
    </Box>
  );
}
