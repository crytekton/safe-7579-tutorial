import { useState, useEffect } from 'react'

import { SMART_SESSIONS_ADDRESS } from '@rhinestone/module-sdk'
import { SafeSmartAccountClient } from '@/lib/permissionless'
import { createSession } from '@/lib/smartSession'
import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core'

const SessionKeyFormCreate: React.FC<{ safe: SafeSmartAccountClient }> = ({
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
    <>{ is7579Installed ? (<>
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
          disabled={loading || !is7579Installed}
          onClick={async () => {
            setLoading(true)
            setError(false)

            await ( createSession)(
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
          {!is7579Installed ? "Please setup the session" : "Execute a transaction"}
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
</>): null}</>
  )
}

export default SessionKeyFormCreate
