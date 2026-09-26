import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: InventoryService;

  const mockInventoryService = {
    getStock: jest.fn(),
    getStockByProduct: jest.fn(),
    getStockByLocation: jest.fn(),
    getStockLedger: jest.fn(),
    receiveStock: jest.fn(),
    deliverStock: jest.fn(),
    transferStock: jest.fn(),
    adjustStock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /inventory should call service.getStock', async () => {
    mockInventoryService.getStock.mockResolvedValueOnce([{ id: '1', quantity: 50 }]);
    const result = await controller.getStock('prod-1', 'loc-1');
    expect(service.getStock).toHaveBeenCalledWith({ productId: 'prod-1', locationId: 'loc-1' });
    expect(result).toEqual([{ id: '1', quantity: 50 }]);
  });

  it('GET /inventory/product/:id should call service.getStockByProduct', async () => {
    mockInventoryService.getStockByProduct.mockResolvedValueOnce([{ id: '1', productId: 'p1' }]);
    const result = await controller.getStockByProduct('p1');
    expect(service.getStockByProduct).toHaveBeenCalledWith('p1');
    expect(result).toEqual([{ id: '1', productId: 'p1' }]);
  });

  it('GET /inventory/location/:id should call service.getStockByLocation', async () => {
    mockInventoryService.getStockByLocation.mockResolvedValueOnce([{ id: '1', locationId: 'l1' }]);
    const result = await controller.getStockByLocation('l1');
    expect(service.getStockByLocation).toHaveBeenCalledWith('l1');
    expect(result).toEqual([{ id: '1', locationId: 'l1' }]);
  });

  it('POST /inventory/receive should call service.receiveStock', async () => {
    const dto = { productId: 'p1', locationId: 'l1', quantity: 10 };
    mockInventoryService.receiveStock.mockResolvedValueOnce({ quantityAfter: 10 });
    const result = await controller.receiveStock(dto);
    expect(service.receiveStock).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ quantityAfter: 10 });
  });

  it('POST /inventory/deliver should call service.deliverStock', async () => {
    const dto = { productId: 'p1', locationId: 'l1', quantity: 5 };
    mockInventoryService.deliverStock.mockResolvedValueOnce({ quantityAfter: 5 });
    const result = await controller.deliverStock(dto);
    expect(service.deliverStock).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ quantityAfter: 5 });
  });

  it('POST /inventory/transfer should call service.transferStock', async () => {
    const dto = { productId: 'p1', sourceLocationId: 'l1', destinationLocationId: 'l2', quantity: 5 };
    mockInventoryService.transferStock.mockResolvedValueOnce({ quantityTransferred: 5 });
    const result = await controller.transferStock(dto);
    expect(service.transferStock).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ quantityTransferred: 5 });
  });

  it('POST /inventory/adjust should call service.adjustStock', async () => {
    const dto = { productId: 'p1', locationId: 'l1', physicalQuantity: 40 };
    mockInventoryService.adjustStock.mockResolvedValueOnce({ quantityAfter: 40 });
    const result = await controller.adjustStock(dto);
    expect(service.adjustStock).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ quantityAfter: 40 });
  });
});
