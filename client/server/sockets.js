const { ObjectId } = require('mongodb');
const channelService = require("./services/channelService.js");

function setupSocket(io, db) {
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // handle incoming messages
    socket.on('message', async (message) => {
      console.log('Received message:', message);

      try {
        // add the message to the channel in the database
        await channelService.addMessageToChannel(db, message.channelId, {
          sender: new ObjectId(message.senderId),
          content: message.content,
        });

        //emit the message to all clients in the channel
        io.emit('message', {
          sender: message.senderName,
          content: message.content,
        });
      } catch (err) {
        console.error('Error adding message to channel:', err);
      }
    });

    // emit a notification when a user is approved to join the channel
    socket.on('approve-join-request', async ({ channelId, userId, userName, approve }) => {
      try {
        if (approve) {
          console.log(`User ${userName} approved to join channel ${channelId}`);

          // emit 'user-joined' event to all users in the channel
          io.emit('user-joined', { userId, userName, channelId });
        }
      } catch (err) {
        console.error('Error handling join request approval:', err);
      }
    });

    //emit a notification when a user is removed from the channel
    socket.on('remove-user', async ({ channelId, userId, userName }) => {
      try {
        console.log(`User ${userName} removed from channel ${channelId}`);

        //emit 'user-removed' event to all users in the channel
        io.emit('user-removed', { userId, userName, channelId });
      } catch (err) {
        console.error('Error handling user removal:', err);
      }
    });

    //handle user disconnecting (leaving channel)
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}

module.exports = { setupSocket };
