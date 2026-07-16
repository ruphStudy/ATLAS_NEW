import { ApiProperty } from '@nestjs/swagger';
import { HealthStatus, ServiceStatus } from '../constants';

export class ServicesStatusDto {
  @ApiProperty({
    enum: ServiceStatus,
    example: ServiceStatus.UP,
    description: 'PostgreSQL (Prisma) connection status',
  })
  database: ServiceStatus = ServiceStatus.UP;

  @ApiProperty({
    enum: ServiceStatus,
    example: ServiceStatus.UP,
    description: 'Redis connection status',
  })
  redis: ServiceStatus = ServiceStatus.UP;
}

export class HealthResponseDto {
  @ApiProperty({ example: true, description: 'Request succeeded' })
  success: boolean = true;

  @ApiProperty({
    enum: HealthStatus,
    example: HealthStatus.UP,
    description: 'Overall application health – UP | DEGRADED | DOWN',
  })
  status: HealthStatus = HealthStatus.UP;

  @ApiProperty({ example: 'ATLAS', description: 'Application name' })
  application: string = '';

  @ApiProperty({ example: '1.0', description: 'Application / API version' })
  version: string = '';

  @ApiProperty({
    example: 'development',
    description: 'Runtime environment (development | production | test)',
  })
  environment: string = '';

  @ApiProperty({
    example: '2h 18m 35s',
    description: 'Human-readable process uptime',
  })
  uptime: string = '';

  @ApiProperty({ example: 8315, description: 'Process uptime in seconds' })
  uptimeSeconds: number = 0;

  @ApiProperty({
    example: '2026-07-14T10:00:00.000Z',
    description: 'ISO 8601 UTC timestamp',
  })
  timestamp: string = '';

  @ApiProperty({ type: ServicesStatusDto })
  services: ServicesStatusDto = new ServicesStatusDto();
}
