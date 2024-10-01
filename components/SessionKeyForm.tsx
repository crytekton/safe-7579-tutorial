import { useState, useEffect } from 'react'

import { SMART_SESSIONS_ADDRESS } from '@rhinestone/module-sdk'
import { SafeSmartAccountClient } from '@/lib/permissionless'
import { install7579SessionModule, passkeySign, sessionKeyMint, sessionKeyTransfer } from '@/lib/smartSession'

const SessionKeyForm: React.FC<{ safe: SafeSmartAccountClient }> = ({
  safe
}) => {
  const [txHash, setTxHash] = useState('' as `0x${string}`)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [is7579Installed, setIs7579Installed] = useState(false)

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

  return (
    <>
      <div style={{ marginTop: '40px' }}>Your Safe: {safe.account.address}</div>{' '}
      <div style={{ marginTop: '10px' }}>
        ERC-7579 module installed:{' '}
        {is7579Installed
          ? 'Yes ✅'
          : 'No, Click to create a session key'}{' '}
      </div>
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '40px',
          marginBottom: '40px'
        }}
      >
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
        <button
          disabled={loading || !is7579Installed}
          onClick={async () => {
            setLoading(true)
            setError(false)

            sessionKeyTransfer(safe)
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
          Transfer USDT
        </button>
        <button
          disabled={loading || !is7579Installed}
          onClick={async () => {
            setLoading(true)
            setError(false)

            passkeySign(safe)
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
          Mint with passkey
        </button>
      </div>
      
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
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
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
