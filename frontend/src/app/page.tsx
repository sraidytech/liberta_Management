'use client'

import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/lib/language-context';
import Link from 'next/link';
import { ArrowRight, Zap, Users, BarChart3, Sparkles } from 'lucide-react';

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6 lg:p-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            LibertaPhonix
          </span>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-16 lg:py-24">
        <div className="text-center max-w-6xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 text-sm font-medium text-gray-700 mb-8 shadow-lg">
            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
            {t('intelligentAssignment')}
          </div>

          {/* Main heading */}
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight">
            <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 bg-clip-text text-transparent">
              {t('homeTitle')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl lg:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
            {t('homeSubtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
            <Link href="/auth/login">
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center">
                {t('getStarted')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            </Link>
            <Link href="/docs">
              <button className="bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 hover:bg-opacity-30 text-gray-700 px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center">
                {t('learnMore')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Feature 1 */}
          <div className="bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 rounded-2xl p-8 hover:bg-opacity-30 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {t('ecoManagerIntegration')}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {t('ecoManagerDescription')}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 rounded-2xl p-8 hover:bg-opacity-30 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {t('intelligentAssignment')}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {t('intelligentAssignmentDescription')}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 rounded-2xl p-8 hover:bg-opacity-30 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl md:col-span-2 lg:col-span-1">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {t('realTimeTracking')}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {t('realTimeTrackingDescription')}
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-24 grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          <div className="text-center bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">3000+</div>
            <div className="text-gray-600 font-medium">Commandes/jour</div>
          </div>
          <div className="text-center bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">99.9%</div>
            <div className="text-gray-600 font-medium">Disponibilité</div>
          </div>
          <div className="text-center bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">50+</div>
            <div className="text-gray-600 font-medium">Agents</div>
          </div>
          <div className="text-center bg-white bg-opacity-20 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <div className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">24/7</div>
            <div className="text-gray-600 font-medium">Support</div>
          </div>
        </div>
      </main>
    </div>
  )
}