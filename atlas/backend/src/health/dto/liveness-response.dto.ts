import { ApiProperty } from '@nestjs/swagger';

export class LivenessResponseDto {
  @ApiProperty({ example: true })
  success: boolean = true;

  @ApiProperty({
    example: true,
    description: 'True if the process is alive and can handle requests',
  })
  alive: boolean = true;

  @ApiProperty({
    example: '2026-07-14T10:00:00.000Z',
    description: 'ISO 8601 UTC timestamp',
  })
  timestamp: string = '';

  @ApiProperty({ example: 8315, description: 'Process uptime in seconds' })
  uptimeSeconds: number = 0;
}
