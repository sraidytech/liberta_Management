'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/lib/language-context';
import { Star, MessageSquare, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface SatisfactionSurveyFormProps {
  orderId: string;
  orderReference: string;
  existingSurvey?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SatisfactionSurveyForm({
  orderId,
  orderReference,
  existingSurvey,
  onSuccess,
  onCancel
}: SatisfactionSurveyFormProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  
  const [ratings, setRatings] = useState({
    overallRating: existingSurvey?.overallRating || 0,
    deliverySpeedRating: existingSurvey?.deliverySpeedRating || 0,
    productQualityRating: existingSurvey?.productQualityRating || 0,
    agentServiceRating: existingSurvey?.agentServiceRating || 0,
    packagingRating: existingSurvey?.packagingRating || 0,
  });
  
  const [customerComments, setCustomerComments] = useState(existingSurvey?.customerComments || '');
  const [internalNotes, setInternalNotes] = useState(existingSurvey?.internalNotes || '');
  const [submitting, setSubmitting] = useState(false);

  const ratingCategories = [
    { key: 'overallRating', label: t('overallSatisfaction'), icon: Star },
    { key: 'deliverySpeedRating', label: t('deliverySpeed'), icon: CheckCircle },
    { key: 'productQualityRating', label: t('productQuality'), icon: Star },
    { key: 'agentServiceRating', label: t('agentService'), icon: Star },
    { key: 'packagingRating', label: t('packaging'), icon: Star },
  ];

  const handleRatingChange = (category: string, value: number) => {
    setRatings(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async () => {
    // Check if at least one rating is provided
    const hasAnyRating = Object.values(ratings).some(r => r > 0);
    
    if (!hasAnyRating) {
      showToast({
        type: 'warning',
        title: t('warning'),
        message: t('provideAtLeastOneRating')
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const url = existingSurvey
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/satisfaction-surveys/${orderId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/satisfaction-surveys`;
      
      const method = existingSurvey ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId,
          ...ratings,
          customerComments: customerComments.trim() || undefined,
          internalNotes: internalNotes.trim() || undefined,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to save survey');
      }

      showToast({
        type: 'success',
        title: t('success'),
        message: existingSurvey ? t('surveyUpdatedSuccessfully') : t('surveySavedSuccessfully')
      });

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error saving survey:', error);
      showToast({
        type: 'error',
        title: t('error'),
        message: error.message || t('failedToSaveSurvey')
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarRating = (category: string, value: number) => {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingChange(category, star)}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={`w-8 h-8 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600 self-center">
          {value > 0 ? `${value}/5` : t('notRated')}
        </span>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {t('customerSatisfactionSurvey')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {t('order')}: {orderReference}
            </p>
            {existingSurvey && (
              <p className="text-xs text-blue-600 mt-1">
                {t('version')} {existingSurvey.surveyVersion} • {t('lastUpdated')}: {new Date(existingSurvey.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
          {existingSurvey && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{t('surveyCollected')}</span>
            </div>
          )}
        </div>

        {/* Rating Categories */}
        <div className="space-y-4">
          {ratingCategories.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">{label}</span>
              </div>
              {renderStarRating(key, ratings[key as keyof typeof ratings])}
            </div>
          ))}
        </div>

        {/* Customer Comments */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="w-4 h-4" />
            {t('customerComments')} ({t('optional')})
          </label>
          <textarea
            value={customerComments}
            onChange={(e) => setCustomerComments(e.target.value)}
            placeholder={t('enterCustomerFeedback')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
          />
        </div>

        {/* Internal Notes */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-4 h-4" />
            {t('internalNotes')} ({t('optional')} - {t('privateNotes')})
          </label>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder={t('addInternalNotes')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Warning for low ratings */}
        {ratings.overallRating > 0 && ratings.overallRating < 3 && (
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">{t('lowRatingDetected')}</p>
              <p className="text-xs text-yellow-700 mt-1">
                {t('lowRatingWarning')}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
              className="flex-1"
            >
              {t('cancel')}
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting ? t('saving') : existingSurvey ? t('updateSurvey') : t('saveSurvey')}
          </Button>
        </div>
      </div>
    </Card>
  );
}