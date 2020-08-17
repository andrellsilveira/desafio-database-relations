import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository') private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Consumidor não encontrado.');
    }

    const findProducts = await this.productsRepository.findAllById(products);

    if (findProducts.length !== products.length) {
      throw new AppError('Algum(ns) produto(s) não encontrado(s).', 400);
    }

    const updatedProducts = await this.productsRepository.updateQuantity(
      products,
    );

    updatedProducts.forEach(product => {
      if (product.quantity < 0) {
        throw new AppError('Quantidade de produto insuficiente.');
      }
    });

    const orderProducts = findProducts.map(product => {
      const productQuantity = products.find(prod => prod.id === product.id);

      return {
        product_id: product.id,
        price: product.price,
        quantity: productQuantity ? productQuantity.quantity : 0,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    return order;
  }
}

export default CreateOrderService;
