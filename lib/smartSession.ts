import {
  ChainSession,
  MOCK_ATTESTER_ADDRESS,
  OWNABLE_VALIDATOR_ADDRESS,
  RHINESTONE_ATTESTER_ADDRESS,
  SMART_SESSIONS_ADDRESS,
  Session,
  SmartSessionMode,
  WEBAUTHN_VALIDATOR_ADDRESS,
  encode1271Hash,
  encodeSmartSessionSignature,
  getAccount,
  getClient,
  getOwnableValidatorMockSignature,
  getSessionDigest,
  getSessionNonce,
  getSmartSessionsValidator,
  getSpendingLimitsPolicy,
  getSudoPolicy,
  getTrustAttestersAction,
  getWebauthnValidatorMockSignature,
  getWebauthnValidatorSignature,
  hashChainSessions
} from '@rhinestone/module-sdk'
import { Address,concat, Hex, PublicClient, createWalletClient, custom, encodeAbiParameters, encodeFunctionData, erc20Abi, fromHex, http, pad, parseSignature, slice, toBytes, toHex, zeroAddress } from 'viem'
import { SafeSmartAccountClient, loadPasskeysFromLocalStorage, pimlicoUrl, publicClient, storePasskeyInLocalStorage } from './permissionless';
import { privateKeyToAccount } from 'viem/accounts';
import { abi } from './abi';
import { sendUserOp } from './sendUserOp';
import { createBundlerClient, entryPoint07Address, getUserOperationHash } from 'viem/account-abstraction';
import { baseSepolia } from 'viem/chains';
import { getAccountNonce } from 'permissionless/actions';
import { Wallet } from '@dynamic-labs/sdk-react-core';
import { isEthereumWallet } from '@dynamic-labs/ethereum';

export const STORAGE_PASSKEY_LIST_KEY = 'safe_passkey_list'

const privateKeySession = process.env.NEXT_PUBLIC_PRIVATE_KEY as Hex
const sessionAccount = privateKeyToAccount(privateKeySession)
console.log('Session key address:', sessionAccount.address)
const usdtAddress = "0xc8B3c1D8ccDfcACF4886ac1B4d5289A933f33402" as Address
const mintSelector = '0x1249c58b' as Hex
const transferSelector = '0xa9059cbb' as Hex

const actionMint = {
  actionTarget: usdtAddress,
  actionTargetSelector: mintSelector,
  actionPolicies: [
    {
      policy: getSudoPolicy().address,
      initData: getSudoPolicy().initData,
    },
  ],
}
const actionTransfer = {
  actionTarget: usdtAddress,
  actionTargetSelector: transferSelector,
  actionPolicies: [
    {
      policy: getSudoPolicy().address,
      initData: getSudoPolicy().initData,
    },
  ],
}
const spendingLimitsPolicy = getSpendingLimitsPolicy([{
  token: '0xc8B3c1D8ccDfcACF4886ac1B4d5289A933f33402',
  limit: 10000000000000000000n
}])
const actionTransferWithLimit = {
  actionTarget: usdtAddress,
  actionTargetSelector: transferSelector,
  actionPolicies: [
    {
      policy: spendingLimitsPolicy.address,
      initData: spendingLimitsPolicy.initData,
    },
  ],
}
const session = {
  sessionValidator: OWNABLE_VALIDATOR_ADDRESS,
  sessionValidatorInitData: encodeAbiParameters(
    [
      {
        type: 'uint256',
      },
      {
        type: 'address[]',
      },
    ],
    [
      BigInt(1),
      [sessionAccount.address],
    ]
  ),
  salt: toHex(toBytes('2', { size: 32 })),
  userOpPolicies: [],
  erc7739Policies: {
    allowedERC7739Content: [],
    erc1271Policies: [],
  },
  actions: [
    actionMint,
    actionTransfer,
    actionTransferWithLimit
  ],
} as Session

