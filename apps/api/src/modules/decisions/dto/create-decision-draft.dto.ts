import { IsString, IsNotEmpty, IsArray, IsOptional, ArrayMinSize, MinLength } from "class-validator";

export class CreateDecisionDraftDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  owner!: string;

  @IsOptional()
  @IsString()
  ownerRole?: string;

  @IsArray()
  @ArrayMinSize(1, { message: "assumptions must contain at least 1 item" })
  @IsString({ each: true })
  assumptions!: string[];

  @IsOptional()
  @IsString()
  derivation?: string;

  @IsArray()
  @ArrayMinSize(1, { message: "alternatives must contain at least 1 item" })
  @IsString({ each: true })
  alternatives!: string[];

  @IsArray()
  @ArrayMinSize(1, { message: "risks must contain at least 1 item" })
  @IsString({ each: true })
  risks!: string[];

  @IsOptional()
  @IsString()
  clientContext?: string;

  @IsOptional()
  @IsString()
  commsContext?: string;

  @IsOptional()
  @IsString()
  clientImplications?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsArray()
  @ArrayMinSize(1, { message: "successCriteria must contain at least 1 item" })
  @IsString({ each: true })
  successCriteria!: string[];

  @IsArray()
  @ArrayMinSize(1, { message: "nextSteps must contain at least 1 item" })
  @IsString({ each: true })
  nextSteps!: string[];

  @IsOptional()
  @IsString()
  reviewAt?: string;

  @IsOptional()
  @IsString()
  draftId?: string;
}

