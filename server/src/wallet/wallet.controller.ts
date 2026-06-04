import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtAuthRequest } from '../auth/types/auth-request.types';
import { WalletService } from './wallet.service';
import { WalletResponseDto } from './dto/wallet-response.dto';
import { TransactionListResponseDto } from './dto/transaction-list-response.dto';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user wallet balance' })
  async getMyBalance(@Req() req: JwtAuthRequest): Promise<WalletResponseDto> {
    const balance: number = await this.walletService.getBalance(
      req.user.id,
      req.user.email,
    );
    return { balance };
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated credit transaction history' })
  getTransactions(
    @Req() req: JwtAuthRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type', new DefaultValuePipe('all')) type: string,
  ): Promise<TransactionListResponseDto> {
    return this.walletService.getTransactions(req.user.id, page, limit, type);
  }
}
