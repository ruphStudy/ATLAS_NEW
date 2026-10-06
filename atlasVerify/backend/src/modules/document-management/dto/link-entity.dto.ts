import { IsString, IsNotEmpty } from 'class-validator';

export class LinkEntityDto {
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;
}
