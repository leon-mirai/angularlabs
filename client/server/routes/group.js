const userService = require("../services/userService");
const channelService = require("../services/channelService");
const groupService = require("../services/groupService");

const route = (app) => {
  // get every single group that exists
  app.get("/api/groups", (req, res) => {
    const groups = groupService.readGroups(); //read all groups
    res.status(200).json(groups);
  });

  // get all groups for the specific user
  app.get("/api/groups", (req, res) => {
    const userId = req.query.userId; // Get the userId from the query parameter
    const groups = groupService.readGroups(); // Read all groups
    const userGroups = groups.filter((group) => group.members.includes(userId)); // Filter groups by membership
    res.status(200).json(userGroups); // Return the filtered groups
  });

  // get a group by ID
  app.get("/api/groups/:groupId", (req, res) => {
    const { groupId } = req.params;
    const groups = groupService.readGroups();
    const group = groups.find((group) => group.id === groupId);

    if (group) {
      res.status(200).json(group);
    } else {
      res.status(404).json({ message: "Group not found" });
    }
  });

  // create a new group
  app.post("/api/groups", (req, res) => {
    const newGroup = req.body;
    const groups = groupService.readGroups();

    // add the new group and save to file
    groups.push(newGroup);
    groupService.writeGroups(groups);

    res.status(201).json(newGroup);
  });

  // update a group by ID
  app.put("/api/groups/:groupId", (req, res) => {
    const { groupId } = req.params;
    const updatedGroup = req.body;
    const groups = groupService.readGroups();
    const groupIndex = groups.findIndex((group) => group.id === groupId);

    if (groupIndex !== -1) {
      groups[groupIndex] = updatedGroup;
      groupService.writeGroups(groups);
      res.status(200).json(updatedGroup);
    } else {
      res.status(404).json({ message: "Group not found" });
    }
  });

  // delete a group by ID
  app.delete("/api/groups/:groupId", (req, res) => {
    try {
      const { groupId } = req.params;
      let groups = groupService.readGroups();

      // check if the group exists
      const groupExists = groups.some((group) => group.id === groupId);

      if (!groupExists) {
        return res.status(404).json({ message: "Group not found" });
      }

      // 1. delete all channels associated with this group
      let channels = channelService.readChannels();
      channels = channels.filter((channel) => channel.groupId !== groupId);
      channelService.writeChannels(channels);

      // 2. remove the group reference from all users
      let users = userService.readUsers();
      users = users.map((user) => {
        // remove the group reference from the user's groups
        user.groups = user.groups.filter(
          (groupIdInUser) => groupIdInUser !== groupId
        );
        return user;
      });
      userService.writeUsers(users);

      // 3. delete the group from the groups array
      groups = groups.filter((group) => group.id !== groupId);
      groupService.writeGroups(groups);

      res.status(200).json({ message: "Group deleted successfully" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to delete group", error: error.message });
    }
  });

  // add a member to a group
  app.post("/api/groups/:groupId/members", (req, res) => {
    const { groupId } = req.params;
    const { userId } = req.body;
    const groups = groupService.readGroups();
    const group = groups.find((group) => group.id === groupId);

    if (group) {
      if (!group.members.includes(userId)) {
        group.members.push(userId);
        groupService.writeGroups(groups);
        res.status(200).json({ message: "Member added successfully" });
      } else {
        res
          .status(400)
          .json({ message: "User is already a member of the group" });
      }
    } else {
      res.status(404).json({ message: "Group not found" });
    }
  });

  // remove a member from a group
  app.delete("/api/groups/:groupId/members/:userId", (req, res) => {
    const { groupId, userId } = req.params;
    const groups = groupService.readGroups();
    const group = groups.find((group) => group.id === groupId);

    if (group) {
      group.members = group.members.filter((member) => member !== userId);
      groupService.writeGroups(groups);
      res.status(200).json({ message: "Member removed successfully" });
    } else {
      res.status(404).json({ message: "Group not found" });
    }
  });

  // add an admin to a group and update the user's role
  app.post("/api/groups/:groupId/admins", (req, res) => {
    try {
      const { groupId } = req.params;
      const { userId } = req.body;

      // read all groups
      const groups = groupService.readGroups();
      const group = groups.find((group) => group.id === groupId);

      //read all users to check if the user exists
      let users = userService.readUsers();
      const user = users.find((user) => user.id === userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      if (group.admins.includes(userId)) {
        return res
          .status(400)
          .json({ message: "User is already an admin of the group" });
      }

      // add user to the admins array
      group.admins.push(userId);

      // update the user's roles to include "GroupAdmin" if not already present
      if (!user.roles.includes("GroupAdmin")) {
        user.roles.push("GroupAdmin");
      }

      // persist the changes to the groups and users
      groupService.writeGroups(groups);
      userService.writeUsers(users);

      res.status(200).json({
        message:
          "Admin added successfully and user promoted to GroupAdmin role",
      });
    } catch (error) {
      console.error("Error adding admin:", error);
      res
        .status(500)
        .json({ message: "An error occurred while adding the admin" });
    }
  });

  // remove an admin from a group
  app.delete("/api/groups/:groupId/admins/:userId", (req, res) => {
    const { groupId, userId } = req.params;
    const groups = groupService.readGroups();
    const group = groups.find((group) => group.id === groupId);

    if (group) {
      group.admins = group.admins.filter((admin) => admin !== userId);
      groupService.writeGroups(groups);
      res.status(200).json({ message: "Admin removed successfully" });
    } else {
      res.status(404).json({ message: "Group not found" });
    }
  });

  // check if a user is a member of a group
  app.get("/api/groups/:groupId/members/:userId", (req, res) => {
    const { groupId, userId } = req.params;
    const groups = groupService.readGroups();
    const group = groups.find((group) => group.id === groupId);

    if (group) {
      const isMember = group.members.includes(userId);
      res.status(200).json({ isMember });
    } else {
      res.status(404).json({ message: "Group not found" });
    }
  });

  // check if a user is an admin of a group
  app.get("/api/groups/:groupId/admins/:userId", (req, res) => {
    const { groupId, userId } = req.params;
    const groups = groupService.readGroups();
    const group = groups.find((group) => group.id === groupId);

    if (group) {
      const isAdmin = group.admins.includes(userId);
      res.status(200).json({ isAdmin });
    } else {
      res.status(404).json({ message: "Group not found" });
    }
  });

  // request to join
  app.post("/api/groups/:groupId/request-join", (req, res) => {
    const { groupId } = req.params;
    const { userId } = req.body;
    const groups = groupService.readGroups();
    const group = groups.find((group) => group.id === groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if the user is already a member
    if (group.members.includes(userId)) {
      return res
        .status(400)
        .json({ message: "User is already a member of the group" });
    }

    // Check if the user has already requested to join
    if (group.joinRequests.includes(userId)) {
      return res
        .status(400)
        .json({ message: "User has already requested to join the group" });
    }

    // Add user to join requests
    group.joinRequests.push(userId);
    groupService.writeGroups(groups);

    res.status(200).json({ message: "Join request sent successfully" });
  });

  // Approve a join request
  app.post("/api/groups/:groupId/approve-join", (req, res) => {
    const { groupId } = req.params;
    const { userId } = req.body;
    const groups = groupService.readGroups();
    const group = groups.find((group) => group.id === groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if the user is in join requests
    if (!group.joinRequests.includes(userId)) {
      return res
        .status(400)
        .json({ message: "User did not request to join the group" });
    }

    // Add user to members and remove from join requests
    group.members.push(userId);
    group.joinRequests = group.joinRequests.filter((id) => id !== userId);
    groupService.writeGroups(groups);

    res.status(200).json({ message: "User approved to join the group" });
  });

  // Reject a join request
  app.post("/api/groups/:groupId/reject-join", (req, res) => {
    const { groupId } = req.params;
    const { userId } = req.body;
    const groups = groupService.readGroups();
    const group = groups.find((group) => group.id === groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if the user is in join requests
    if (!group.joinRequests.includes(userId)) {
      return res
        .status(400)
        .json({ message: "User did not request to join the group" });
    }

    // Remove user from join requests
    group.joinRequests = group.joinRequests.filter((id) => id !== userId);
    groupService.writeGroups(groups);

    res.status(200).json({ message: "User's join request rejected" });
  });
};

module.exports = { route };
