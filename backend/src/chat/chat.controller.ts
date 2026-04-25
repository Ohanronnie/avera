import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CurrentUser } from 'src/auth/current-user.decorator';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  async createConversation(
    @CurrentUser('userId') userId: number,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    const conversation = await this.chatService.createConversation(
      userId,
      createConversationDto.productId,
    );
    return conversation;
  }

  @Get('conversations/order-review/:conversationId')
  async getReviewOrderDetails(
    @CurrentUser('userId') userId: number,
    @Param('conversationId', ParseIntPipe) conversationId: number,
  ) {
    return await this.chatService.getReviewOrderDetails(userId, conversationId);
  }

  @Get('conversations/unread-count')
  async getUnreadConversationCount(@CurrentUser('userId') userId: number) {
    return {
      count: await this.chatService.getUnreadConversationCount(userId),
    };
  }
}
