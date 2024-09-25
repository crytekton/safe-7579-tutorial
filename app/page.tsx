'use client'

import { useEffect, useState } from 'react'

import {
  SafeSmartAccountClient,
  getSmartAccountClient,
  publicClient,
} from '../lib/permissionless'

import abi from '../abi/ScheduleTransfersModule.json'
import { scheduledTransfersModuleAddress } from '@/lib/scheduledTransfers'
import SessionKeyForm from '@/components/SessionKeyForm'

export default function Home () {
  const [safe, setSafe] = useState<SafeSmartAccountClient | undefined>()
  const [logs, setLogs] = useState<any[]>([])

  const handleLoadSafe = async () => {
    const safe = await getSmartAccountClient()
    setSafe(safe)
  }

  useEffect(() => {
    const unwatch = publicClient.watchContractEvent({
      address: scheduledTransfersModuleAddress,
      abi,
      // eventName: 'ExecutionAdded', // Optional
      // args: { smartAccount: safe?.account.address }, // Optional
      onLogs: logs => {
        setLogs(_logs => [
          ..._logs,
          ...logs.filter(
            log =>
              !_logs.map(l => l.transactionHash).includes(log.transactionHash)
          )
        ])
      }
    })
    return () => unwatch()
    // }, [safe]) // Optional
  }, [])

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
        <SessionKeyForm safe={safe}/>
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
