import { useState, useEffect } from 'react';

interface DateRange {
  from?: string;
  to?: string;
}

export function useSatisfactionAnalytics(filters: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.startDate) params.append('dateFrom', filters.startDate);
      if (filters.endDate) params.append('dateTo', filters.endDate);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/satisfaction-analytics/analytics?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch satisfaction analytics');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching satisfaction analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: fetchData };
}