import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HelpDesk } from './helpdesk.entity';

@Injectable()
export class HelpDeskService {
  constructor(
    @InjectRepository(HelpDesk)
    private readonly helpdeskRepository: Repository<HelpDesk>,
  ) {}

  async create(userId: string | undefined | null, message: string): Promise<HelpDesk> {
    const entry = this.helpdeskRepository.create({ 
      userId: userId as string | null | undefined, 
      message 
    });
    return this.helpdeskRepository.save(entry);
  }
}
