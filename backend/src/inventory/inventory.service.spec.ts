import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LedgerOperationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockState: {
    products: any[];
    locations: any[];
    stocks: any[];
    ledgers: any[];
  };

  const createMockPrismaService = () => {
    return {
      product: {
        findUnique: jest.fn(async ({ where }) =>
          mockState.products.find((p) => p.id === where.id) || null,
        ),
      },
      location: {
        findUnique: jest.fn(async ({ where }) =>
          mockState.locations.find((l) => l.id === where.id) || null,
        ),
      },
      stock: {
        findMany: jest.fn(async ({ where }) => {
          let res = [...mockState.stocks];
          if (where?.productId) res = res.filter((s) => s.productId === where.productId);
          if (where?.locationId) res = res.filter((s) => s.locationId === where.locationId);
          return res;
        }),
        findUnique: jest.fn(async ({ where }) => {
          if (where.productId_locationId) {
            return (
              mockState.stocks.find(
                (s) =>
                  s.productId === where.productId_locationId.productId &&
                  s.locationId === where.productId_locationId.locationId,
              ) || null
            );
          }
          if (where.id) {
            return mockState.stocks.find((s) => s.id === where.id) || null;
          }
          return null;
        }),
      },
      stockLedger: {
        findMany: jest.fn(async () => [...mockState.ledgers]),
      },
      $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => {
        // Snapshot for rollback of shared modifications if tx fails
        const snapshotStocks = mockState.stocks.map((s) => ({ ...s }));
        const stagedStocks = mockState.stocks.map((s) => ({ ...s }));
        const stagedLedgers: any[] = [];
        const stagedCreatedStocks: any[] = [];

        const modifiedStockIds = new Set<string>();

        const tx = {
          product: {
            findUnique: jest.fn(async ({ where }) =>
              mockState.products.find((p) => p.id === where.id) || null,
            ),
          },
          location: {
            findUnique: jest.fn(async ({ where }) =>
              mockState.locations.find((l) => l.id === where.id) || null,
            ),
          },
          stock: {
            findUnique: jest.fn(async ({ where }) => {
              if (where.productId_locationId) {
                const found = stagedStocks.find(
                  (s) =>
                    s.productId === where.productId_locationId.productId &&
                    s.locationId === where.productId_locationId.locationId,
                );
                return found ? { ...found } : null;
              }
              if (where.id) {
                const found = stagedStocks.find((s) => s.id === where.id);
                return found ? { ...found } : null;
              }
              return null;
            }),
            create: jest.fn(async ({ data }) => {
              const newStock = {
                id: `stock-${Date.now()}-${Math.random()}`,
                ...data,
                allocatedQuantity: data.allocatedQuantity || 0,
              };
              stagedStocks.push(newStock);
              stagedCreatedStocks.push(newStock);
              mockState.stocks.push(newStock);
              return { ...newStock };
            }),
            update: jest.fn(async ({ where, data }) => {
              const idx = stagedStocks.findIndex((s) => s.id === where.id);
              if (idx === -1) throw new Error('Stock not found');
              stagedStocks[idx] = { ...stagedStocks[idx], ...data };
              const sharedIdx = mockState.stocks.findIndex((s) => s.id === where.id);
              if (sharedIdx !== -1) {
                mockState.stocks[sharedIdx] = { ...stagedStocks[idx] };
                modifiedStockIds.add(where.id);
              }
              return { ...stagedStocks[idx] };
            }),
            updateMany: jest.fn(async ({ where, data }) => {
              const sharedIdx = mockState.stocks.findIndex((s) => s.id === where.id);
              if (sharedIdx === -1) return { count: 0 };
              const sharedStock = mockState.stocks[sharedIdx];
              if (where.quantity?.gte !== undefined && sharedStock.quantity < where.quantity.gte) {
                return { count: 0 };
              }
              modifiedStockIds.add(where.id);
              if (data.quantity?.decrement !== undefined) {
                sharedStock.quantity -= data.quantity.decrement;
              } else if (data.quantity !== undefined) {
                sharedStock.quantity = data.quantity;
              }
              const stagedIdx = stagedStocks.findIndex((s) => s.id === where.id);
              if (stagedIdx !== -1) {
                stagedStocks[stagedIdx].quantity = sharedStock.quantity;
              }
              return { count: 1 };
            }),
          },
          stockLedger: {
            create: jest.fn(async ({ data }) => {
              const newLedger = {
                id: `ledger-${Date.now()}-${Math.random()}`,
                createdAt: new Date(),
                ...data,
              };
              stagedLedgers.push(newLedger);
              return { ...newLedger };
            }),
          },
        };

        try {
          const result = await callback(tx);
          // Commit staged ledgers
          for (const l of stagedLedgers) {
            mockState.ledgers.push(l);
          }
          return result;
        } catch (error) {
          // Revert created stocks and restore stock quantities for this tx
          for (const created of stagedCreatedStocks) {
            const idx = mockState.stocks.findIndex((s) => s.id === created.id);
            if (idx !== -1) mockState.stocks.splice(idx, 1);
          }
          for (const orig of snapshotStocks) {
            if (modifiedStockIds.has(orig.id)) {
              const idx = mockState.stocks.findIndex((s) => s.id === orig.id);
              if (idx !== -1) mockState.stocks[idx] = { ...orig };
            }
          }
          throw error;
        }
      }),
    };
  };

  beforeEach(async () => {
    mockState = {
      products: [
        { id: 'prod-1', sku: 'SKU-001', name: 'Widget A' },
        { id: 'prod-2', sku: 'SKU-002', name: 'Widget B' },
      ],
      locations: [
        { id: 'loc-1', name: 'Shelf A1', warehouseId: 'wh-1' },
        { id: 'loc-2', name: 'Shelf B1', warehouseId: 'wh-1' },
      ],
      stocks: [],
      ledgers: [],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: createMockPrismaService(),
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  // TEST 1 — RECEIVE
  it('TEST 1: should receive stock (Initial: 100, Receive: 50 -> Expected: 150)', async () => {
    mockState.stocks.push({
      id: 'stock-1',
      productId: 'prod-1',
      locationId: 'loc-1',
      quantity: 100,
      allocatedQuantity: 0,
    });

    const result = await service.receiveStock({
      productId: 'prod-1',
      locationId: 'loc-1',
      quantity: 50,
      referenceNumber: 'RCV-001',
    });

    expect(result.quantityBefore).toBe(100);
    expect(result.quantityAfter).toBe(150);
    expect(result.stock.quantity).toBe(150);
    expect(mockState.stocks[0].quantity).toBe(150);
  });

  // TEST 2 — DELIVERY
  it('TEST 2: should deliver stock (Initial: 100, Deliver: 30 -> Expected: 70)', async () => {
    mockState.stocks.push({
      id: 'stock-1',
      productId: 'prod-1',
      locationId: 'loc-1',
      quantity: 100,
      allocatedQuantity: 0,
    });

    const result = await service.deliverStock({
      productId: 'prod-1',
      locationId: 'loc-1',
      quantity: 30,
      referenceNumber: 'DEL-001',
    });

    expect(result.quantityBefore).toBe(100);
    expect(result.quantityAfter).toBe(70);
    expect(result.stock.quantity).toBe(70);
    expect(mockState.stocks[0].quantity).toBe(70);
  });

  // TEST 3 — INSUFFICIENT STOCK
  it('TEST 3: should reject delivery when insufficient stock (Initial: 20, Deliver: 30 -> Rejected, stock remains 20)', async () => {
    mockState.stocks.push({
      id: 'stock-1',
      productId: 'prod-1',
      locationId: 'loc-1',
      quantity: 20,
      allocatedQuantity: 0,
    });

    await expect(
      service.deliverStock({
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 30,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(mockState.stocks[0].quantity).toBe(20);
    expect(mockState.ledgers.length).toBe(0);
  });

  // TEST 4 — TRANSFER
  it('TEST 4: should transfer stock (Source: 100, Dest: 20, Transfer: 30 -> Source: 70, Dest: 50)', async () => {
    mockState.stocks.push(
      {
        id: 'stock-source',
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 100,
        allocatedQuantity: 0,
      },
      {
        id: 'stock-dest',
        productId: 'prod-1',
        locationId: 'loc-2',
        quantity: 20,
        allocatedQuantity: 0,
      },
    );

    const result = await service.transferStock({
      productId: 'prod-1',
      sourceLocationId: 'loc-1',
      destinationLocationId: 'loc-2',
      quantity: 30,
      referenceNumber: 'TRF-001',
    });

    expect(result.sourceLocation.quantityAfter).toBe(70);
    expect(result.destinationLocation.quantityAfter).toBe(50);

    const source = mockState.stocks.find((s) => s.locationId === 'loc-1');
    const dest = mockState.stocks.find((s) => s.locationId === 'loc-2');
    expect(source.quantity).toBe(70);
    expect(dest.quantity).toBe(50);

    // Verify 2 ledger entries
    expect(mockState.ledgers.length).toBe(2);
    expect(mockState.ledgers[0].operationType).toBe(LedgerOperationType.TRANSFER_OUT);
    expect(mockState.ledgers[0].quantityChange).toBe(-30);
    expect(mockState.ledgers[0].balanceAfter).toBe(70);

    expect(mockState.ledgers[1].operationType).toBe(LedgerOperationType.TRANSFER_IN);
    expect(mockState.ledgers[1].quantityChange).toBe(30);
    expect(mockState.ledgers[1].balanceAfter).toBe(50);
  });

  // TEST 5 — ADJUSTMENT
  it('TEST 5: should adjust stock to physical count (System: 100, Physical: 97 -> Stock: 97, Diff: -3)', async () => {
    mockState.stocks.push({
      id: 'stock-1',
      productId: 'prod-1',
      locationId: 'loc-1',
      quantity: 100,
      allocatedQuantity: 0,
    });

    const result = await service.adjustStock({
      productId: 'prod-1',
      locationId: 'loc-1',
      physicalQuantity: 97,
      referenceNumber: 'ADJ-001',
    });

    expect(result.quantityBefore).toBe(100);
    expect(result.quantityAfter).toBe(97);
    expect(result.difference).toBe(-3);
    expect(mockState.stocks[0].quantity).toBe(97);

    expect(mockState.ledgers.length).toBe(1);
    expect(mockState.ledgers[0].operationType).toBe(LedgerOperationType.ADJUSTMENT);
    expect(mockState.ledgers[0].quantityChange).toBe(-3);
    expect(mockState.ledgers[0].balanceAfter).toBe(97);
  });

  // TEST 6 — LEDGER
  it('TEST 6: should verify every successful operation creates correct ledger entry', async () => {
    // 1. Receive
    await service.receiveStock({
      productId: 'prod-1',
      locationId: 'loc-1',
      quantity: 50,
      referenceNumber: 'REF-RCV',
    });

    expect(mockState.ledgers.length).toBe(1);
    expect(mockState.ledgers[0].operationType).toBe(LedgerOperationType.RECEIPT);
    expect(mockState.ledgers[0].quantityChange).toBe(50);
    expect(mockState.ledgers[0].balanceAfter).toBe(50);

    // 2. Deliver
    await service.deliverStock({
      productId: 'prod-1',
      locationId: 'loc-1',
      quantity: 20,
      referenceNumber: 'REF-DEL',
    });

    expect(mockState.ledgers.length).toBe(2);
    expect(mockState.ledgers[1].operationType).toBe(LedgerOperationType.DELIVERY);
    expect(mockState.ledgers[1].quantityChange).toBe(-20);
    expect(mockState.ledgers[1].balanceAfter).toBe(30);
  });

  // TEST 7 — TRANSACTION ROLLBACK
  it('TEST 7: should rollback transaction if any operation fails midway', async () => {
    mockState.stocks.push({
      id: 'stock-source',
      productId: 'prod-1',
      locationId: 'loc-1',
      quantity: 100,
      allocatedQuantity: 0,
    });

    // Destination location doesn't exist
    await expect(
      service.transferStock({
        productId: 'prod-1',
        sourceLocationId: 'loc-1',
        destinationLocationId: 'non-existent-loc',
        quantity: 30,
      }),
    ).rejects.toThrow(NotFoundException);

    // Source stock must remain untouched
    const source = mockState.stocks.find((s) => s.locationId === 'loc-1');
    expect(source.quantity).toBe(100);
    // No ledger entries should exist
    expect(mockState.ledgers.length).toBe(0);
  });

  // TEST 8 — CONCURRENT DELIVERY
  it('TEST 8: should prevent negative stock on concurrent deliveries', async () => {
    mockState.stocks.push({
      id: 'stock-1',
      productId: 'prod-1',
      locationId: 'loc-1',
      quantity: 50,
      allocatedQuantity: 0,
    });

    // Two simultaneous attempts to deliver 30 each (30 + 30 = 60 > 50)
    const delivery1 = service.deliverStock({
      productId: 'prod-1',
      locationId: 'loc-1',
      quantity: 30,
    });

    const delivery2 = service.deliverStock({
      productId: 'prod-1',
      locationId: 'loc-1',
      quantity: 30,
    });

    const results = await Promise.allSettled([delivery1, delivery2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one should succeed, one should be rejected
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Final stock must be 20, never negative
    expect(mockState.stocks[0].quantity).toBe(20);
  });

  // Additional Read API tests
  describe('Read APIs', () => {
    it('should get current stock filtered by product', async () => {
      mockState.stocks.push({
        id: 'stock-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 80,
        allocatedQuantity: 10,
      });

      const stocks = await service.getStockByProduct('prod-1');
      expect(stocks.length).toBe(1);
      expect(stocks[0].quantity).toBe(80);
      expect(stocks[0].availableQuantity).toBe(70);
    });

    it('should throw NotFoundException for non-existent product in getStockByProduct', async () => {
      await expect(service.getStockByProduct('unknown-prod')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent location in getStockByLocation', async () => {
      await expect(service.getStockByLocation('unknown-loc')).rejects.toThrow(NotFoundException);
    });
  });
});
