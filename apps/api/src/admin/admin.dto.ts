import { FlightScope, OrderStatus, ProductType, ServiceDirection, TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class OrderListQuery {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  /** Mã đơn, SĐT, email hoặc số hiệu chuyến bay */
  @IsOptional() @IsString() @MaxLength(60) q?: string;
}

export class CancelOrderDto {
  @IsBoolean() refund: boolean;
  @IsString() @IsNotEmpty() @MaxLength(300) reason: string;
}

export class TaskListQuery {
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
}

export class CompleteTaskDto {
  @IsString() @IsNotEmpty() @MaxLength(60) voucherCode: string;
  @IsOptional() @IsString() @MaxLength(60) supplierRef?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class FailTaskDto {
  @IsString() @IsNotEmpty() @MaxLength(300) reason: string;
}

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ProductDto {
  @IsEnum(ProductType) type: ProductType;
  @IsString() @Length(3, 3) @Transform(({ value }) => String(value).toUpperCase()) airportCode: string;
  @IsString() @IsNotEmpty() @Transform(trim) terminal: string;
  @IsEnum(FlightScope) scope: FlightScope;
  @IsEnum(ServiceDirection) direction: ServiceDirection;
  @IsString() @IsNotEmpty() @MaxLength(120) @Transform(trim) name: string;
  @IsString() @IsNotEmpty() @MaxLength(200) shortDescription: string;
  @IsString() @MaxLength(5000) description: string;
  @IsArray() @IsString({ each: true }) amenities: string[];
  @IsOptional() @IsString() imageUrl?: string | null;
  @IsOptional() @IsString() openingHours?: string | null;
  @IsOptional() @IsInt() @Min(1) maxStayHours?: number | null;
  @IsString() @IsNotEmpty() supplierId: string;
  @IsOptional() @IsString() supplierProductCode?: string | null;
  @IsInt() @Min(0) netAdult: number;
  @IsInt() @Min(0) netChild: number;
  @IsInt() @Min(0) netInfant: number;
  @IsInt() @Min(0) priceAdult: number;
  @IsInt() @Min(0) priceChild: number;
  @IsInt() @Min(0) priceInfant: number;
  @IsInt() @Min(0) leadTimeHours: number;
  @IsInt() @Min(0) freeCancelHours: number;
  @IsBoolean() active: boolean;
  @IsInt() sortOrder: number;
}
