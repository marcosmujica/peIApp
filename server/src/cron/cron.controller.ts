import { Controller, Get, Query } from '@nestjs/common';
import { CronService } from './cron.service';

@Controller('cron')
export class CronController {
  constructor(private cronService: CronService) {}

  @Get('test-daily-report')
  async testDailyReport(@Query('hour') hour: string) {
    // If hour is not provided, use current hour
    const h = hour || `${new Date().getHours().toString().padStart(2, '0')}:00`;
    await this.cronService.processReportsForHour(h);
    return { success: true, message: `Report process triggered for hour: ${h}` };
  }
}
