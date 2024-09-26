import { Chain, Hex, HttpTransport, createPublicClient, http } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { SmartAccountClient, createSmartAccountClient } from "permissionless"
import { sepolia } from 'viem/chains'
import { Erc7579Actions, erc7579Actions } from 'permissionless/actions/erc7579'
import { ToSafeSmartAccountReturnType, toSafeSmartAccount } from "permissionless/accounts"
import {
  createPimlicoClient,
} from 'permissionless/clients/pimlico'
import { entryPoint07Address } from "viem/account-abstraction"

export type SafeSmartAccountClient = SmartAccountClient<HttpTransport, Chain, ToSafeSmartAccountReturnType<'0.7'>> & Erc7579Actions<ToSafeSmartAccountReturnType<'0.7'>>

export const pimlicoUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`
export const safe4337ModuleAddress = '0x3Fdb5BC686e861480ef99A6E3FaAe03c0b9F32e2'
export const erc7579LaunchpadAddress = '0xEBe001b3D534B9B6E2500FB78E67a1A137f561CE'

const privateKey =
  (process.env.NEXT_PUBLIC_PRIVATE_KEY as Hex) ??
  (() => {
    const pk = generatePrivateKey()
    console.log('Private key to add to .env.local:', `PRIVATE_KEY=${pk}`)
    return pk
  })()

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http("https://rpc.ankr.com/eth_sepolia"),
})

export const pimlicoClient = createPimlicoClient({
  transport: http(pimlicoUrl),
  entryPoint: {
    address: entryPoint07Address,
    version: "0.7",
  },
})


export const getSmartAccountClient = async () => {
  const safeAccount = await toSafeSmartAccount({
    client: publicClient,
    owners: [privateKeyToAccount(privateKey)],

    safe4337ModuleAddress, // These are not meant to be used in production as of now.
    erc7579LaunchpadAddress, // These are not meant to be used in production as of now.
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    }, // global entrypoint
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

