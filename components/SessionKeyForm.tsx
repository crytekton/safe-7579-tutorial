import { useState, useEffect } from 'react'

import { ActionData, SMART_SESSIONS_ADDRESS, Session } from '@rhinestone/module-sdk'
import { SafeSmartAccountClient } from '@/lib/permissionless'
import ActionTable from './ActionTable'
import { defaultSession, install7579SessionModule, sessionKeyMint, sessionKeyERC20Transfer, updateSession, sessionKeyNativeTransfer } from '@/lib/smartSession'
import { Hex } from 'viem'

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
    setSession({ ...session, actions: updatedActions }); // Update the parent state
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>Your Safe:</h3>
        <p>{safe.account.address}</p>
      </div>
      <div style={styles.status}>
        <h4>ERC-7579 module installed:</h4>
        <p>{is7579Installed ? 'Yes ✅' : 'No, Click on "Setup the Session" to create a session key'}</p>
      </div>

      <ActionTable actions={session.actions} onActionsChange={handleActionsUpdate} />

      <h3>Session manager</h3>
      <div style={styles.buttonGroup}>
      
        {!is7579Installed && (
          <button
            disabled={loading || is7579Installed}
            style={styles.button}
            onClick={async () => {
              setLoading(true);
              setError(false);
              install7579SessionModule(safe, session)
                .then(txHash => {
                  setTxHash(txHash);
                  setLoading(false);
                  setIs7579Installed(true);
                })
                .catch(err => {
                  console.error(err);
                  setLoading(false);
                  setError(true);
                });
            }}
          >
            Setup the session
          </button>
        )}
        <button
          style={styles.button}
          disabled={loading || !is7579Installed || !session}
          onClick={async () => {
            setLoading(true);
            setError(false);
            updateSession(safe, session)
              .then(txHash => {
                setTxHash(txHash);
                setLoading(false);
              })
              .catch(err => {
                console.error(err);
                setLoading(false);
                setError(true);
              });
          }}
        >
          Update the session
        </button>
      </div>
      <h3>Token manager</h3>
      <div style={styles.buttonGroup}>

        <button
          style={styles.button}
          disabled={loading || !is7579Installed}
          onClick={async () => {
            setLoading(true);
            setError(false);
            sessionKeyMint(safe, session)
              .then(txHash => {
                setTxHash(txHash);
                setLoading(false);
              })
              .catch(err => {
                console.error(err);
                setLoading(false);
                setError(true);
              });
          }}
        >
          Mint USDT
        </button>
      </div>

      <div style={styles.transferSection}>
        <div style={styles.inputGroup}>
          <label>To:</label>
          <input
            style={styles.input}
            name="to"
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div style={styles.inputGroup}>
          <label>Value:</label>
          <input
            style={styles.input}
            name="value"
            type="number"
            onChange={(e) => setValue(Number(e.target.value))}
          />
        </div>

        <div style={styles.buttonGroup}>
          <button
            style={styles.button}
            disabled={loading || !is7579Installed}
            onClick={async () => {
              setLoading(true);
              setError(false);
              sessionKeyERC20Transfer(safe, to as Hex, BigInt(value * 10 ** 18), session)
                .then(txHash => {
                  setTxHash(txHash);
                  setLoading(false);
                })
                .catch(err => {
                  console.error(err);
                  setLoading(false);
                  setError(true);
                });
            }}
          >
            Transfer Token
          </button>
          <button
            style={styles.button}
            disabled={loading || !is7579Installed}
            onClick={async () => {
              setLoading(true);
              setError(false);
              sessionKeyNativeTransfer(safe, to as Hex, BigInt(value * 10 ** 18), session)
                .then(txHash => {
                  setTxHash(txHash);
                  setLoading(false);
                })
                .catch(err => {
                  console.error(err);
                  setLoading(false);
                  setError(true);
                });
            }}
          >
            Transfer ETH
          </button>
        </div>
      </div>

      <div style={styles.statusMessage}>
        {loading && <p>Processing, please wait...</p>}
        {error && <p>There was an error processing the transaction. Please try again.</p>}
        {txHash && (
          <p>
            Success!{' '}
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              style={styles.link}
            >
              View on Etherscan
            </a>
          </p>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: 'auto',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    marginBottom: '20px',
  },
  status: {
    marginBottom: '20px',
    fontSize: '16px',
  },
  actionSection: {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  button: {
    padding: '10px 20px',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  inputGroup: {
    marginBottom: '10px',
  },
  input: {
    padding: '8px',
    width: '200px',
  },
  transferSection: {
    marginBottom: '20px',
  },
  statusMessage: {
    marginTop: '20px',
  },
  link: {
    color: '#007bff',
    textDecoration: 'underline',
  },
};

export default SessionKeyForm
