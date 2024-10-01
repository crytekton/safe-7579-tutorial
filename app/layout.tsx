import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import ExternalLink from '../public/external-link.svg'
import Github from '../public/github.svg'
import Safe from '../public/safe.svg'
import './globals.css'

import { DynamicContextProvider, useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors, isEthereumWallet } from '@dynamic-labs/ethereum'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Safe Tutorial: ERC-7579',
  description: 'Generated by create next app'
}



export default function RootLayout ({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <nav
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '1rem'
          }}
        >
          <a href='https://safe.global'>
            <Safe width={95} height={36} />
          </a>
          <div style={{ display: 'flex' }}>
            <a
              href='https://docs.safe.global/advanced/erc-7579/tutorials/7579-tutorial'
              style={{
                display: 'flex',
                alignItems: 'center',
                marginRight: '1rem'
              }}
            >
              Read tutorial <ExternalLink style={{ marginLeft: '0.5rem' }} />
            </a>
            <a
              href='https://github.com/5afe/safe-tutorial-7579'
              style={{ display: 'flex', alignItems: 'center' }}
            >
              View on GitHub{' '}
              <Github width={24} height={24} style={{ marginLeft: '0.5rem' }} />
            </a>
          </div>
        </nav>
        <div style={{ width: '100%', textAlign: 'center' }}>
          <h1>Smart session</h1>

          <div>
            Create a new ERC-7579-compatible Safe Smart Account and delegate transaction signing
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginLeft: '40px',
            marginRight: '40px',
            flexDirection: 'column'
          }}
        >
          <DynamicContextProvider
  settings={{
    environmentId: '336e4f47-b1d1-44f3-bea0-129795426bfd',
    walletConnectors: [EthereumWalletConnectors],
    // Add other configuration options as needed
  }}
>{children}</DynamicContextProvider>
        </div>
      </body>
    </html>
  )
}
