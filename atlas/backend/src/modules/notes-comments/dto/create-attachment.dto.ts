import { IsString, IsNotEmpty } from 'class-validator';

export class CreateAttachmentDto {
  /** An existing File Management `FileRecord.id` — this module never stores file bytes itself. */
  @IsString()
  @IsNotEmpty()
  fileId!: string;
}
