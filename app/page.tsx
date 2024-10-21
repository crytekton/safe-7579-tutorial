'use client'

import { useEffect, useState } from 'react'

import {
  SafeSmartAccountClient,
  getSmartAccountClient,
  publicClient,
} from '../lib/permissionless'

import SessionKeyForm from '@/components/SessionKeyForm'
import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core'
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { Client, Hex, erc20Abi, formatEther } from 'viem'
import { usdtAddress } from '@/lib/smartSession'



export default function Home() {
  const [safe, setSafe] = useState<SafeSmartAccountClient | undefined>()
  const [provider, setProvider] = useState<Client | null>()
  const [balance, setBalance] = useState('0')
  const [balanceERC20, setBalanceERC20] = useState('0')
  const { primaryWallet } = useDynamicContext()
  const isLoggedIn = useIsLoggedIn()

  useEffect(() => {
    const init = async () => {
      console.log(isLoggedIn)
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
    const unwatch = publicClient.watchBlocks(
      {
        onBlock: async () => {
          const balance = await publicClient.getBalance({ address: safe.account.address as Hex })
          setBalance(formatEther(balance))
          console.log(balance)
          const erc20Balance = await publicClient.readContract({
            address: usdtAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [safe.account.address]
          })
          console.log(erc20Balance)
          setBalanceERC20(formatEther(erc20Balance))
        }
      }
    )
  }

  return !isLoggedIn ? null : (
    <>
      {safe == null ? (
        <>

          <button onClick={handleLoadSafe} style={{ marginTop: '40px' }}>
            Create Safe
          </button>
        </>
      ) : (
        <>
          Current balance: { balance } ETH
          Current balance: { balanceERC20 } USD
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
