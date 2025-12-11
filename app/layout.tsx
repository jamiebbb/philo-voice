import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Philo | Voice Knowledge Assistant',
  description: 'Speak with wisdom from the ancient texts. Philo is your AI research companion.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}

