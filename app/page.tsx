'use client'

import { useEffect, useState } from 'react'

import {
  SafeSmartAccountClient,
  getSmartAccountClient,
} from '../lib/permissionless'

import SessionKeyForm from '@/components/SessionKeyForm'
import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core'
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { Client } from 'viem'



export default function Home() {
  const [safe, setSafe] = useState<SafeSmartAccountClient | undefined>()
  const [provider, setProvider] = useState<Client | null>()
  const { primaryWallet } = useDynamicContext()
  const isLoggedIn = useIsLoggedIn()

  useEffect(() => {
    const init = async () => {
      if (isLoggedIn && primaryWallet && isEthereumWallet(primaryWallet)) {
        setProvider(await primaryWallet.getWalletClient())
      }
    }
    init()
  }, [isLoggedIn, primaryWallet])

  const handleLoadSafe = async () => {
    if (!provider) {
      return
    }
    console.log(provider)
    const safe = await getSmartAccountClient(provider)
    setSafe(safe)
  }

  return (
    <>
      {safe == null ? (
        <>

          <button onClick={handleLoadSafe} style={{ marginTop: '40px' }}>
            Create Safe
          </button>
        </>
      ) : (
        <>
          <SessionKeyForm safe={safe} />
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
          </div>
        </>
      )}
    </>
  )
}