export const install7579SessionModule = async (
  safe: SafeSmartAccountClient,
) => {

  // const passkey = await createPasskey()
  // storePasskeyInLocalStorage(passkey)
  // const passkeyModule = getWebAuthnValidator({
  //     pubKeyX: Number(passkey.coordinates.x),
  //     pubKeyY: Number(passkey.coordinates.y),
  //     authenticatorId: "testID"
  // })

  const module = getSmartSessionsValidator({
    sessions: [session],
    hook: zeroAddress
  });

  const trustAttestersAction = getTrustAttestersAction({
    threshold: 1,
    attesters: [
      RHINESTONE_ATTESTER_ADDRESS, // Rhinestone Attester
      MOCK_ATTESTER_ADDRESS, // Mock Attester - do not use in production
    ],
  });

  const userOpHash = await safe.sendUserOperation({
    calls: [
      {
        to: trustAttestersAction.target,
        data: trustAttestersAction.callData
      },
      {
        to: safe.account.address,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: [
            {
              name: 'installModule',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                {
                  type: 'uint256',
                  name: 'moduleTypeId'
                },
                {
                  type: 'address',
                  name: 'module'
                },
                {
                  type: 'bytes',
                  name: 'initData'
                }
              ],
              outputs: []
            }
          ],
          functionName: 'installModule',
          args: [
            1n,
            SMART_SESSIONS_ADDRESS,
            module.initData || '0x'
          ]
        })
      },
      // {
      //     to: safe.account.address,
      //     value: BigInt(0),
      //     data: encodeFunctionData({
      //         abi: [
      //             {
      //                 name: 'installModule',
      //                 type: 'function',
      //                 stateMutability: 'nonpayable',
      //                 inputs: [
      //                     {
      //                         type: 'uint256',
      //                         name: 'moduleTypeId'
      //                     },
      //                     {
      //                         type: 'address',
      //                         name: 'module'
      //                     },
      //                     {
      //                         type: 'bytes',
      //                         name: 'initData'
      //                     }
      //                 ],
      //                 outputs: []
      //             }
      //         ],
      //         functionName: 'installModule',
      //         args: [
      //             1n,
      //             WEBAUTHN_VALIDATOR_ADDRESS,
      //             passkeyModule.initData || '0x'
      //         ]
      //     })
      // }
    ],
  })

  const receipt = await safe.waitForUserOperationReceipt({ hash: userOpHash, timeout: 1000000000 })

  return receipt.receipt.transactionHash
}

export const sessionKeyMint = async (safe: SafeSmartAccountClient) => {
  const permissionId = (await getPermissionId({
    client: publicClient,
    session: session,
  })) as Hex

  const ophash = await sendUserOp({
    account: safe.account,
    actions: [
      {
        target: actionMint.actionTarget,
        value: BigInt(0),
        callData: actionMint.actionTargetSelector,
      },
    ],
    key: BigInt(
      pad(SMART_SESSIONS_ADDRESS, {
        dir: 'right',
        size: 24,
      }),
    ),
    signUserOpHash: async (userOpHash) => {
      const signer = privateKeyToAccount(privateKeySession)

      const signature = await signer.signMessage({
        message: { raw: userOpHash },
      })

      return encodeSmartSessionSignature({
        mode: SmartSessionMode.USE,
        permissionId,
        signature,
      })
    },
    getDummySignature: async () => {
      return encodeSmartSessionSignature({
        mode: SmartSessionMode.USE,
        permissionId,
        signature: getOwnableValidatorMockSignature({
          threshold: 1,
        }),
      })
    },
  })

  const bundlerClient = createBundlerClient({
    paymaster: true,
    client: publicClient,
    transport: http(pimlicoUrl),
    chain: baseSepolia
  })

  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: ophash, timeout: 1000000000 })

  return receipt.receipt.transactionHash
}

export const sessionKeyTransfer = async (safe: SafeSmartAccountClient, to: Hex, value: bigint) => {
  console.log(value)
  const permissionId = (await getPermissionId({
    client: publicClient,
    session: session,
  })) as Hex

  const callData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to, value]
  })
  const ophash = await sendUserOp({
    account: safe.account,
    actions: [
      {
        target: actionTransfer.actionTarget,
        value: BigInt(0),
        callData: callData,
      },
    ],
    key: BigInt(
      pad(SMART_SESSIONS_ADDRESS, {
        dir: 'right',
        size: 24,
      }),
    ),
    signUserOpHash: async (userOpHash) => {
      const signer = privateKeyToAccount(privateKeySession)

      const signature = await signer.signMessage({
        message: { raw: userOpHash },
      })

      return encodeSmartSessionSignature({
        mode: SmartSessionMode.USE,
        permissionId,
        signature,
      })
    },
    getDummySignature: async () => {
      return encodeSmartSessionSignature({
        mode: SmartSessionMode.USE,
        permissionId,
        signature: getOwnableValidatorMockSignature({
          threshold: 1,
        }),
      })
    },
  })

  const bundlerClient = createBundlerClient({
    paymaster: true,
    client: publicClient,
    transport: http(pimlicoUrl),
    chain: baseSepolia
  })

  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: ophash, timeout: 1000000000 })

  return receipt.receipt.transactionHash
}

