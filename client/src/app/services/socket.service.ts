import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { ChatMessage, OutgoingMessage } from '../models/chat-message.model'; 

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io();
  }

  // send a message to the server
  sendMessage(message: OutgoingMessage): void {
    this.socket.emit('message', message);
  }

  // receive messages from the server
  getMessages(): Observable<ChatMessage> {
    return new Observable<ChatMessage>((observer) => {
      this.socket.on('message', (message: ChatMessage) => {
        observer.next(message);
      });
    });
  }

  // listen for 'user-joined' event when someone is approved to join the channel
  onUserJoined(): Observable<{
    userId: string;
    userName: string;
    channelId: string;
  }> {
    return new Observable((observer) => {
      this.socket.on('user-joined', (data) => {
        observer.next(data);
      });
    });
  }

  // emit 'approve-join-request' event when admin approves join request
  approveJoinRequest(
    channelId: string,
    userId: string,
    userName: string,
    approve: boolean
  ): void {
    this.socket.emit('approve-join-request', {
      channelId,
      userId,
      userName,
      approve,
    });
  }

  // emit 'leave-channel' event to the server
  leaveChannel(channelId: string, userId: string, userName: string): void {
    this.socket.emit('leave-channel', { channelId, userId, userName });
  }

  // emit 'remove-user' event
  removeUser(channelId: string, userId: string, userName: string): void {
    this.socket.emit('remove-user', { channelId, userId, userName });
  }

  // listen for 'user-removed' event
  onUserRemoved(): Observable<{
    userId: string;
    userName: string;
    channelId: string;
  }> {
    return new Observable((observer) => {
      this.socket.on('user-removed', (data) => {
        observer.next(data);
      });
    });
  }
}
