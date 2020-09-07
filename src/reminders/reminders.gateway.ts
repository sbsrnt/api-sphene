/*
import { Inject, Logger } from "@nestjs/common";
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer, WsResponse
} from "@nestjs/websockets";
import { Server, Socket  } from 'socket.io';

import { UserService } from "../user/user.service";
import { Reminder } from "./reminders.entity";
import { RemindersService } from "./reminders.service";


const options = {
  namespace: 'reminders',
  transports: ['websocket']
};

@WebSocketGateway(81, options)
export class RemindersGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {

  @Inject()
  private remindersService: RemindersService;
  private userService: UserService;

  @WebSocketServer()
  private wss: Server;

  private logger: Logger = new Logger(RemindersGateway.name);

  afterInit(server: any): any {
    this.logger.log('RemindersGateway Initialized');
    this.handleConnection(this.wss);
  }

  handleConnection(client: Socket, ...args): void {
    this.logger.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: any): any {
    this.logger.log(`Client disconnected: ${client.id}`)
  }


  @SubscribeMessage('reminders')
  handleClientEvent(@MessageBody() { _id }: Reminder): WsResponse<unknown> {
    this.remindersService.updateReminderNextOccurrence({email: 'test@test.test'}, _id);
    return undefined;
  }
}
*/
