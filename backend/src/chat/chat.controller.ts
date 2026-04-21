import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatGateway } from './chat.gateway';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('conversations')
  createConversation(@Req() req: any, @Body() body: CreateConversationDto) {
    return this.chatService.createOrGetConversation(req.user.userId, body);
  }

  @Get('conversations')
  listConversations(@Req() req: any) {
    return this.chatService.listConversations(req.user.userId);
  }

  @Get('conversations/unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.chatService.getUnreadCount(req.user.userId);
    return { count };
  }

  @Get('conversations/:conversationId/messages')
  listMessages(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ) {
    return this.chatService.listMessages(conversationId, req.user.userId);
  }

  @Post('conversations/:conversationId/messages')
  async sendMessage(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Body() body: SendMessageDto,
  ) {
    const message = await this.chatService.sendMessage(
      conversationId,
      req.user.userId,
      body,
    );
    await this.chatGateway.emitNewMessage(conversationId, message);
    return message;
  }

  @Post('conversations/:conversationId/read')
  async markRead(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ) {
    const readState = await this.chatService.markConversationRead(
      conversationId,
      req.user.userId,
    );
    this.chatGateway.emitConversationRead(conversationId, {
      ...readState,
      readerId: req.user.userId,
    });
    return readState;
  }

  @Post('conversations/:conversationId/offers/:offerMessageId/respond')
  async respondToOffer(
    @Req() req: any,
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('offerMessageId', ParseIntPipe) offerMessageId: number,
    @Body() body: { accepted?: boolean },
  ) {
    const result = await this.chatService.respondToOffer(
      conversationId,
      req.user.userId,
      offerMessageId,
      Boolean(body.accepted),
    );
    this.chatGateway.emitOfferUpdated(conversationId, result.offer);
    await this.chatGateway.emitNewMessage(conversationId, result.message);
    return result;
  }
}
