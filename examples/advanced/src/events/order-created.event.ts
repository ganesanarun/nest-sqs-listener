export class OrderCreatedEvent {
  orderId: string;
  customerId: string;
  amount: number;
  items: OrderItem[];
}

export class OrderItem {
  productId: string;
  quantity: number;
}
