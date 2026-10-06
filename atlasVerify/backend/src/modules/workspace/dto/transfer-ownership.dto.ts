import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({ example: 'user-uuid', description: 'Must already be an ACTIVE member of the workspace' })
  @IsString()
  @IsNotEmpty()
  newOwnerUserId!: string;
}
