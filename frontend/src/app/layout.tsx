import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/lib/language-context'
import { ToastProvider } from '@/components/ui/toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LibertaPhonix - Order Management System',
  description: 'Modern order management system for efficient business operations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <ToastProvider>
            <div className="min-h-screen bg-background">
              {children}
            </div>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}