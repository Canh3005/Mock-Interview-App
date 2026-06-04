import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtAuthRequest } from '../auth/types/auth-request.types';
import { PaymentService } from './services/payment.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { MomoWebhookPayload } from './services/momo.service';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('packages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List available credit packages' })
  getPackages() {
    return this.paymentService.getPackages();
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment order' })
  createOrder(
    @Req() req: JwtAuthRequest,
    @Body() dto: CreateOrderDto,
    @Ip() ip: string,
  ): Promise<{ orderId: string; redirectUrl: string }> {
    return this.paymentService.createOrder(req.user.id, dto, ip);
  }

  @Get('orders/:orderId/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order status' })
  getOrderStatus(
    @Req() req: JwtAuthRequest,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentService.getOrderStatus(orderId, req.user.id);
  }

  @Get('process-return')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Process VNPay return URL (called by FE on redirect)',
  })
  processVnpayReturn(@Query() query: Record<string, string>) {
    return this.paymentService.processVnpayReturn(query);
  }

  @Post('webhook/momo')
  @ApiOperation({ summary: 'MoMo IPN webhook (internal)' })
  async momoWebhook(@Body() payload: MomoWebhookPayload) {
    await this.paymentService.handleMomoWebhook(payload);
    return { resultCode: 0, message: 'success' };
  }

  @Get('webhook/vnpay')
  @ApiOperation({ summary: 'VNPay IPN webhook (internal)' })
  vnpayWebhook(@Query() query: Record<string, string>) {
    return this.paymentService.handleVnpayWebhook(query);
  }
}
