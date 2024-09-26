import { useState, useEffect } from 'react'

import {
  install7579Module,
  scheduleTransfer,
} from '@/lib/scheduledTransfers'
import { SMART_SESSIONS_ADDRESS } from '@rhinestone/module-sdk'
import { SafeSmartAccountClient } from '@/lib/permissionless'
import { SessionKeyTransaction, install7579SessionModule } from '@/lib/smartSession'

const SessionKeyForm: React.FC<{ safe: SafeSmartAccountClient }> = ({
  safe
}) => {
  const [recipient, setRecipient] = useState('')
  const [txHash, setTxHash] = useState('')
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
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '40px',
          marginBottom: '40px'
        }}
      >
        <button
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            setError(false)

            await (!is7579Installed ? install7579SessionModule : SessionKeyTransaction)(
              safe,
            )
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
