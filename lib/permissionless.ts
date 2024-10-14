import { Chain, Client, Hex, HttpTransport, bytesToBigInt, bytesToHex, createPublicClient, createWalletClient, custom, encodePacked, http, toBytes } from 'viem'
import { generatePrivateKey, privateKeyToAccount, toAccount } from 'viem/accounts'
import { SmartAccountClient, createSmartAccountClient } from "permissionless"
import { sepolia } from 'viem/chains'
import { Erc7579Actions, erc7579Actions } from 'permissionless/actions/erc7579'
import { ToSafeSmartAccountReturnType, toSafeSmartAccount, toSimpleSmartAccount } from "permissionless/accounts"
import {
  createPimlicoClient,
} from 'permissionless/clients/pimlico'
import { entryPoint07Address } from "viem/account-abstraction"
import { PasskeyArgType, extractPasskeyData } from '@safe-global/protocol-kit'
import { randomBytes } from 'crypto'
import { MOCK_ATTESTER_ADDRESS, RHINESTONE_ATTESTER_ADDRESS } from '@rhinestone/module-sdk'

export enum OperationType {
  Call, // 0
  DelegateCall // 1
}

export interface MetaTransactionData {
  to: string
  value: string
  data: string
  operation?: OperationType
}

export const STORAGE_PASSKEY_LIST_KEY = 'safe_passkey_list'
export type SafeSmartAccountClient = SmartAccountClient<HttpTransport, Chain, ToSafeSmartAccountReturnType<'0.7'>> & Erc7579Actions<ToSafeSmartAccountReturnType<'0.7'>>

const rpc_url = 'https://ethereum-sepolia-rpc.publicnode.com'
export const pimlicoUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`
export const safe4337ModuleAddress = '0x3Fdb5BC686e861480ef99A6E3FaAe03c0b9F32e2'
export const erc7579LaunchpadAddress = '0xEBe001b3D534B9B6E2500FB78E67a1A137f561CE'
export const PAYMASTER_ADDRESS = '0x0000000000325602a77416A16136FDafd04b299f' // SEPOLIA


const privateKey =
  (process.env.NEXT_PUBLIC_PRIVATE_KEY as Hex) ??
  (() => {
    const pk = generatePrivateKey()
    console.log('Private key to add to .env.local:', `PRIVATE_KEY=${pk}`)
    return pk
  })() as Hex

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpc_url),
})

export const pimlicoClient = createPimlicoClient({
  transport: http(pimlicoUrl),
  entryPoint: {
    address: entryPoint07Address,
    version: "0.7",
  },
})

export async function createPasskey(): Promise<PasskeyArgType> {
  const displayName = 'Safe Owner' // This can be customized to match, for example, a user name.
  // Generate a passkey credential using WebAuthn API
  const passkeyCredential = await navigator.credentials.create({
      publicKey: {
          pubKeyCredParams: [
              {
                  // ECDSA w/ SHA-256: https://datatracker.ietf.org/doc/html/rfc8152#section-8.1
                  alg: -7,
                  type: 'public-key'
              }
          ],
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: {
              name: 'Safe SmartAccount'
          },
          user: {
              displayName,
              id: crypto.getRandomValues(new Uint8Array(32)),
              name: displayName
          },
          timeout: 60_000,
          attestation: 'none'
      }
  })
  if (!passkeyCredential) {
      throw Error('Passkey creation failed: No credential was returned.')
  }

  const passkey = await extractPasskeyData(passkeyCredential)
  console.log("Created Passkey: ", passkey)

  return passkey
}

/**
* Store passkey in local storage.
* @param {PasskeyArgType} passkey - Passkey object with rawId and coordinates.
*/
export function storePasskeyInLocalStorage(passkey: PasskeyArgType) {
  const passkeys = loadPasskeysFromLocalStorage()

  passkeys.push(passkey)

  localStorage.setItem(STORAGE_PASSKEY_LIST_KEY, JSON.stringify(passkeys))
}

/**
* Load passkeys from local storage.
* @returns {PasskeyArgType[]} List of passkeys.
*/
export function loadPasskeysFromLocalStorage(): PasskeyArgType[] {
  const passkeysStored = localStorage.getItem(STORAGE_PASSKEY_LIST_KEY)

  const passkeyIds = passkeysStored ? JSON.parse(passkeysStored) : []

  return passkeyIds
}

/**
* Get passkey object from local storage.
* @param {string} passkeyRawId - Raw ID of the passkey.
* @returns {PasskeyArgType} Passkey object.
*/
export function getPasskeyFromRawId(passkeyRawId: string): PasskeyArgType {
  const passkeys = loadPasskeysFromLocalStorage()

  const passkey = passkeys.find(
      (passkey) => passkey.rawId === passkeyRawId
  )!

  return passkey
}


export const getSmartAccountClient = async (signer: any) => {
  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    owners: [signer],

    safe4337ModuleAddress, // These are not meant to be used in production as of now.
    erc7579LaunchpadAddress, // These are not meant to be used in production as of now.
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    }, // global entrypoint
    nonceKey: bytesToBigInt(randomBytes(4)),
    saltNonce: bytesToBigInt(randomBytes(4)),
    attesters: [
      RHINESTONE_ATTESTER_ADDRESS, // Rhinestone Attester
      MOCK_ATTESTER_ADDRESS, // Mock Attester - do not use in production
    ],
    attestersThreshold: 1,
    version: "1.4.1",
  })

  console.log(`Smart account address: https://sepolia.etherscan.io/address/${safeAccount.address}`)

  const smartAccountClient = createSmartAccountClient({
    account: safeAccount,
    chain: sepolia,
    bundlerTransport: http(pimlicoUrl),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        return (await pimlicoClient.getUserOperationGasPrice()).fast
      },
    },
  }).extend(erc7579Actions())



  return smartAccountClient as unknown as SafeSmartAccountClient
}

export function encodeMultiSendData(txs: MetaTransactionData[]): string {
  return `0x${txs.map((tx) => encodeMetaTransaction(tx)).join('')}`
}

function encodeMetaTransaction(tx: MetaTransactionData): string {
  const data = toBytes(tx.data)
  const encoded = encodePacked(
    ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
    [
      tx.operation ?? OperationType.Call,
      tx.to as Hex,
      BigInt(tx.value),
      BigInt(data.length),
      bytesToHex(data)
    ]
  )
  return encoded.slice(2)
}