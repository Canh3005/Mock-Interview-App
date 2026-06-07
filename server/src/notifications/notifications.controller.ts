import {
  Controller,
  Get,
  Param,
  Patch,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import Redis from 'ioredis';
import { Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtAuthRequest } from '../auth/types/auth-request.types';
import { NotificationsService } from './notifications.service';
import { REDIS_CLIENT } from '../redis/redis.module';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get('stream')
  @ApiOperation({ summary: 'SSE stream for real-time notifications' })
  async stream(@Req() req: JwtAuthRequest, @Res() res: Response) {
    const userId = req.user.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(`notify:${userId}`);

    subscriber.on('message', (_channel, message) => {
      res.write(`data: ${message}\n\n`);
    });

    // keepalive ping every 25s
    const ping = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    res.on('close', () => {
      clearInterval(ping);
      void subscriber.unsubscribe(`notify:${userId}`);
      void subscriber.quit();
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get unread notifications' })
  getUnread(@Req() req: JwtAuthRequest) {
    return this.notificationsService.getUnread(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id') id: string, @Req() req: JwtAuthRequest) {
    return this.notificationsService.markRead(id, req.user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@Req() req: JwtAuthRequest) {
    return this.notificationsService.markAllRead(req.user.id);
  }
}
