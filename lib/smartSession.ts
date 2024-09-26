import {
    SMART_SESSIONS_ADDRESS,
    Session,
    SmartSessionMode,
    encodeSmartSessionSignature,
    getAccount,
    getOwnableValidatorMockSignature,
    getSmartSessionsValidator,
    getSudoPolicy,
    getTrustAttestersAction
} from '@rhinestone/module-sdk'


import { Address, Hex, PublicClient, encodeAbiParameters, encodeFunctionData, http, toBytes, toHex, zeroAddress } from 'viem'
import { SafeSmartAccountClient, pimlicoUrl, publicClient } from './permissionless';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { abi } from './abi';
import { sendUserOp } from './sendUserOp';
import { createBundlerClient } from 'viem/account-abstraction';
import { sepolia } from 'viem/chains';

let privateKeySession = generatePrivateKey()

const action = {
    actionTarget:
        '0xa564cB165815937967a7d018B7F34B907B52fcFd' as Address,
    actionTargetSelector: '0x00000000' as Hex,
    actionPolicies: [
        {
            policy: getSudoPolicy().address,
            initData: getSudoPolicy().initData,
        },
    ],
}
const session = {
    sessionValidator: '0x6605F8785E09a245DD558e55F9A0f4A508434503',
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
            [privateKeyToAccount(privateKeySession).address],
        ]
    ),
    salt: toHex(toBytes('2', { size: 32 })),
    userOpPolicies: [],
    erc7739Policies: {
        allowedERC7739Content: [],
        erc1271Policies: [],
    },
    actions: [
        action
    ],
} as Session


export const install7579SessionModule = async (
    safe: SafeSmartAccountClient,
) => {

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
              }
        ],
        callGasLimit:2000000n
    })

    const receipt = await safe.waitForUserOperationReceipt({ hash: userOpHash, timeout: 1000000000 })

    return receipt.receipt.transactionHash
}

export const SessionKeyTransaction = async (safe: SafeSmartAccountClient) => {
    const permissionId = (await getPermissionId({
        client: publicClient,
        session: session,
    })) as Hex

    console.log(safe.account.address)
    console.log(await safe.isModuleInstalled({
        address: SMART_SESSIONS_ADDRESS,
        type: 'validator',
        context: '0x'
    }))
    console.log(permissionId)

    const ophash = await sendUserOp({
        account: safe.account,
        actions: [
            {
                target: action.actionTarget,
                value: BigInt(0),
                callData: action.actionTargetSelector,
            },
        ],
        validator: SMART_SESSIONS_ADDRESS,
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
    // console.log("user Safe", safe.account.address)
    // const nonce = await getAccountNonce(publicClient, {
    //     address: safe.account.address,
    //     entryPointAddress: entryPoint07Address,
    //     key: BigInt(
    //         pad(SMART_SESSIONS_ADDRESS, {
    //             dir: 'right',
    //             size: 24,
    //         }),
    //     ),
    // })

    // const userOp = await bundlerClient.prepareUserOperation({
    //     account: safe.account,
    //     calls: [{
    //         to: "0xc486030887BB2EF7eA20C2e2BbB46097a275436B",
    //         value: 0n,
    //     }],
    //     nonce
    // })

    // const signer = privateKeyToAccount(privateKeySession)
    // const hash = getUserOperationHash({
    //     userOperation: userOp,
    //     chainId: sepolia.id,
    //     entryPointVersion: "0.7",
    //     entryPointAddress: entryPoint07Address
    // })

    // const signature = await signer.signMessage({
    //     message: { raw: hash },
    // })

    // userOp.signature = signature
    // safe.account.sign
    // const txhash = await bundlerClient.sendUserOperation(userOp)

    const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: ophash, timeout: 1000000000 })

    return receipt
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