export const sessionKeyTransferLimit = async (safe: SafeSmartAccountClient, to: Hex, value: bigint) => {
  const permissionId = (await getPermissionId({
    client: publicClient,
    session: session,
  })) as Hex

  const callData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [to, value]
  })
  const ophash = await sendUserOp({
    account: safe.account,
    actions: [
      {
        target: actionTransferWithLimit.actionTarget,
        value: BigInt(0),
        callData: callData,
      },
    ],
    key: BigInt(
      pad(SMART_SESSIONS_ADDRESS, {
        dir: 'right',
        size: 24,
      }),
    ),
    signUserOpHash: async (userOpHash) => {
      const signer = privateKeyToAccount(privateKeySession)

      const signature = await signer.signMessage({
        message: { raw: userOpHash },
      })

      return encodeSmartSessionSignature({
        mode: SmartSessionMode.USE,
        permissionId,
        signature,
      })
    },
    getDummySignature: async () => {
      return encodeSmartSessionSignature({
        mode: SmartSessionMode.USE,
        permissionId,
        signature: getOwnableValidatorMockSignature({
          threshold: 1,
        }),
      })
    },
  })

  const bundlerClient = createBundlerClient({
    paymaster: true,
    client: publicClient,
    transport: http(pimlicoUrl),
    chain: baseSepolia
  })

  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: ophash, timeout: 1000000000 })

  return receipt.receipt.transactionHash
}

export const createSession = async (safe: SafeSmartAccountClient, owner: Wallet) => {
  if (!owner) {
    return
  }
  let provider
  if (isEthereumWallet(owner)) {
    provider = await owner.getWalletClient()
  }

  const walletOwner = createWalletClient({
    chain: baseSepolia,
    transport: custom(provider?.transport!)
  })
  const newSession: Session = {
    sessionValidator: OWNABLE_VALIDATOR_ADDRESS,
    sessionValidatorInitData: encodeAbiParameters(
      [
        {
          type: 'uint256',
        },
        {
          type: 'address[]',
        },
      ],
      [
        BigInt(1),
        [sessionAccount.address],
      ],
    ),
    salt: toHex(toBytes('41414141', { size: 32 })),
    userOpPolicies: [],
    erc7739Policies: {
      allowedERC7739Content: [],
      erc1271Policies: [],
    },
    actions: [
      {
        actionTarget:
          '0xa564cB165815937967a7d018B7F34B907B52fcFd' as Address, // an address as the target of the session execution
        actionTargetSelector: '0x00000000' as Hex, // function selector to be used in the execution, in this case no function selector is used
        actionPolicies: [
          {
            policy: getSudoPolicy().address,
            initData: getSudoPolicy().initData,
          },
        ],
      },
    ],
  }
  const publicClient = getClient({
    rpcUrl: "https://sepolia.base.org", // or your own rpc url
  });

  const account = await getAccount({
    address: safe.account.address,
    type: "safe",
  });

  const permissionId = (await getPermissionId({
    client: publicClient,
    session: newSession,
  })) as Hex;

  const sessionNonce = await getSessionNonce({
    client: publicClient,
    account,
    permissionId,
  });

  const sessionDigest = await getSessionDigest({
    client: publicClient,
    account,
    session: newSession,
    mode: SmartSessionMode.ENABLE,
    permissionId,
  });

  const chainDigests = [
    {
      chainId: BigInt(baseSepolia.id), // or your current chain
      sessionDigest,
    },
  ];

  const chainSessions: ChainSession[] = [
    {
      chainId: BigInt(baseSepolia.id),
      session: {
        ...newSession,
        account: account.address,
        smartSession: SMART_SESSIONS_ADDRESS,
        mode: 1,
        nonce: sessionNonce,
      },
    },
  ];
  const permissionEnableHash = hashChainSessions(chainSessions);
  console.log(permissionEnableHash)
  const formattedHash = encode1271Hash({
    account,
    chainId: baseSepolia.id, // or other chain id
    validator: account.address,
    hash: permissionEnableHash,
  })
  console.log(formattedHash)
  const permissionEnableSig = await walletOwner.signMessage({
    account: owner.address as Hex,
    message: { raw: formattedHash },
  })
  let formattedSignature = permissionEnableSig;
  const v = fromHex(slice(permissionEnableSig, 64, 65), 'number')
  console.log(v)
  if (v < 30) {
    formattedSignature = concat([slice(permissionEnableSig, 0, 64), toHex(v + 4)])
  }

  console.log(formattedSignature)

  const bundlerClient = createBundlerClient({
    paymaster: true,
    client: publicClient,
    transport: http(pimlicoUrl),
    chain: baseSepolia
  })

  const nonce = await getAccountNonce(publicClient, {
    address: account.address,
    entryPointAddress: entryPoint07Address,
    key: BigInt(
      pad(SMART_SESSIONS_ADDRESS, {
        dir: 'right',
        size: 24,
      }),
    ),
  })

  const userOperation = await safe.prepareUserOperation({
    account: safe.account,
    calls: [
      {
        to: session.actions[0].actionTarget,
        value: BigInt(0),
        data: session.actions[0].actionTargetSelector,
      },
    ],
    nonce,
    signature: encodeSmartSessionSignature({
      mode: SmartSessionMode.ENABLE,
      permissionId,
      signature: getOwnableValidatorMockSignature({ threshold: 1 }),
      enableSessionData: {
        enableSession: {
          chainDigestIndex: 0,
          hashesAndChainIds: chainDigests,
          sessionToEnable: newSession,
          permissionEnableSig: formattedSignature,
        },
        validator: OWNABLE_VALIDATOR_ADDRESS,
        accountType: "safe",
      },
    }),
    callGasLimit: 3000000000n,
    preVerificationGas: 30000000n,
    verificationGasLimit: 30000000n
  })


  const userOpHashToSign = getUserOperationHash({
    userOperation,
    chainId: baseSepolia.id,
    entryPointVersion: '0.7',
    entryPointAddress: entryPoint07Address
  });

  const signature = await sessionAccount.signMessage({
    message: { raw: userOpHashToSign },
  });

  userOperation.signature = encodeSmartSessionSignature({
    mode: SmartSessionMode.ENABLE,
    permissionId,
    signature: signature,
    enableSessionData: {
      enableSession: {
        chainDigestIndex: 0,
        hashesAndChainIds: chainDigests,
        sessionToEnable: newSession,
        permissionEnableSig: formattedSignature,
      },
      validator: OWNABLE_VALIDATOR_ADDRESS,
      accountType: "safe",
    },
  });

  const userOpTxHash = await safe.sendUserOperation(userOperation);

  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpTxHash, timeout: 1000000000 })

  return receipt.receipt.transactionHash
}

