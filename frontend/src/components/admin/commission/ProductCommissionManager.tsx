'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface CommissionCriteria {
  baseCommissions: {
    orders1500Plus: number;
  };
  confirmationTiers: {
    tier78Percent: number;
    tier80Percent: number;
    tier82Percent: number;
  };
  bonusCommissions: {
    upsell: {
      commission: number;
      minPercent: number;
    };
    pack2: {
      commission: number;
      minPercent: number;
    };
    pack4: {
      commission: number;
      minPercent: number;
    };
  };
}

interface ProductCommission {
  id: string;
  productName: string;
  packQuantity: number;
  commissionCriteria: CommissionCriteria;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ProductCommissionManager() {
  const { language } = useLanguage();
  const [products, setProducts] = useState<ProductCommission[]>([]);
  const [productsFromOrders, setProductsFromOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductCommission | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showProductsFromOrders, setShowProductsFromOrders] = useState(true);

  // New product form state
  const [newProduct, setNewProduct] = useState({
    productName: '',
    packQuantity: 1,
    commissionCriteria: {
      baseCommissions: { orders1500Plus: 0 },
      confirmationTiers: { tier78Percent: 0, tier80Percent: 0, tier82Percent: 0 },
      bonusCommissions: {
        upsell: { commission: 0, minPercent: 40 },
        pack2: { commission: 0, minPercent: 30 },
        pack4: { commission: 0, minPercent: 26 }
      }
    }
  });

  useEffect(() => {
    loadProducts();
    loadProductsFromOrders();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/commissions/products`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductsFromOrders = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/commissions/products/from-orders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProductsFromOrders(data.data?.products || []);
      }
    } catch (error) {
      console.error('Error loading products from orders:', error);
    }
  };

  const saveProduct = async (product: any) => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/commissions/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(product)
      });
      
      if (response.ok) {
        await loadProducts();
        setShowAddProduct(false);
        setEditingProduct(null);
        resetNewProduct();
      }
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product commission?')) return;
    
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/v1/commissions/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        await loadProducts();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetNewProduct = () => {
    setNewProduct({
      productName: '',
      packQuantity: 1,
      commissionCriteria: {
        baseCommissions: { orders1500Plus: 0 },
        confirmationTiers: { tier78Percent: 0, tier80Percent: 0, tier82Percent: 0 },
        bonusCommissions: {
          upsell: { commission: 0, minPercent: 40 },
          pack2: { commission: 0, minPercent: 30 },
          pack4: { commission: 0, minPercent: 26 }
        }
      }
    });
  };

  const createCommissionFromOrderProduct = (orderProduct: any) => {
    setNewProduct({
      productName: orderProduct.productName,
      packQuantity: orderProduct.packQuantity,
      commissionCriteria: {
        baseCommissions: { orders1500Plus: 5000 }, // Default values
        confirmationTiers: { tier78Percent: 4000, tier80Percent: 4500, tier82Percent: 5000 },
        bonusCommissions: {
          upsell: { commission: 500, minPercent: 40 },
          pack2: { commission: 520, minPercent: 30 },
          pack4: { commission: 560, minPercent: 26 }
        }
      }
    });
    setShowAddProduct(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {language === 'fr' ? 'Configuration des Produits' : 'Product Configuration'}
        </h3>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowProductsFromOrders(!showProductsFromOrders)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <span>{showProductsFromOrders ? 'Hide' : 'Show'} Products from Orders</span>
          </Button>
          <Button onClick={() => setShowAddProduct(true)} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>{language === 'fr' ? 'Ajouter Produit' : 'Add Product'}</span>
          </Button>
        </div>
      </div>

      {/* Products from Orders */}
      {showProductsFromOrders && (
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">
            {language === 'fr' ? 'Produits des Commandes' : 'Products from Orders'}
          </h4>
          <p className="text-gray-600 mb-4">
            {language === 'fr'
              ? 'Produits extraits automatiquement des commandes existantes'
              : 'Products automatically extracted from existing orders'
            }
          </p>
          <div className="grid gap-3">
            {productsFromOrders.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h5 className="font-medium">{product.productName}</h5>
                      <p className="text-sm text-gray-600">
                        Pack Quantity: {product.packQuantity} | Original: {product.originalTitle}
                      </p>
                      {product.sku && (
                        <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {product.hasCommission ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {language === 'fr' ? 'Configuré' : 'Configured'}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => createCommissionFromOrderProduct(product)}
                      className="flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{language === 'fr' ? 'Configurer' : 'Configure'}</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Configured Products List */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4">
          {language === 'fr' ? 'Produits Configurés' : 'Configured Products'}
        </h4>
        <div className="grid gap-4">
        {products.map((product) => (
          <Card key={product.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="text-lg font-semibold">{product.productName}</h4>
                <p className="text-gray-600 mb-3">Pack Quantity: {product.packQuantity}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Base Commission (1500+)</p>
                    <p className="text-green-600 font-semibold">{product.commissionCriteria.baseCommissions.orders1500Plus} DA</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">78% Tier</p>
                    <p className="text-blue-600 font-semibold">{product.commissionCriteria.confirmationTiers.tier78Percent} DA</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">80% Tier</p>
                    <p className="text-blue-600 font-semibold">{product.commissionCriteria.confirmationTiers.tier80Percent} DA</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">82% Tier</p>
                    <p className="text-blue-600 font-semibold">{product.commissionCriteria.confirmationTiers.tier82Percent} DA</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Upsell Bonus</p>
                    <p className="text-purple-600 font-semibold">
                      {product.commissionCriteria.bonusCommissions.upsell.commission} DA 
                      <span className="text-gray-500 ml-1">
                        (≥{product.commissionCriteria.bonusCommissions.upsell.minPercent}%)
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Pack 2 Bonus</p>
                    <p className="text-purple-600 font-semibold">
                      {product.commissionCriteria.bonusCommissions.pack2.commission} DA 
                      <span className="text-gray-500 ml-1">
                        (≥{product.commissionCriteria.bonusCommissions.pack2.minPercent}%)
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Pack 4 Bonus</p>
                    <p className="text-purple-600 font-semibold">
                      {product.commissionCriteria.bonusCommissions.pack4.commission} DA 
                      <span className="text-gray-500 ml-1">
                        (≥{product.commissionCriteria.bonusCommissions.pack4.minPercent}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProduct(product)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteProduct(product.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        </div>
      </Card>

      {/* Add/Edit Product Modal */}
      {(showAddProduct || editingProduct) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {editingProduct 
                  ? (language === 'fr' ? 'Modifier Produit' : 'Edit Product')
                  : (language === 'fr' ? 'Ajouter Produit' : 'Add Product')
                }
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddProduct(false);
                  setEditingProduct(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'fr' ? 'Nom du Produit' : 'Product Name'}
                  </label>
                  <Input
                    value={editingProduct ? editingProduct.productName : newProduct.productName}
                    onChange={(e) => {
                      if (editingProduct) {
                        setEditingProduct({...editingProduct, productName: e.target.value});
                      } else {
                        setNewProduct({...newProduct, productName: e.target.value});
                      }
                    }}
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'fr' ? 'Quantité Pack' : 'Pack Quantity'}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    value={editingProduct ? editingProduct.packQuantity : newProduct.packQuantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (editingProduct) {
                        setEditingProduct({...editingProduct, packQuantity: value});
                      } else {
                        setNewProduct({...newProduct, packQuantity: value});
                      }
                    }}
                  />
                </div>
              </div>

              {/* Commission Configuration */}
              <div className="space-y-6">
                <h4 className="text-lg font-medium border-b pb-2">Commission Configuration</h4>
                
                {/* Base Commission */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Commission (1500+ orders)
                  </label>
                  <Input
                    type="number"
                    value={editingProduct 
                      ? editingProduct.commissionCriteria.baseCommissions.orders1500Plus 
                      : newProduct.commissionCriteria.baseCommissions.orders1500Plus
                    }
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (editingProduct) {
                        setEditingProduct({
                          ...editingProduct,
                          commissionCriteria: {
                            ...editingProduct.commissionCriteria,
                            baseCommissions: { orders1500Plus: value }
                          }
                        });
                      } else {
                        setNewProduct({
                          ...newProduct,
                          commissionCriteria: {
                            ...newProduct.commissionCriteria,
                            baseCommissions: { orders1500Plus: value }
                          }
                        });
                      }
                    }}
                  />
                </div>

                {/* Confirmation Tiers */}
                <div>
                  <h5 className="font-medium mb-3">Confirmation Rate Tiers</h5>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        78% Confirmation
                      </label>
                      <Input
                        type="number"
                        value={editingProduct 
                          ? editingProduct.commissionCriteria.confirmationTiers.tier78Percent 
                          : newProduct.commissionCriteria.confirmationTiers.tier78Percent
                        }
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          if (editingProduct) {
                            setEditingProduct({
                              ...editingProduct,
                              commissionCriteria: {
                                ...editingProduct.commissionCriteria,
                                confirmationTiers: {
                                  ...editingProduct.commissionCriteria.confirmationTiers,
                                  tier78Percent: value
                                }
                              }
                            });
                          } else {
                            setNewProduct({
                              ...newProduct,
                              commissionCriteria: {
                                ...newProduct.commissionCriteria,
                                confirmationTiers: {
                                  ...newProduct.commissionCriteria.confirmationTiers,
                                  tier78Percent: value
                                }
                              }
                            });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        80% Confirmation
                      </label>
                      <Input
                        type="number"
                        value={editingProduct 
                          ? editingProduct.commissionCriteria.confirmationTiers.tier80Percent 
                          : newProduct.commissionCriteria.confirmationTiers.tier80Percent
                        }
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          if (editingProduct) {
                            setEditingProduct({
                              ...editingProduct,
                              commissionCriteria: {
                                ...editingProduct.commissionCriteria,
                                confirmationTiers: {
                                  ...editingProduct.commissionCriteria.confirmationTiers,
                                  tier80Percent: value
                                }
                              }
                            });
                          } else {
                            setNewProduct({
                              ...newProduct,
                              commissionCriteria: {
                                ...newProduct.commissionCriteria,
                                confirmationTiers: {
                                  ...newProduct.commissionCriteria.confirmationTiers,
                                  tier80Percent: value
                                }
                              }
                            });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        82% Confirmation
                      </label>
                      <Input
                        type="number"
                        value={editingProduct 
                          ? editingProduct.commissionCriteria.confirmationTiers.tier82Percent 
                          : newProduct.commissionCriteria.confirmationTiers.tier82Percent
                        }
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          if (editingProduct) {
                            setEditingProduct({
                              ...editingProduct,
                              commissionCriteria: {
                                ...editingProduct.commissionCriteria,
                                confirmationTiers: {
                                  ...editingProduct.commissionCriteria.confirmationTiers,
                                  tier82Percent: value
                                }
                              }
                            });
                          } else {
                            setNewProduct({
                              ...newProduct,
                              commissionCriteria: {
                                ...newProduct.commissionCriteria,
                                confirmationTiers: {
                                  ...newProduct.commissionCriteria.confirmationTiers,
                                  tier82Percent: value
                                }
                              }
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bonus Commissions */}
                <div>
                  <h5 className="font-medium mb-3">Bonus Commissions</h5>
                  <div className="space-y-4">
                    {/* Upsell */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upsell Commission
                        </label>
                        <Input
                          type="number"
                          value={editingProduct 
                            ? editingProduct.commissionCriteria.bonusCommissions.upsell.commission 
                            : newProduct.commissionCriteria.bonusCommissions.upsell.commission
                          }
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            if (editingProduct) {
                              setEditingProduct({
                                ...editingProduct,
                                commissionCriteria: {
                                  ...editingProduct.commissionCriteria,
                                  bonusCommissions: {
                                    ...editingProduct.commissionCriteria.bonusCommissions,
                                    upsell: {
                                      ...editingProduct.commissionCriteria.bonusCommissions.upsell,
                                      commission: value
                                    }
                                  }
                                }
                              });
                            } else {
                              setNewProduct({
                                ...newProduct,
                                commissionCriteria: {
                                  ...newProduct.commissionCriteria,
                                  bonusCommissions: {
                                    ...newProduct.commissionCriteria.bonusCommissions,
                                    upsell: {
                                      ...newProduct.commissionCriteria.bonusCommissions.upsell,
                                      commission: value
                                    }
                                  }
                                }
                              });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Min Upsell % Required
                        </label>
                        <Input
                          type="number"
                          value={editingProduct 
                            ? editingProduct.commissionCriteria.bonusCommissions.upsell.minPercent 
                            : newProduct.commissionCriteria.bonusCommissions.upsell.minPercent
                          }
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            if (editingProduct) {
                              setEditingProduct({
                                ...editingProduct,
                                commissionCriteria: {
                                  ...editingProduct.commissionCriteria,
                                  bonusCommissions: {
                                    ...editingProduct.commissionCriteria.bonusCommissions,
                                    upsell: {
                                      ...editingProduct.commissionCriteria.bonusCommissions.upsell,
                                      minPercent: value
                                    }
                                  }
                                }
                              });
                            } else {
                              setNewProduct({
                                ...newProduct,
                                commissionCriteria: {
                                  ...newProduct.commissionCriteria,
                                  bonusCommissions: {
                                    ...newProduct.commissionCriteria.bonusCommissions,
                                    upsell: {
                                      ...newProduct.commissionCriteria.bonusCommissions.upsell,
                                      minPercent: value
                                    }
                                  }
                                }
                              });
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Pack 2 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pack 2 Commission
                        </label>
                        <Input
                          type="number"
                          value={editingProduct 
                            ? editingProduct.commissionCriteria.bonusCommissions.pack2.commission 
                            : newProduct.commissionCriteria.bonusCommissions.pack2.commission
                          }
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            if (editingProduct) {
                              setEditingProduct({
                                ...editingProduct,
                                commissionCriteria: {
                                  ...editingProduct.commissionCriteria,
                                  bonusCommissions: {
                                    ...editingProduct.commissionCriteria.bonusCommissions,
                                    pack2: {
                                      ...editingProduct.commissionCriteria.bonusCommissions.pack2,
                                      commission: value
                                    }
                                  }
                                }
                              });
                            } else {
                              setNewProduct({
                                ...newProduct,
                                commissionCriteria: {
                                  ...newProduct.commissionCriteria,
                                  bonusCommissions: {
                                    ...newProduct.commissionCriteria.bonusCommissions,
                                    pack2: {
                                      ...newProduct.commissionCriteria.bonusCommissions.pack2,
                                      commission: value
                                    }
                                  }
                                }
                              });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Min Pack 2 % Required
                        </label>
                        <Input
                          type="number"
                          value={editingProduct 
                            ? editingProduct.commissionCriteria.bonusCommissions.pack2.minPercent 
                            : newProduct.commissionCriteria.bonusCommissions.pack2.minPercent
                          }
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            if (editingProduct) {
                              setEditingProduct({
                                ...editingProduct,
                                commissionCriteria: {
                                  ...editingProduct.commissionCriteria,
                                  bonusCommissions: {
                                    ...editingProduct.commissionCriteria.bonusCommissions,
                                    pack2: {
                                      ...editingProduct.commissionCriteria.bonusCommissions.pack2,
                                      minPercent: value
                                    }
                                  }
                                }
                              });
                            } else {
                              setNewProduct({
                                ...newProduct,
                                commissionCriteria: {
                                  ...newProduct.commissionCriteria,
                                  bonusCommissions: {
                                    ...newProduct.commissionCriteria.bonusCommissions,
                                    pack2: {
                                      ...newProduct.commissionCriteria.bonusCommissions.pack2,
                                      minPercent: value
                                    }
                                  }
                                }
                              });
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Pack 4 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pack 4 Commission
                        </label>
                        <Input
                          type="number"
                          value={editingProduct 
                            ? editingProduct.commissionCriteria.bonusCommissions.pack4.commission 
                            : newProduct.commissionCriteria.bonusCommissions.pack4.commission
                          }
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            if (editingProduct) {
                              setEditingProduct({
                                ...editingProduct,
                                commissionCriteria: {
                                  ...editingProduct.commissionCriteria,
                                  bonusCommissions: {
                                    ...editingProduct.commissionCriteria.bonusCommissions,
                                    pack4: {
                                      ...editingProduct.commissionCriteria.bonusCommissions.pack4,
                                      commission: value
                                    }
                                  }
                                }
                              });
                            } else {
                              setNewProduct({
                                ...newProduct,
                                commissionCriteria: {
                                  ...newProduct.commissionCriteria,
                                  bonusCommissions: {
                                    ...newProduct.commissionCriteria.bonusCommissions,
                                    pack4: {
                                      ...newProduct.commissionCriteria.bonusCommissions.pack4,
                                      commission: value
                                    }
                                  }
                                }
                              });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Min Pack 4 % Required
                        </label>
                        <Input
                          type="number"
                          value={editingProduct 
                            ? editingProduct.commissionCriteria.bonusCommissions.pack4.minPercent 
                            : newProduct.commissionCriteria.bonusCommissions.pack4.minPercent
                          }
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            if (editingProduct) {
                              setEditingProduct({
                                ...editingProduct,
                                commissionCriteria: {
                                  ...editingProduct.commissionCriteria,
                                  bonusCommissions: {
                                    ...editingProduct.commissionCriteria.bonusCommissions,
                                    pack4: {
                                      ...editingProduct.commissionCriteria.bonusCommissions.pack4,
                                      minPercent: value
                                    }
                                  }
                                }
                              });
                            } else {
                              setNewProduct({
                                ...newProduct,
                                commissionCriteria: {
                                  ...newProduct.commissionCriteria,
                                  bonusCommissions: {
                                    ...newProduct.commissionCriteria.bonusCommissions,
                                    pack4: {
                                      ...newProduct.commissionCriteria.bonusCommissions.pack4,
                                      minPercent: value
                                    }
                                  }
                                }
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddProduct(false);
                    setEditingProduct(null);
                  }}
                >
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </Button>
                <Button
                  onClick={() => saveProduct(editingProduct || newProduct)}
                  disabled={loading}
                  className="flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : (language === 'fr' ? 'Sauvegarder' : 'Save')}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}