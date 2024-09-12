import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GroupService } from '../../services/group.service';
import { ChannelService } from '../../services/channel.service';
import { Group } from '../../models/group.model';
import { Channel } from '../../models/channel.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { CreateChannel } from '../../models/create-channel.model';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.css'],
})
export class GroupsComponent implements OnInit {
  group: Group | undefined;
  channels: Channel[] = [];
  newMemberId: string = '';
  newChannelName: string = '';
  userId: string | null = null;
  userCache: { [key: string]: string } = {};

  constructor(
    private route: ActivatedRoute,
    private groupService: GroupService,
    private channelService: ChannelService,
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser(); // Get user from AuthService
    console.log('Retrieved user in GroupsComponent:', user); // Log the user object

    if (user && user._id) {
      this.userId = user._id; // Assign user._id to userId
    } else {
      console.error('User data is missing or invalid.');
      return; // Stop further execution if user data is invalid
    }

    const groupId = this.route.snapshot.params['id']; // Get groupId from route
    if (groupId) {
      this.groupService.getGroupById(groupId).subscribe({
        next: (group: Group) => {
          this.group = group;
          this.fetchChannels(groupId); // Fetch the channels after getting the group
        },
        error: (err: any) => {
          console.error('Error fetching group:', err.message);
        },
      });
    }
  }
  fetchChannels(groupId: string): void {
    this.channelService.getChannelsByGroupId(groupId).subscribe({
      next: (channels: Channel[]) => {
        this.channels = channels;
      },
      error: (err: any) => {
        console.error('Error fetching channels:', err.message);
      },
    });
  }

  getUserName(memberId: string): string {
    // If the username is already cached, return it
    if (this.userCache[memberId]) {
      return this.userCache[memberId];
    }

    // Fetch the user from the user service if not cached
    this.userService.getUserById(memberId).subscribe({
      next: (user) => {
        if (user) {
          this.userCache[memberId] = user.username; // Cache the username
        }
      },
      error: (err: any) => {
        console.error('Error fetching user:', err.message);
      },
    });

    // Return memberId as a fallback while fetching the name
    return memberId;
  }

  removeMember(memberId: string): void {
    if (!this.group) {
      console.error('Group is undefined');
      return;
    }

    const groupId = this.group._id; // Store the groupId locally

    this.groupService.removeUserFromGroup(groupId, memberId).subscribe({
      next: () => {
        // Remove the member locally from the group's member list
        this.group!.members = this.group!.members.filter(
          (member) => member !== memberId
        );
        this.fetchChannels(groupId); // Refresh channels
      },
      error: (err: any) => {
        console.error('Error removing member:', err.message);
      },
    });
  }

  hasJoinRequests(): boolean {
    return !!(
      this.group &&
      this.group.joinRequests &&
      this.group.joinRequests.length > 0
    );
  }

  addMember(): void {
    if (this.group && this.isGroupAdmin(this.group)) {
      const userId = this.newMemberId.trim();
      if (!userId) return;

      // Check if the user exists before adding
      this.userService.getUserById(userId).subscribe({
        next: (user) => {
          if (user) {
            // Proceed with adding the member
            this.groupService.addMember(this.group!._id, userId).subscribe({
              next: () => {
                this.group?.members.push(userId); // Add member to local group list
                console.log('Member added successfully');
                this.newMemberId = '';
              },
              error: (err: any) => {
                console.error('Error adding member:', err.message);
              },
            });
          } else {
            console.error('User does not exist');
            alert('User does not exist');
          }
        },
        error: (err: any) => {
          console.error('Error checking user existence:', err.message);
          alert('Error checking user existence');
        },
      });
    } else {
      console.error('Group does not exist or user lacks permission.');
    }
  }

  createChannel(): void {
    if (this.newChannelName.trim() && this.group && this.userId) {
      const newChannel = new CreateChannel(
        this.newChannelName, // Channel name
        this.group._id, // Group ID
        [this.userId], // Initial members (the current user who creates the channel)
        [], // Channels (empty since it's a new channel)
        [], // Join Requests (empty initially)
        [] // Blacklist (empty initially)
      );

      this.channelService.addChannel(newChannel).subscribe({
        next: (createdChannel) => {
          this.channels.push(createdChannel); // Add the new channel to the list
          this.newChannelName = ''; // Clear the input field
        },
        error: (err: any) => {
          console.error('Error creating channel:', err.message);
        },
      });
    }
  }

  approveRequest(userId: string): void {
    if (this.group && this.isGroupAdmin(this.group)) {
      this.groupService.approveRequest(this.group._id, userId).subscribe({
        next: () => {
          console.log(`User ${userId} approved to join the group.`);
          this.group!.joinRequests = this.group!.joinRequests.filter(
            (id) => id !== userId
          );
        },
        error: (err: any) => {
          console.error('Error approving join request:', err.message);
        },
      });
    }
  }

  rejectRequest(userId: string): void {
    if (this.group && this.isGroupAdmin(this.group)) {
      this.groupService.rejectRequest(this.group._id, userId).subscribe({
        next: () => {
          console.log(`User ${userId}'s request rejected.`);
          this.group!.joinRequests = this.group!.joinRequests.filter(
            (id) => id !== userId
          );
        },
        error: (err: any) => {
          console.error('Error rejecting join request:', err.message);
        },
      });
    }
  }

  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  isGroupAdmin(group: Group | undefined): boolean {
    if (!group || !this.userId) {
      return false;
    }
    return group.admins.includes(this.userId) || this.isSuperAdmin();
  }

  isChatUser(): boolean {
    return this.authService.isChatUser();
  }
}
