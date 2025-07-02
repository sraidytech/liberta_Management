'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { useToast } from '@/components/ui/toast';
import { 
  Package, 
  Plus, 
  X, 
  Search, 
  Loader2, 
  AlertCircle,
  Check
} from 'lucide-react';

interface ProductAssignmentProps {
  userId?: string; // Optional for create mode
  onAssignmentsChange?: (assignments: string[]) => void;
  initialAssignments?: string[];
}

export default function ProductAssignment({ 
  userId, 
  onAssignmentsChange, 
  initialAssignments = [] 
}: ProductAssignmentProps) {
  const { language } = useLanguage();
  const { showToast } = useToast();
  
  const [availableProducts, setAvailableProducts] = useState<string[]>([]);
  const [assignedProducts, setAssignedProducts] = useState<string[]>(initialAssignments);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch available products
  const fetchAvailableProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product-assignments/available-products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch products');
      }

      if (data.success) {
        setAvailableProducts(data.data);
      }
    } catch (error: any) {
      console.error('Fetch products error:', error);
      setError(error.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's current assignments if userId is provided
  const fetchUserAssignments = async () => {
    if (!userId) return;

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product-assignments/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch user assignments');
      }

      if (data.success) {
        setAssignedProducts(data.data);
        onAssignmentsChange?.(data.data);
      }
    } catch (error: any) {
      console.error('Fetch user assignments error:', error);
      setError(error.message || 'Failed to fetch user assignments');
    }
  };

  // Save assignments
  const saveAssignments = async () => {
    if (!userId) {
      // For create mode, just notify parent component
      onAssignmentsChange?.(assignedProducts);
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product-assignments/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          productNames: assignedProducts
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to save assignments');
      }

      if (data.success) {
        showToast({
          type: 'success',
          title: language === 'fr' ? 'Assignations sauvegardées' : 'Assignments saved',
          message: language === 'fr' ? 'Les assignations de produits ont été sauvegardées' : 'Product assignments have been saved'
        });
        onAssignmentsChange?.(assignedProducts);
      }
    } catch (error: any) {
      console.error('Save assignments error:', error);
      showToast({
        type: 'error',
        title: language === 'fr' ? 'Erreur de sauvegarde' : 'Save error',
        message: error.message || 'Failed to save assignments'
      });
    } finally {
      setSaving(false);
    }
  };

  // Add product to assignments
  const addProduct = (productName: string) => {
    if (!assignedProducts.includes(productName)) {
      const newAssignments = [...assignedProducts, productName];
      setAssignedProducts(newAssignments);
      onAssignmentsChange?.(newAssignments);
    }
  };

  // Remove product from assignments
  const removeProduct = (productName: string) => {
    const newAssignments = assignedProducts.filter(p => p !== productName);
    setAssignedProducts(newAssignments);
    onAssignmentsChange?.(newAssignments);
  };

  // Filter available products based on search
  const filteredProducts = availableProducts.filter(product =>
    product.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !assignedProducts.includes(product)
  );

  useEffect(() => {
    fetchAvailableProducts();
    if (userId) {
      fetchUserAssignments();
    }
  }, [userId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Package className="w-5 h-5 mr-2 text-blue-600" />
          {language === 'fr' ? 'Assignation de Produits' : 'Product Assignment'}
        </h3>
        {userId && (
          <button
            onClick={saveAssignments}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>{language === 'fr' ? 'Sauvegarder' : 'Save'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-200 rounded-md flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Assigned Products */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {language === 'fr' ? 'Produits Assignés' : 'Assigned Products'} ({assignedProducts.length})
        </label>
        <div className="min-h-[100px] p-3 bg-gray-50 border border-gray-200 rounded-md">
          {assignedProducts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              {language === 'fr' ? 'Aucun produit assigné' : 'No products assigned'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assignedProducts.map((product) => (
                <span
                  key={product}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {product}
                  <button
                    onClick={() => removeProduct(product)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Available Products */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {language === 'fr' ? 'Produits Disponibles' : 'Available Products'}
        </label>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={language === 'fr' ? 'Rechercher des produits...' : 'Search products...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Products List */}
        <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-md">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">
                {language === 'fr' ? 'Chargement...' : 'Loading...'}
              </span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              {searchTerm 
                ? (language === 'fr' ? 'Aucun produit trouvé' : 'No products found')
                : (language === 'fr' ? 'Tous les produits sont assignés' : 'All products are assigned')
              }
            </p>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <button
                  key={product}
                  onClick={() => addProduct(product)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
                >
                  <span className="text-sm text-gray-900">{product}</span>
                  <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}