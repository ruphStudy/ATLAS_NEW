import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getRoot(): { name: string; version: string; status: string } {
    return {
      name: 'ATLAS API',
      version: this.configService.get<string>('app.swagger.version', '1.0'),
      status: 'operational',
    };
  }
}
