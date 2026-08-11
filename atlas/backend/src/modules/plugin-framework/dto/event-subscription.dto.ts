import { IsNotEmpty, IsString } from 'class-validator';

export class CreateEventSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  eventName: string;

  /** Must be one of the manifest's declared `hooks`. */
  @IsString()
  @IsNotEmpty()
  targetHook: string;
}
