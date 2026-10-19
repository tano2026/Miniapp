import { PaxType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PassengerDto {
  @IsString() @IsNotEmpty() @MaxLength(80) fullName: string;
  @IsEnum(PaxType) type: PaxType;
}

export class OrderItemDto {
  @IsString() @IsNotEmpty() productId: string;
  @IsString() @IsNotEmpty() @MaxLength(10) flightNumber: string;
  /** ISO 8601 có múi giờ, vd 2026-10-25T14:30:00+07:00 */
  @IsDateString({ strict: true }) serviceTime: string;
  @IsInt() @Min(0) @Max(9) adults: number;
  @IsInt() @Min(0) @Max(9) children: number;
  @IsInt() @Min(0) @Max(9) infants: number;
  @ValidateNested({ each: true }) @Type(() => PassengerDto) @ArrayMinSize(1) @ArrayMaxSize(9)
  passengers: PassengerDto[];
}

export class ContactDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name: string;
  @Matches(/^(\+?84|0)\d{9,10}$/, { message: 'Số điện thoại không hợp lệ' }) phone: string;
  @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
}

export class CreateOrderDto {
  @ValidateNested({ each: true }) @Type(() => OrderItemDto) @ArrayMinSize(1) @ArrayMaxSize(4)
  items: OrderItemDto[];
  @ValidateNested() @Type(() => ContactDto) contact: ContactDto;
}
