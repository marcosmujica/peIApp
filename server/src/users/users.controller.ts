import { Body, Controller, Get, Param, Patch, Post, Put, Req, UploadedFile, UseGuards, UseInterceptors, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { diskStorage } from 'multer';
import { extname, join, resolve } from 'path';
import * as path from 'path';
import * as fs from 'fs';
import { ClientLogDto } from './dto/client-log.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private config: ConfigService,
  ) {}

  @Post('client-log')
  async logFromClient(@Body() dto: ClientLogDto) {
    const context = dto.context || 'ClientApp';
    const level = dto.level || 'log';
    const platform = dto.platform || 'unknown';
    const msg = `[${platform.toUpperCase()}] ${dto.message}`;
    
    const logger = new Logger(context);
    if (level === 'error') {
      logger.error(msg);
    } else if (level === 'warn') {
      logger.warn(msg);
    } else {
      logger.log(msg);
    }
    return { success: true };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() body: { 
      displayName?: string; 
      country?: string; 
      currency?: string; 
      pushEnabled?: boolean; 
      defaultPaymentProcedure?: string;
      gender?: string;
      age?: number;
      theme?: string;
      defaultWalletId?: string;
      notificationId?: string;
      preferredNotificationTime?: string;
      lastAccess?: Date;
    }
  ) {
    return this.usersService.updateProfile(id, body);
  }

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file', {
    limits: { 
      fileSize: 100 * 1024 * 1024, // 100MB limit
      fieldSize: 100 * 1024 * 1024, // Para campos de texto grandes
      fields: 20,
      parts: 20
    }, 

    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.resolve(process.cwd(), 'public/uploads/avatars');
        console.log('[Multer Destination] Saving to:', uploadPath);
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        try {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          // Usar un ID de usuario limpio (sin símbolos raros) para el nombre de archivo
          const safeId = (req.params.id as string).replace(/[^a-z0-9]/gi, '-');
          const finalName = `${safeId}-${uniqueSuffix}${extname(file.originalname)}`;
          console.log('[Multer Filename] req.params.id:', req.params.id, 'finalName:', finalName);
          cb(null, finalName);
        } catch (err) {
          console.error('[Multer Filename] ERROR:', err);
          cb(err as any, '');
        }
      }
    }),
  }))
  async uploadAvatar(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    try {
      if (!file) {
        console.error('[UsersController] No file uploaded');
        throw new Error('No file uploaded');
      }
      
      console.log('[UsersController] Uploading avatar for id:', id);
      console.log('[UsersController] File saved as:', file.filename);

      // Generate accessible URL
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.get('host');
      const baseUrl = this.config.get<string>('AVATAR_BASE_URL') || `${protocol}://${host}`;
      const url = `${baseUrl}/uploads/avatars/${file.filename}`;
      
      console.log('[UsersController] Generated URL:', url);
      
      const updated = await this.usersService.updateProfile(id, { avatarUrl: url });
      return updated;
    } catch (err) {
      console.error('[UsersController] Error in uploadAvatar:', err);
      throw new InternalServerErrorException('Failed to upload avatar'); // Use InternalServerErrorException
    }
  }
}
