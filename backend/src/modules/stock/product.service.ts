import { prisma } from '@/config/database';
import { CreateProductDto, UpdateProductDto } from './types';
import { Prisma } from '@prisma/client';

export class ProductService {
  /**
   * Create a new product
   */
  async createProduct(data: CreateProductDto): Promise<any> {
    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku: data.sku }
    });

    if (existingProduct) {
      throw new Error('Product with this SKU already exists');
    }

    const product = await prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        category: data.category,
        unit: data.unit || 'piece',
        minThreshold: data.minThreshold || 100,
        reorderPoint: data.reorderPoint
      }
    });

    return product;
  }

  /**
   * Get or create product from OrderItem (auto-creation)
   */
  async getOrCreateProductFromOrderItem(sku: string, name: string): Promise<any> {
    // Try to find existing product by SKU
    let product = await prisma.product.findUnique({
      where: { sku }
    });

    // If not found, create it
    if (!product) {
      product = await prisma.product.create({
        data: {
          sku,
          name,
          unit: 'piece',
          minThreshold: 100
        }
      });

      console.log(`✅ Auto-created product: ${sku} - ${name}`);
    }

    return product;
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<any> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        lots: {
          where: { isActive: true },
          orderBy: { expiryDate: 'asc' }
        },
        stockLevels: {
          include: {
            warehouse: true
          }
        }
      }
    });

    return product;
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(sku: string): Promise<any> {
    const product = await prisma.product.findUnique({
      where: { sku },
      include: {
        lots: {
          where: { isActive: true },
          orderBy: { expiryDate: 'asc' }
        },
        stockLevels: {
          include: {
            warehouse: true
          }
        }
      }
    });

    return product;
  }

  /**
   * Get all products with filters
   */
  async getProducts(filters: {
    isActive?: boolean;
    category?: string;
    search?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ products: any[]; total: number; page: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 25, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.search) {
      where.OR = [
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          stockLevels: {
            include: {
              warehouse: true
            }
          },
          _count: {
            select: {
              lots: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ]);

    // Filter by low stock if requested
    let filteredProducts = products;
    if (filters.lowStock) {
      filteredProducts = products.filter(p => {
        const totalStock = p.stockLevels.reduce((sum, sl) => sum + sl.availableQuantity, 0);
        return totalStock < p.minThreshold;
      });
    }

    return {
      products: filteredProducts,
      total: filters.lowStock ? filteredProducts.length : total,
      page,
      totalPages: Math.ceil((filters.lowStock ? filteredProducts.length : total) / limit)
    };
  }

  /**
   * Update product
   */
  async updateProduct(id: string, data: UpdateProductDto): Promise<any> {
    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        stockLevels: {
          include: {
            warehouse: true
          }
        }
      }
    });

    return updatedProduct;
  }

  /**
   * Delete (deactivate) product
   */
  async deleteProduct(id: string): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockLevels: true
      }
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Check if product has stock
    const hasStock = product.stockLevels.some(sl => sl.totalQuantity > 0);
    if (hasStock) {
      throw new Error('Cannot delete product with remaining stock. Please adjust stock to zero first.');
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
  }

  /**
   * Get product categories
   */
  async getCategories(): Promise<string[]> {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        category: { not: null }
      },
      select: {
        category: true
      },
      distinct: ['category']
    });

    return products
      .map(p => p.category)
      .filter((c): c is string => c !== null)
      .sort();
  }
}

export const productService = new ProductService();