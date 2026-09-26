import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  AdjustStockDto,
  DeliverStockDto,
  ReceiveStockDto,
  TransferStockDto,
} from './dto';

@Controller('inventory')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getStock(
    @Query('productId') productId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.inventoryService.getStock({ productId, locationId });
  }

  @Get('product/:productId')
  async getStockByProduct(@Param('productId') productId: string) {
    return this.inventoryService.getStockByProduct(productId);
  }

  @Get('location/:locationId')
  async getStockByLocation(@Param('locationId') locationId: string) {
    return this.inventoryService.getStockByLocation(locationId);
  }

  @Get('ledger')
  async getStockLedger(
    @Query('productId') productId?: string,
    @Query('locationId') locationId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getStockLedger({
      productId,
      locationId,
      limit,
    });
  }

  @Post('receive')
  async receiveStock(@Body() dto: ReceiveStockDto) {
    return this.inventoryService.receiveStock(dto);
  }

  @Post('deliver')
  async deliverStock(@Body() dto: DeliverStockDto) {
    return this.inventoryService.deliverStock(dto);
  }

  @Post('transfer')
  async transferStock(@Body() dto: TransferStockDto) {
    return this.inventoryService.transferStock(dto);
  }

  @Post('adjust')
  async adjustStock(@Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(dto);
  }
}
