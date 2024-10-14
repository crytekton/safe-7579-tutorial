import { useState, useEffect } from 'react'

import { ActionData, SMART_SESSIONS_ADDRESS, Session } from '@rhinestone/module-sdk'
import { SafeSmartAccountClient } from '@/lib/permissionless'
import { defaultSession, install7579SessionModule, sessionKeyMint, sessionKeyTransfer, updateSession } from '@/lib/smartSession'
import { Hex } from 'viem'
import ActionTable from './actionTable'

const SessionKeyForm: React.FC<{ safe: SafeSmartAccountClient }> = ({
  safe
}) => {
  const [txHash, setTxHash] = useState('' as `0x${string}`)
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<Session>(defaultSession)
  const [error, setError] = useState(false)
  const [is7579Installed, setIs7579Installed] = useState(false)
  const [to, setTo] = useState('')
  const [value, setValue] = useState(0)

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

  const handleActionsUpdate = (updatedActions: ActionData[]) => {
    setSession({...session, actions: updatedActions}); // Update the parent state
  };

  return (
    <>
      <div style={{ marginTop: '40px' }}>Your Safe: {safe.account.address}</div>{' '}
      <div style={{ marginTop: '10px' }}>
        ERC-7579 module installed:{' '}
        {is7579Installed
          ? 'Yes ✅'
          : 'No, Click to create a session key'}{' '}
      </div>
      <ActionTable actions={session!.actions} onActionsChange={handleActionsUpdate}/>
      <div>
       { is7579Installed ? null : <button
          disabled={loading || is7579Installed}
          onClick={async () => {
            setLoading(true)
            setError(false)

            install7579SessionModule(safe, session)
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
        </button>}
      </div>
      <div>
        <button
          disabled={loading || !is7579Installed || !session}
          onClick={async () => {
            setLoading(true)
            setError(false)

            updateSession(safe, session!)
              .then((txHash) => {
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

            sessionKeyMint(safe, session!)
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
            sessionKeyTransfer(safe, to as Hex, BigInt(value * 10 ** 18), session!)
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
