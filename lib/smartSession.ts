import {
    ChainSession,
    OWNABLE_VALIDATOR_ADDRESS,
    SMART_SESSIONS_ADDRESS,
    Session,
    SmartSessionMode,
    WEBAUTHN_VALIDATOR_ADDRESS,
    encodeSmartSessionSignature,
    getAccount,
    getClient,
    getOwnableValidatorMockSignature,
    getSessionDigest,
    getSessionNonce,
    getSmartSessionsValidator,
    getSudoPolicy,
    getTrustAttestersAction,
    getWebAuthnValidator,
    getWebauthnValidatorMockSignature,
    getWebauthnValidatorSignature,
    hashChainSessions
} from '@rhinestone/module-sdk'
import { Address, Hex, PublicClient, encodeAbiParameters, encodeFunctionData, erc20Abi, http, pad, parseSignature, toBytes, toHex, zeroAddress } from 'viem'
import { SafeSmartAccountClient, createPasskey, loadPasskeysFromLocalStorage, pimlicoUrl, publicClient, storePasskeyInLocalStorage } from './permissionless';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { abi } from './abi';
import { sendUserOp } from './sendUserOp';
import { createBundlerClient, entryPoint07Address, getUserOperationHash } from 'viem/account-abstraction';
import { sepolia } from 'viem/chains';
import { getAccountNonce } from 'permissionless/actions';

export const STORAGE_PASSKEY_LIST_KEY = 'safe_passkey_list'

const privateKeySession = generatePrivateKey()
const sessionAccount = privateKeyToAccount(privateKeySession)
console.log('Session key address:',sessionAccount.address)
const usdtAddress = "0xbDeaD2A70Fe794D2f97b37EFDE497e68974a296d" as Address
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
        actionTransfer
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

    const attesterModule = getTrustAttestersAction({
        attesters: ["0xA4C777199658a41688E9488c4EcbD7a2925Cc23A"], threshold: 1
    })

    const userOpHash = await safe.sendUserOperation({
        calls: [
            {
                to: attesterModule.target,
                data: attesterModule.callData
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
        callGasLimit: 2000000n
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
        chain: sepolia
    })

    const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: ophash, timeout: 1000000000 })

    return receipt.receipt.transactionHash
}

export const sessionKeyTransfer = async (safe: SafeSmartAccountClient) => {
  const permissionId = (await getPermissionId({
      client: publicClient,
      session: session,
  })) as Hex
  
  const callData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: ["0xc486030887BB2EF7eA20C2e2BbB46097a275436B", 10n]
  })
  const ophash = await sendUserOp({
      account: safe.account,
      actions: [
          {
              target: actionMint.actionTarget,
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
      chain: sepolia
  })

  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: ophash, timeout: 1000000000 })

  return receipt.receipt.transactionHash
}

export const createSession = async (safe: SafeSmartAccountClient) => {
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
  console.log('lol')
    const publicClient = getClient({
        rpcUrl: "https://sepolia.drpc.org", // or your own rpc url
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
          chainId: BigInt(sepolia.id), // or your current chain
          sessionDigest,
        },
      ];
       
      const chainSessions: ChainSession[] = [
        {
          chainId: BigInt(sepolia.id),
          session: {
            ...session,
            account: account.address,
            smartSession: SMART_SESSIONS_ADDRESS,
            mode: 1,
            nonce: sessionNonce,
          },
        },
      ];
       
      const permissionEnableHash = hashChainSessions(chainSessions);

      const permissionEnableSig = await safe.signMessage({
        message: { raw: permissionEnableHash },
      });

      const bundlerClient = createBundlerClient({
        paymaster: true,
        client: publicClient,
        transport: http(pimlicoUrl),
        chain: sepolia
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
        calls:[{
            to: actionMint.actionTarget,
            data: '0x',
            value: actionMint.actionTargetSelector,
        }],
        nonce,
        callGasLimit: 20000000n,
        preVerificationGas:  20000000n,
      })

      const userOpHash = getUserOperationHash({
        userOperation,
        chainId: sepolia.id,
        entryPointVersion: '0.7',
        entryPointAddress: entryPoint07Address
      });
       
               const signature = await sessionAccount.signMessage({
                message: { raw: userOpHash },
              })
       
             userOperation.signature = encodeSmartSessionSignature({
                mode: SmartSessionMode.ENABLE,
                permissionId,
                signature,
                enableSessionData: {
                  enableSession: {
                    chainDigestIndex: 0,
                    hashesAndChainIds: chainDigests,
                    sessionToEnable: session,
                    permissionEnableSig,
                  },
                  validator: OWNABLE_VALIDATOR_ADDRESS,
                  accountType: 'safe',
                },
              })
              const userOpTxHash = await safe.sendUserOperation(
                userOperation,
              );
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

export const passkeySign = async (safe: SafeSmartAccountClient) => {

    const passkeys = loadPasskeysFromLocalStorage()

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
            pad(WEBAUTHN_VALIDATOR_ADDRESS, {
                dir: 'right',
                size: 24,
            }),
        ),
        signUserOpHash: async (userOpHash) => {

            const options: PublicKeyCredentialRequestOptions = {
                timeout: 60000,
                challenge: userOpHash
                  ? Buffer.from(userOpHash.slice(2), "hex")
                  : Uint8Array.from("random-challenge", (c) => c.charCodeAt(0)),
                rpId: window.location.hostname,
                userVerification: "preferred",
              } as PublicKeyCredentialRequestOptions;

            const credential = await navigator.credentials.get({
                publicKey: options
            })

            let cred = credential as unknown as {
                rawId: ArrayBuffer;
                response: {
                  clientDataJSON: ArrayBuffer;
                  authenticatorData: ArrayBuffer;
                  signature: ArrayBuffer;
                  userHandle: ArrayBuffer;
                };
              };
              const utf8Decoder = new TextDecoder("utf-8");

              const decodedClientData = utf8Decoder.decode(cred.response.clientDataJSON);
              const clientDataObj = JSON.parse(decodedClientData);
          
              let authenticatorData = toHex(new Uint8Array(cred.response.authenticatorData));
              let signature = parseSignature(toHex(new Uint8Array(cred?.response?.signature)));
          
              return await getWebauthnValidatorSignature({
                authenticatorData: authenticatorData,
                clientDataJSON:  JSON.stringify({
                    type: clientDataObj.type,
                    challenge: clientDataObj.challenge,
                    origin: clientDataObj.origin,
                    crossOrigin: clientDataObj.crossOrigin,
                  }),
                  responseTypeLocation: 1,
                  r: Number(signature.r),
                  s: Number(signature.s),
                  usePrecompiled: true
              })
        },
        getDummySignature: async () => {
            return getWebauthnValidatorMockSignature()
        }
    })

    const receipt = await safe.waitForUserOperationReceipt({ hash: ophash, timeout: 1000000000 })

    return receipt.receipt.transactionHash
    // const userOp = {
    //     to
    // }
    // const hash = getUserOperationHash({
    //     userOperation: userOp,
    //     chainId: sepolia.id,
    //     entryPointVersion: "0.7",
    //     entryPointAddress: entryPoint07Address
    // })
}