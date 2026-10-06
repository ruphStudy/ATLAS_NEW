import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { TaskAssigneeType } from '../interfaces';

export class AssignTaskDto {
  @IsEnum(TaskAssigneeType)
  assigneeType!: TaskAssigneeType;

  @IsString()
  @IsNotEmpty()
  assigneeRef!: string;
}
