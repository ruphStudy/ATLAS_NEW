import { ApiProperty } from '@nestjs/swagger';
import { HealthStatus } from '../constants';
import { ServicesStatusDto } from './health-response.dto';

export class ReadinessResponseDto {
  @ApiProperty({
    example: true,
    description: 'True when all services are reachable and the application can serve traffic',
  })
  success: boolean = true;

  @ApiProperty({
    example: true,
    description: 'Convenience flag: true when status is UP',
  })
  ready: boolean = true;

  @ApiProperty({
    enum: HealthStatus,
    example: HealthStatus.UP,
    description: 'Overall readiness status',
  })
  status: HealthStatus = HealthStatus.UP;

  @ApiProperty({
    example: '2026-07-14T10:00:00.000Z',
    description: 'ISO 8601 UTC timestamp',
  })
  timestamp: string = '';

  @ApiProperty({ type: ServicesStatusDto })
  services: ServicesStatusDto = new ServicesStatusDto();
}
