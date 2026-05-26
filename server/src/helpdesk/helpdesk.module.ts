import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelpDesk } from './helpdesk.entity';
import { HelpDeskService } from './helpdesk.service';
import { HelpDeskController } from './helpdesk.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HelpDesk])],
  controllers: [HelpDeskController],
  providers: [HelpDeskService],
  exports: [HelpDeskService],
})
export class HelpDeskModule {}
