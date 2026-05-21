// @ts-ignore: allow importing css modules without type declarations
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'TrueNestAuto - Vehicle Analysis',
  description: 'AI-powered vehicle inventory analysis and MarketCheck integration.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
