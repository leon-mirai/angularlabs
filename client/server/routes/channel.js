const { ObjectId } = require("mongodb");
const channelService = require("../services/channelService");
const groupService = require("../services/groupService");

const route = (app, db) => {
  // get all channels
  app.get("/api/channels", async (req, res) => {
    try {
      const channels = await channelService.readChannels(db);
      res.status(200).json(channels);
    } catch (error) {
      console.error("Failed to retrieve channels:", error);
      res.status(500).json({ message: "Failed to retrieve channels", error });
    }
  });

  // get channels by group ID (use ObjectId for groupId)
  app.get("/api/channels/group/:groupId", async (req, res) => {
    try {
      const groupId = new ObjectId(req.params.groupId.trim());
      const channels = await channelService.getChannelsByGroupId(db, groupId);
      res.status(200).json(channels);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to retrieve channels by group ID", error });
    }
  });

  // get a channel by ID (use ObjectId for channelId)
  app.get("/api/channels/:channelId", async (req, res) => {
    try {
      const channelId = new ObjectId(req.params.channelId.trim());
      const channel = await channelService.getChannelById(db, channelId);

      if (channel) {
        res.status(200).json(channel);
      } else {
        res.status(404).json({ message: "Channel not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve channel", error });
    }
  });

  // create a new channel
  app.post("/api/channels", async (req, res) => {
    try {
      const newChannel = {
        ...req.body,
        groupId: new ObjectId(req.body.groupId), // Ensure groupId is an ObjectId
        members: req.body.members.map((member) => new ObjectId(member)), // Ensure members are ObjectIds
      };

      const createdChannel = await channelService.createChannel(db, newChannel);

      // update the corresponding group by adding the new channel's ID
      const group = await groupService.addChannelToGroup(
        db,
        new ObjectId(newChannel.groupId),
        createdChannel._id
      );

      if (group) {
        res.status(201).json(createdChannel);
      } else {
        res.status(404).json({ message: "Group not found" });
      }
    } catch (error) {
      console.error("Failed to create channel:", error);
      res.status(500).json({ message: "Failed to create channel", error });
    }
  });

  // Update a channel by ID (use ObjectId for channelId)
  app.put("/api/channels/:channelId", async (req, res) => {
    try {
      const channelId = new ObjectId(req.params.channelId.trim());
      const updatedChannelData = { ...req.body };

      // Ensure groupId and members are stored as ObjectId
      if (updatedChannelData.groupId) {
        updatedChannelData.groupId = new ObjectId(updatedChannelData.groupId);
      }

      if (updatedChannelData.members) {
        updatedChannelData.members = updatedChannelData.members.map(
          (memberId) => new ObjectId(memberId)
        );
      }

      const updatedChannel = await channelService.updateChannelById(
        db,
        channelId,
        updatedChannelData
      );

      if (updatedChannel) {
        res
          .status(200)
          .json({ message: "Channel updated successfully", updatedChannel });
      } else {
        res.status(404).json({ message: "Channel not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update channel", error });
    }
  });

  // Delete a channel by ID (use ObjectId for channelId)
  app.delete("/api/channels/:channelId", async (req, res) => {
    try {
      const channelId = new ObjectId(req.params.channelId.trim());

      // Find the channel first to get the groupId
      const channel = await channelService.getChannelById(db, channelId);

      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      // Proceed to delete the channel
      const deletedChannel = await channelService.deleteChannelById(
        db,
        channelId
      );

      if (deletedChannel.deletedCount > 0) {
        // After deleting the channel, remove the channel ID from the corresponding group's channels array
        await groupService.removeChannelFromGroup(
          db,
          new ObjectId(channel.groupId),
          channelId
        );

        res.status(200).json({ message: "Channel deleted successfully" });
      } else {
        res.status(404).json({ message: "Channel not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete channel", error });
    }
  });

  // user requests to join a channel (use ObjectId for channelId and userId)
  app.post("/api/channels/:channelId/request-join", async (req, res) => {
    try {
      const channelId = new ObjectId(req.params.channelId.trim());
      const { userId } = req.body;

      // Validate the userId
      if (!ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid userId" });
      }

      console.log(`Request to join channel: ${channelId}, by user: ${userId}`);

      // Fetch the channel by channelId
      const channel = await channelService.getChannelById(db, channelId);

      if (!channel) {
        console.error("Channel not found:", channelId);
        return res.status(404).json({ message: "Channel not found" });
      }

      // Check if the user is already a member of the channel
      if (
        channel.members.some((member) => member.equals(new ObjectId(userId)))
      ) {
        return res
          .status(400)
          .json({ message: "User is already a member of the channel" });
      }

      // Check if the user has already requested to join the channel
      if (
        channel.joinRequests.some((request) =>
          request.equals(new ObjectId(userId))
        )
      ) {
        return res
          .status(400)
          .json({ message: "User has already requested to join the channel" });
      }

      // Proceed with adding the user to the joinRequests array
      channel.joinRequests.push(new ObjectId(userId));

      // Log the channel object before saving to database for debugging
      console.log("Updated channel object with join request:", channel);

      await channelService.updateChannel(db, channelId, channel);

      res.status(200).json({ message: "Join request sent successfully" });
    } catch (error) {
      console.error("Failed to request to join the channel:", error);
      res
        .status(500)
        .json({ message: "Failed to request to join the channel", error });
    }
  });

  // admin approves or rejects a join request (use ObjectId for channelId and userId)
  app.post("/api/channels/:channelId/approve-join", async (req, res) => {
    const { channelId } = req.params;
    const { userId, approve } = req.body;

    try {
      const result = await channelService.approveJoinRequest(
        db,
        new ObjectId(channelId.trim()),
        new ObjectId(userId),
        approve
      );

      res
        .status(200)
        .json({ message: approve ? "User approved" : "Join request rejected" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to process join request", error });
    }
  });

  // remove a user from a channel (use ObjectId for channelId and userId)
  app.delete("/api/channels/:channelId/members/:userId", async (req, res) => {
    try {
      const channelId = new ObjectId(req.params.channelId.trim());
      const userId = new ObjectId(req.params.userId.trim());
      const response = await channelService.removeUserFromChannel(
        db,
        channelId,
        userId
      );

      res.status(200).json(response);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to remove user from channel", error });
    }
  });

  // ban a user from a channel (use ObjectId for channelId and userId)
  app.post("/api/channels/:channelId/ban", async (req, res) => {
    const { channelId } = req.params;
    const { userId } = req.body;

    try {
      const result = await channelService.banUserFromChannel(
        db,
        new ObjectId(channelId.trim()),
        new ObjectId(userId)
      );

      if (result.success) {
        res.status(200).json({ message: "User banned successfully" });
      } else {
        res.status(400).json({ message: "User is already banned" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to ban user", error });
    }
  });

  // check if a user is a member of a channel (use ObjectId for channelId and userId)
  app.get("/api/channels/:channelId/members/:userId", async (req, res) => {
    try {
      const channelId = new ObjectId(req.params.channelId.trim());
      const userId = new ObjectId(req.params.userId.trim());
      const isMember = await channelService.isUserInChannel(
        db,
        channelId,
        userId
      );

      res.status(200).json({ isMember });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to check if user is in channel", error });
    }
  });

  // Leave channel
  app.post("/api/channels/:channelId/leave", async (req, res) => {
    const { channelId } = req.params;
    const { userId } = req.body; // Assume userId is passed in the body

    try {
      const result = await channelService.leaveChannel(db, channelId, userId);

      if (result.modifiedCount > 0) {
        res.status(200).json({ message: "User left the channel successfully" });
      } else {
        res
          .status(404)
          .json({ message: "Channel not found or user not a member" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to leave the channel", error });
    }
  });

  // Get chat history for a specific channel
  app.get('/api/channels/:channelId/messages', async (req, res) => {
    const { channelId } = req.params;
    try {
      const messages = await channelService.getChatHistory(db, channelId);
      res.status(200).json(messages);
    } catch (err) {
      console.error('Error fetching chat history:', err);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });

  // Add a new message to the channel
  app.post("/api/channels/:channelId/messages", async (req, res) => {
    try {
      const channelId = req.params.channelId;
      const { sender, content, messageType = "text" } = req.body;

      // Create message object
      const message = {
        sender,
        content,
        timestamp: new Date(),
        messageType,
      };

      const result = await channelService.addMessageToChannel(
        db,
        channelId,
        message
      );
      res.status(200).json({ message: "Message added successfully", result });
    } catch (error) {
      res.status(500).json({ message: "Failed to add message", error });
    }
  });
};

module.exports = { route };
