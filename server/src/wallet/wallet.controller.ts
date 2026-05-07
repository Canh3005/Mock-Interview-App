import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtAuthRequest } from '../auth/types/auth-request.types';
import { WalletService } from './wallet.service';
import { WalletResponseDto } from './dto/wallet-response.dto';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user wallet balance' })
  async getMyBalance(@Req() req: JwtAuthRequest): Promise<WalletResponseDto> {
    const balance: number = await this.walletService.getBalance(req.user.id);
    return { balance };
  }
}
