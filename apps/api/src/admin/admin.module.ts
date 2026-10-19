import { Module } from '@nestjs/common';
import { FulfillmentModule } from '../fulfillment/fulfillment.module';
import { AdminMetaController } from './admin-meta.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminProductsController } from './admin-products.controller';
import { AdminTasksController } from './admin-tasks.controller';

@Module({
  imports: [FulfillmentModule],
  controllers: [AdminOrdersController, AdminTasksController, AdminProductsController, AdminMetaController],
})
export class AdminModule {}
