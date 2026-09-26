import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AdjustStockDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  locationId: string;

  @IsInt()
  @Min(0, { message: 'Physical quantity cannot be negative' })
  physicalQuantity: number;

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