export const getPermissionId = async ({
  client,
  session,
}: {
  client: PublicClient
  session: Session
}) => {
  return (await client.readContract({
    address: SMART_SESSIONS_ADDRESS,
    abi,
    functionName: 'getPermissionId',
    args: [session],
  })) as string
}

// export const passkeySign = async (safe: SafeSmartAccountClient) => {

//   const passkeys = loadPasskeysFromLocalStorage()

//   const ophash = await sendUserOp({
//     account: safe.account,
//     actions: [
//       {
//         target: actionMint.actionTarget,
//         value: BigInt(0),
//         callData: actionMint.actionTargetSelector,
//       },
//     ],
//     key: BigInt(
//       pad(WEBAUTHN_VALIDATOR_ADDRESS, {
//         dir: 'right',
//         size: 24,
//       }),
//     ),
//     signUserOpHash: async (userOpHash) => {

//       const options: PublicKeyCredentialRequestOptions = {
//         timeout: 60000,
//         challenge: userOpHash
//           ? Buffer.from(userOpHash.slice(2), "hex")
//           : Uint8Array.from("random-challenge", (c) => c.charCodeAt(0)),
//         rpId: window.location.hostname,
//         userVerification: "preferred",
//       } as PublicKeyCredentialRequestOptions;

//       const credential = await navigator.credentials.get({
//         publicKey: options
//       })

//       let cred = credential as unknown as {
//         rawId: ArrayBuffer;
//         response: {
//           clientDataJSON: ArrayBuffer;
//           authenticatorData: ArrayBuffer;
//           signature: ArrayBuffer;
//           userHandle: ArrayBuffer;
//         };
//       };
//       const utf8Decoder = new TextDecoder("utf-8");

//       const decodedClientData = utf8Decoder.decode(cred.response.clientDataJSON);
//       const clientDataObj = JSON.parse(decodedClientData);

//       let authenticatorData = toHex(new Uint8Array(cred.response.authenticatorData));
//       let signature = parseSignature(toHex(new Uint8Array(cred?.response?.signature)));

//       return await getWebauthnValidatorSignature({
//         authenticatorData: authenticatorData,
//         clientDataJSON: JSON.stringify({
//           type: clientDataObj.type,
//           challenge: clientDataObj.challenge,
//           origin: clientDataObj.origin,
//           crossOrigin: clientDataObj.crossOrigin,
//         }),
//         responseTypeLocation: 1,
//         r: Number(signature.r),
//         s: Number(signature.s),
//         usePrecompiled: true
//       })
//     },
//     getDummySignature: async () => {
//       return getWebauthnValidatorMockSignature()
//     }
//   })

//   const receipt = await safe.waitForUserOperationReceipt({ hash: ophash, timeout: 1000000000 })

//   return receipt.receipt.transactionHash
//   // const userOp = {
//   //     to
//   // }
//   // const hash = getUserOperationHash({
//   //     userOperation: userOp,
//   //     chainId: sepolia.id,
//   //     entryPointVersion: "0.7",
//   //     entryPointAddress: entryPoint07Address
//   // })
// }