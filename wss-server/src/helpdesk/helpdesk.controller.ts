import { Body, Controller, Post } from '@nestjs/common';
import { HelpDeskService } from './helpdesk.service';

@Controller('helpdesk')
export class HelpDeskController {
  constructor(private readonly helpdeskService: HelpDeskService) {}

  @Post()
  async createMessage(
    @Body() body: { userId?: string; message: string },
  ) {
    return this.helpdeskService.create(body.userId || null, body.message);
  }
}
