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
  const [nonce, setNonce] = useState(0n)
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

  const handleInputChange = (event: { target: { value: string } }) => {
    setNonce(BigInt(event.target.value));
  };
  const handleLoadSafe = async () => {
    if (!provider) {
      return
    }
    const { safe, nonce: new_nonce } = await getSmartAccountClient(provider, nonce)
    setSafe(safe)
    setNonce(new_nonce)
    console.log(nonce)
    const unwatch = publicClient.watchBlocks(
      {
        onBlock: async () => {
          const balance = await publicClient.getBalance({ address: safe.account.address as Hex })
          setBalance(formatEther(balance))
          const erc20Balance = await publicClient.readContract({
            address: usdtAddress,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [safe.account.address]
          })
          setBalanceERC20(formatEther(erc20Balance))
        }
      }
    )
  }

  return !isLoggedIn ? null : (
    <>
      {safe == null ? (
        <>
          <div>
            <button onClick={handleLoadSafe} style={{ margin: '5px' }}>
              Create Safe
            </button>
          </div>

          <div>
            <input
              type="text"
              value={nonce.toString()}
              onChange={handleInputChange}
              placeholder="Enter value"
              style={{ margin: '5px' }}
            />
            <button onClick={handleLoadSafe} style={{ margin: '5px' }}>
              Load Safe
            </button>
          </div>

        </>
      ) : (
        <>
          <div>
            Current balance: {balance} ETH
          </div>
          <div>
            Current balance: {balanceERC20} USD
          </div>
          <div>
            Safe nonce {nonce.toString()}
          </div>
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
