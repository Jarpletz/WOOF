package petadoption.api.chat;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import petadoption.api.annotation.GlobalCrossOrigin;
import petadoption.api.chat.responseObjects.ChatInfoResponse;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/chats")
@GlobalCrossOrigin
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private MessageService messageService;

    @Autowired
    private SimpMessagingTemplate simpMessagingTemplate;

    // Saves a message sent to /app/chat/{chatID} and sends it to topic/messages/{chatID}
    @MessageMapping("/chat/{chatID}")
    public void sendMessage(@Payload Message message, @DestinationVariable Long chatID) {
        Message savedMessage = messageService.saveMessage(message, chatID);
        chatService.updateChatTimestamp(message);

        simpMessagingTemplate.convertAndSend("/topic/messages/" + chatID, savedMessage);
    }

    @GetMapping("/{chatId}")
    public Chat getChatById(@PathVariable Long chatId) {
        return chatService.getChatByID(chatId).orElse(null);
    }

    // Gets a chat between two users based on their ids
    @GetMapping("/byUsers")
    public ResponseEntity<Chat> getChatByUserIDs(@RequestParam Long userID1, @RequestParam Long userID2) {
        var chat = chatService.getChatByUserIDs(userID1, userID2);
        return chat.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/byUser")
    public List<Chat> getChatsByUserID(@RequestParam Long userID) {
        return chatService.getChatsByUserID(userID);
    }

    // Gets a list of messages by the chatID ordered chronologically
    @GetMapping("/byChatID")
    public List<Message> getMessagesByChatID(@RequestParam Long chatID,
                                             @RequestParam(required = false) Optional<Integer> pageSize,
                                             @RequestParam(required = false) Optional<Integer> pageNumber) {
        if (pageSize.isPresent() && pageNumber.isPresent()) {
            Pageable pageable = PageRequest.of(pageNumber.get(), pageSize.get());
            return messageService.getByChatID(chatID, Optional.of(pageable));
        } else {
            return messageService.getByChatID(chatID, Optional.empty());
        }
    }

    @GetMapping("/unreadCount")
    public Integer getUnreadMessageCount(@RequestParam("userID") Long userID) {
        return messageService.getUnreadMessageCount(userID);
    }

    // Gets a list of chat infos for a user id, with optional pagination
    @GetMapping("/chatInfoByUser")
    public List<ChatInfoResponse> getChatInfoByUserID(@RequestParam Long userID,
                                                      @RequestParam(required = false) Optional<Integer> pageSize,
                                                      @RequestParam(required = false) Optional<Integer> pageNumber) {
        if (pageSize.isPresent() && pageNumber.isPresent()) {
            Pageable pageable = PageRequest.of(pageNumber.get(), pageSize.get());
            return chatService.getChatInfoByUserID(userID, Optional.of(pageable));
        } else {
            return chatService.getChatInfoByUserID(userID, Optional.empty());
        }
    }

    // Creates a chat between two users. If the chat already exists, it just returns the existing chat
    @PostMapping("/getOrCreate")
    public Chat getOrCreateChat(@RequestParam Long senderID, @RequestParam Long receiverID) {
        return chatService.createChat(senderID, receiverID);
    }

    @PutMapping("/messageReadStatus")
    public ResponseEntity<Map<String, Object>> updateMessageStatus(@RequestParam Long messageID, @RequestParam Boolean status) {
        Optional<Message> msg = messageService.updateMessageStatus(messageID, status);
        Map<String, Object> response = new HashMap<>();
        if (msg.isPresent()) {
            response.put("message", msg);
            return ResponseEntity.ok(response);
        } else {
            response.put("message", "Update failed");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

}
