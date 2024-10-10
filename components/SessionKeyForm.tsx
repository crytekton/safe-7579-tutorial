import { useState, useEffect } from 'react'

import { SMART_SESSIONS_ADDRESS } from '@rhinestone/module-sdk'
import { SafeSmartAccountClient } from '@/lib/permissionless'
import { createSession, install7579SessionModule, sessionKeyMint, sessionKeyTransfer, sessionKeyTransferLimit } from '@/lib/smartSession'
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { Wallet, useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core'
import { Hex } from 'viem'

const SessionKeyForm: React.FC<{ safe: SafeSmartAccountClient }> = ({
  safe
}) => {
  const [txHash, setTxHash] = useState('' as `0x${string}`)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [provider, setProvider] = useState<Wallet | null>()
  const [is7579Installed, setIs7579Installed] = useState(false)
  const [to, setTo] = useState('')
  const [value, setValue] = useState(0)
  const { primaryWallet } = useDynamicContext()
  const isLoggedIn = useIsLoggedIn()

  useEffect(() => {
    const init7579Module = async () => {
      const isModuleInstalled = await safe
        .isModuleInstalled({
          type: 'validator',
          address: SMART_SESSIONS_ADDRESS,
          context: '0x'
        })
        .catch(() => false)
      if (isModuleInstalled) {
        setIs7579Installed(true)
      }
    }
    void init7579Module()
  }, [safe])

  useEffect(() => {
    const init = async () => {
      if (isLoggedIn && primaryWallet && isEthereumWallet(primaryWallet)) {
        setProvider(primaryWallet)
      }
    }
    init()
  }, [isLoggedIn, primaryWallet])

  return (
    <>
      <div style={{ marginTop: '40px' }}>Your Safe: {safe.account.address}</div>{' '}
      <div style={{ marginTop: '10px' }}>
        ERC-7579 module installed:{' '}
        {is7579Installed
          ? 'Yes ✅'
          : 'No, Click to create a session key'}{' '}
      </div>
      <div>
        <button
          disabled={loading || is7579Installed}
          onClick={async () => {
            setLoading(true)
            setError(false)

            install7579SessionModule(safe)
              .then(txHash => {
                setTxHash(txHash)
                setLoading(false)
                setIs7579Installed(true)
              })
              .catch(err => {
                console.error(err)
                setLoading(false)
                setError(true)
              })
          }}
        >
          Setup the session
        </button>
      </div>
      <div>
        <button
          disabled={loading || !is7579Installed}
          onClick={async () => {
            setLoading(true)
            setError(false)

            createSession(safe, provider!)
              .then(txHash => {
                setTxHash(txHash)
                setLoading(false)
                setIs7579Installed(true)
              })
              .catch(err => {
                console.error(err)
                setLoading(false)
                setError(true)
              })
          }}
        >
          Create a new session
        </button>
      </div>
      <div>
        <button
          disabled={loading || !is7579Installed}
          onClick={async () => {
            setLoading(true)
            setError(false)

            sessionKeyMint(safe)
              .then(txHash => {
                setTxHash(txHash)
                setLoading(false)
              })
              .catch(err => {
                console.error(err)
                setLoading(false)
                setError(true)
              })
          }}
        >
          Mint USDT
        </button>
      </div>
      <div>
        To: <input name='to' onChange={(e) => setTo(e.target.value)}></input>
        Value: <input name='to' onChange={(e) => setValue(Number(e.target.value))}></input>
        <button
          disabled={loading || !is7579Installed}
          onClick={async () => {
            setLoading(true)
            setError(false)
            setTxHash('' as Hex)
            sessionKeyTransfer(safe, to as Hex, BigInt(value*10**18))
              .then(txHash => {
                setTxHash(txHash)
                setLoading(false)
                setError(false)
              })
              .catch(err => {
                console.error(err)
                setLoading(false)
                setError(true)
              })
          }}
        >
          Transfer Token
        </button>
        </div>
        {/* <div>
        To: <input name='to' onChange={(e) => setTo(e.target.value)}></input>
        Value: <input name='to' onChange={(e) => setValue(Number(e.target.value))}></input>
        <button
          disabled={loading || !is7579Installed}
          onClick={async () => {
            setLoading(true)
            setError(false)
            setTxHash('' as Hex)
            sessionKeyTransferLimit(safe, to as Hex, BigInt(value))
              .then(txHash => {
                setTxHash(txHash)
                setLoading(false)
                setError(false)
              })
              .catch(err => {
                console.error(err)
                setLoading(false)
                setError(true)
              })
          }}
        >
          Transfer Token (Limited)
        </button>
        </div> */}
        {/* <div>
        <button
          disabled={loading || !is7579Installed}
          onClick={async () => {
            setLoading(true)
            setError(false)

            createSession(safe, provider!)
              .then(txHash => {
                setTxHash(txHash!)
                setLoading(false)
                setError(false)
              })
              .catch(err => {
                console.error(err)
                setLoading(false)
                setError(true)
              })
          }}
        >
          Create new session
        </button>
      </div> */}
      
      <div>
        {loading ? <p>Processing, please wait...</p> : null}
        {error ? (
          <p>
            There was an error processing the transaction. Please try again.
          </p>
        ) : null}
        {txHash ? (
          <>
            <p>
              Success!{' '}
              <a
                href={`https://base-sepolia.blockscout.com/tx/${txHash}`}
                target='_blank'
                rel='noreferrer'
                style={{
                  textDecoration: 'underline',
                  fontSize: '14px'
                }}
              >
                View on Etherscan
              </a>
            </p>
          </>
        ) : null}
      </div>
    </>
  )
}

export default SessionKeyForm
