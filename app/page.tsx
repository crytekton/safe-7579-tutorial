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
    <div style={styles.container}>
      {safe == null ? (
        <>
          <div style={styles.card}>
            <h2 style={styles.heading}>Create or Load a Safe</h2>
            <div style={styles.inputContainer}>
              <button onClick={handleLoadSafe} style={styles.button}>
                Create Safe
              </button>
              <input
                type="text"
                value={nonce.toString()}
                onChange={handleInputChange}
                placeholder="Enter nonce"
                style={styles.input}
              />
              <button onClick={handleLoadSafe} style={styles.button}>
                Load Safe
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={styles.card}>
            <h2 style={styles.heading}>Safe Details</h2>
            <div style={styles.infoContainer}>
              <p style={styles.infoText}>Current Balance: <strong>{balance} ETH</strong></p>
              <p style={styles.infoText}>USDT Balance: <strong>{balanceERC20} USD</strong></p>
              <p style={styles.infoText}>Safe Nonce: <strong>{nonce.toString()}</strong></p>
            </div>
          </div>

          <div style={styles.card}>
            <SessionKeyForm safe={safe} />
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: '100vh',
  },
  card: {
    width: '100%',
    maxWidth: '600px',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  heading: {
    fontSize: '1.5rem',
    marginBottom: '15px',
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  input: {
    width: '80%',
    padding: '10px',
    margin: '10px 0',
    border: '1px solid #ccc',
    borderRadius: '5px',
  },
  button: {
    width: '80%',
    padding: '10px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginBottom: '10px',
  },
  infoContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  infoText: {
    fontSize: '1rem',
    margin: '10px 0',
  },
}
