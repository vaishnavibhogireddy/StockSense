import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LedgerOperationType, Stock } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdjustStockDto,
  DeliverStockDto,
  ReceiveStockDto,
  TransferStockDto,
} from './dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Read all stock records, optionally filtered by product and/or location.
   */
  async getStock(query?: { productId?: string; locationId?: string }) {
    const where: any = {};
    if (query?.productId) where.productId = query.productId;
    if (query?.locationId) where.locationId = query.locationId;

    const stocks = await this.prisma.stock.findMany({
      where,
      include: {
        product: true,
        location: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: [{ productId: 'asc' }, { locationId: 'asc' }],
    });

    return stocks.map((stock) => ({
      ...stock,
      availableQuantity: stock.quantity - stock.allocatedQuantity,
    }));
  }

  /**
   * Read stock records for a specific product.
   */
  async getStockByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    return this.getStock({ productId });
  }

  /**
   * Read stock records for a specific location.
   */
  async getStockByLocation(locationId: string) {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID "${locationId}" not found`);
    }

    return this.getStock({ locationId });
  }

  /**
   * Receive stock at a specific location.
   * Atomically increments stock and records a RECEIPT ledger entry.
   */
  async receiveStock(dto: ReceiveStockDto) {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Received quantity must be greater than 0');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate Product exists
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID "${dto.productId}" not found`);
      }

      // 2. Validate Location exists
      const location = await tx.location.findUnique({
        where: { id: dto.locationId },
      });
      if (!location) {
        throw new NotFoundException(
          `Location with ID "${dto.locationId}" not found`,
        );
      }

      // 3. Find or create Stock record
      const existingStock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId: dto.productId,
            locationId: dto.locationId,
          },
        },
      });

      const quantityBefore = existingStock ? existingStock.quantity : 0;
      const quantityAfter = quantityBefore + dto.quantity;

      let stock: Stock;
      if (!existingStock) {
        stock = await tx.stock.create({
          data: {
            productId: dto.productId,
            locationId: dto.locationId,
            quantity: quantityAfter,
            allocatedQuantity: 0,
          },
        });
      } else {
        stock = await tx.stock.update({
          where: { id: existingStock.id },
          data: {
            quantity: quantityAfter,
          },
        });
      }

      // 4. Record in StockLedger
      const refNumber = dto.referenceNumber || `RCV-${Date.now()}`;
      const ledger = await tx.stockLedger.create({
        data: {
          productId: dto.productId,
          locationId: dto.locationId,
          operationType: LedgerOperationType.RECEIPT,
          referenceNumber: refNumber,
          quantityChange: dto.quantity,
          balanceAfter: quantityAfter,
          userId: dto.userId || null,
        },
      });

      return {
        message: 'Stock received successfully',
        quantityBefore,
        quantityAfter,
        quantityReceived: dto.quantity,
        stock,
        ledger,
      };
    });
  }

  /**
   * Deliver stock from a specific location.
   * Decrements stock with strict concurrency and negative-stock prevention.
   * Records a DELIVERY ledger entry.
   */
  async deliverStock(dto: DeliverStockDto) {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Delivered quantity must be greater than 0');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate Product exists
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID "${dto.productId}" not found`);
      }

      // 2. Validate Location exists
      const location = await tx.location.findUnique({
        where: { id: dto.locationId },
      });
      if (!location) {
        throw new NotFoundException(
          `Location with ID "${dto.locationId}" not found`,
        );
      }

      // 3. Find Stock record
      const stock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId: dto.productId,
            locationId: dto.locationId,
          },
        },
      });

      if (!stock) {
        throw new BadRequestException(
          `No stock found for product "${dto.productId}" at location "${dto.locationId}". Insufficient stock available.`,
        );
      }

      const availableQuantity = stock.quantity - stock.allocatedQuantity;
      if (availableQuantity < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${availableQuantity}, Requested: ${dto.quantity}. Stock cannot be negative.`,
        );
      }

      const quantityBefore = stock.quantity;
      const quantityAfter = quantityBefore - dto.quantity;

      // 4. Concurrency-safe atomic conditional update
      // Protects against race conditions by checking quantity >= requested at the moment of UPDATE
      const updateResult = await tx.stock.updateMany({
        where: {
          id: stock.id,
          quantity: { gte: dto.quantity },
        },
        data: {
          quantity: { decrement: dto.quantity },
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'Concurrent stock update conflict or insufficient stock. Operation aborted.',
        );
      }

      const updatedStock = await tx.stock.findUnique({
        where: { id: stock.id },
      });

      // 5. Record in StockLedger
      const refNumber = dto.referenceNumber || `DEL-${Date.now()}`;
      const ledger = await tx.stockLedger.create({
        data: {
          productId: dto.productId,
          locationId: dto.locationId,
          operationType: LedgerOperationType.DELIVERY,
          referenceNumber: refNumber,
          quantityChange: -dto.quantity,
          balanceAfter: quantityAfter,
          userId: dto.userId || null,
        },
      });

      return {
        message: 'Stock delivered successfully',
        quantityBefore,
        quantityAfter,
        quantityDelivered: dto.quantity,
        stock: updatedStock,
        ledger,
      };
    });
  }

  /**
   * Transfer stock between two different locations.
   * Atomically decreases source, increases destination, and logs TRANSFER_OUT & TRANSFER_IN.
   */
  async transferStock(dto: TransferStockDto) {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Transfer quantity must be greater than 0');
    }

    if (dto.sourceLocationId === dto.destinationLocationId) {
      throw new BadRequestException(
        'Source and destination locations must be different',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate Product exists
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID "${dto.productId}" not found`);
      }

      // 2. Validate Source Location exists
      const sourceLocation = await tx.location.findUnique({
        where: { id: dto.sourceLocationId },
      });
      if (!sourceLocation) {
        throw new NotFoundException(
          `Source location with ID "${dto.sourceLocationId}" not found`,
        );
      }

      // 3. Validate Destination Location exists
      const destLocation = await tx.location.findUnique({
        where: { id: dto.destinationLocationId },
      });
      if (!destLocation) {
        throw new NotFoundException(
          `Destination location with ID "${dto.destinationLocationId}" not found`,
        );
      }

      // 4. Check sufficient stock at source
      const sourceStock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId: dto.productId,
            locationId: dto.sourceLocationId,
          },
        },
      });

      if (!sourceStock || sourceStock.quantity < dto.quantity) {
        const available = sourceStock ? sourceStock.quantity : 0;
        throw new BadRequestException(
          `Insufficient stock at source location. Available: ${available}, Requested: ${dto.quantity}.`,
        );
      }

      const sourceBefore = sourceStock.quantity;
      const sourceAfter = sourceBefore - dto.quantity;

      // 5. Concurrency-safe decrement at source
      const sourceUpdateResult = await tx.stock.updateMany({
        where: {
          id: sourceStock.id,
          quantity: { gte: dto.quantity },
        },
        data: {
          quantity: { decrement: dto.quantity },
        },
      });

      if (sourceUpdateResult.count === 0) {
        throw new ConflictException(
          'Concurrent stock update conflict at source location. Transfer aborted.',
        );
      }
      const updatedSourceStock = await tx.stock.findUnique({
        where: { id: sourceStock.id },
      });

      // 6. Increase destination stock
      const destStock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId: dto.productId,
            locationId: dto.destinationLocationId,
          },
        },
      });

      const destBefore = destStock ? destStock.quantity : 0;
      const destAfter = destBefore + dto.quantity;

      let updatedDestStock: Stock;
      if (!destStock) {
        updatedDestStock = await tx.stock.create({
          data: {
            productId: dto.productId,
            locationId: dto.destinationLocationId,
            quantity: destAfter,
            allocatedQuantity: 0,
          },
        });
      } else {
        updatedDestStock = await tx.stock.update({
          where: { id: destStock.id },
          data: {
            quantity: destAfter,
          },
        });
      }

      // 7. Create TWO ledger entries: TRANSFER_OUT and TRANSFER_IN
      const refNumber = dto.referenceNumber || `TRF-${Date.now()}`;

      const sourceLedger = await tx.stockLedger.create({
        data: {
          productId: dto.productId,
          locationId: dto.sourceLocationId,
          operationType: LedgerOperationType.TRANSFER_OUT,
          referenceNumber: refNumber,
          quantityChange: -dto.quantity,
          balanceAfter: sourceAfter,
          userId: dto.userId || null,
        },
      });

      const destLedger = await tx.stockLedger.create({
        data: {
          productId: dto.productId,
          locationId: dto.destinationLocationId,
          operationType: LedgerOperationType.TRANSFER_IN,
          referenceNumber: refNumber,
          quantityChange: dto.quantity,
          balanceAfter: destAfter,
          userId: dto.userId || null,
        },
      });

      return {
        message: 'Stock transferred successfully',
        quantityTransferred: dto.quantity,
        sourceLocation: {
          locationId: dto.sourceLocationId,
          quantityBefore: sourceBefore,
          quantityAfter: sourceAfter,
          stock: updatedSourceStock,
          ledger: sourceLedger,
        },
        destinationLocation: {
          locationId: dto.destinationLocationId,
          quantityBefore: destBefore,
          quantityAfter: destAfter,
          stock: updatedDestStock,
          ledger: destLedger,
        },
      };
    });
  }

  /**
   * Adjust stock to match physical count.
   * Updates stock to physicalQuantity and records an ADJUSTMENT ledger entry.
   */
  async adjustStock(dto: AdjustStockDto) {
    if (dto.physicalQuantity < 0) {
      throw new BadRequestException('Physical quantity cannot be negative');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate Product exists
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID "${dto.productId}" not found`);
      }

      // 2. Validate Location exists
      const location = await tx.location.findUnique({
        where: { id: dto.locationId },
      });
      if (!location) {
        throw new NotFoundException(
          `Location with ID "${dto.locationId}" not found`,
        );
      }

      // 3. Find current stock
      const existingStock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId: dto.productId,
            locationId: dto.locationId,
          },
        },
      });

      const quantityBefore = existingStock ? existingStock.quantity : 0;
      const quantityAfter = dto.physicalQuantity;
      const difference = quantityAfter - quantityBefore;

      let stock: Stock;
      if (!existingStock) {
        stock = await tx.stock.create({
          data: {
            productId: dto.productId,
            locationId: dto.locationId,
            quantity: quantityAfter,
            allocatedQuantity: 0,
          },
        });
      } else {
        stock = await tx.stock.update({
          where: { id: existingStock.id },
          data: {
            quantity: quantityAfter,
          },
        });
      }

      // 4. Record in StockLedger
      const refNumber = dto.referenceNumber || `ADJ-${Date.now()}`;
      const ledger = await tx.stockLedger.create({
        data: {
          productId: dto.productId,
          locationId: dto.locationId,
          operationType: LedgerOperationType.ADJUSTMENT,
          referenceNumber: refNumber,
          quantityChange: difference,
          balanceAfter: quantityAfter,
          userId: dto.userId || null,
        },
      });

      return {
        message: 'Stock adjusted successfully',
        quantityBefore,
        quantityAfter,
        difference,
        stock,
        ledger,
      };
    });
  }

  /**
   * Read stock ledger entries.
   */
  async getStockLedger(query?: {
    productId?: string;
    locationId?: string;
    limit?: number;
  }) {
    const where: any = {};
    if (query?.productId) where.productId = query.productId;
    if (query?.locationId) where.locationId = query.locationId;

    return this.prisma.stockLedger.findMany({
      where,
      include: {
        product: true,
        location: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: query?.limit ? Number(query.limit) : 50,
    });
  }
}
