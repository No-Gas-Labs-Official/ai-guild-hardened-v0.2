import './globals.css'
import { SuietProvider } from '@suiet/wallet-kit'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-mono">
        <SuietProvider>
          {children}
        </SuietProvider>
      </body>
    </html>
  )
}