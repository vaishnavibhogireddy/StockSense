import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class TransferStockDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  sourceLocationId: string;

  @IsString()
  @IsNotEmpty()
  destinationLocationId: string;

  @IsInt()
  @Min(1, { message: 'Quantity must be greater than 0' })
  quantity: number;

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
