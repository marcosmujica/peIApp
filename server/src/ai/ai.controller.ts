import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AIService } from './ai.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('predict-rubro')
  // @UseGuards(AuthGuard('jwt'))
  async predict(@Body() body: { description: string; type: 'income' | 'expense'; allowedRubros?: any[] }) {

    const { description, type, allowedRubros } = body;
    const rubroId = await this.aiService.predictRubro(description, type, allowedRubros);
    return { rubroId };
  }

  @Post('ask-wallet')
  async askWallet(@Body() body: { walletData: any; userData: any; question: string }) {
    const { walletData, userData, question } = body;
    const answer = await this.aiService.askWalletQuestion(walletData, userData, question);
    return { answer };
  }
}

