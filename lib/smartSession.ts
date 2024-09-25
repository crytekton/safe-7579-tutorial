import {
    getSmartSessionsValidator,
    getTrustAttestersAction
} from '@rhinestone/module-sdk'

import { encodeAbiParameters, encodeFunctionData, getAddress, toBytes, toHex } from 'viem'
import { SafeSmartAccountClient } from './permissionless';

export const install7579SessionModule = async (
    safe: SafeSmartAccountClient,
) => {

    const module = getSmartSessionsValidator({
        sessions: [
            {
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
                        ["0x363cbe9B56c4B92010e6D08684bc20ab13a07BB4"],
                    ]
                ),
                salt: toHex(toBytes('2', { size: 32 })),
                userOpPolicies: [],
                erc7739Policies: {
                    allowedERC7739Content: [],
                    erc1271Policies: [],
                },
                actions: [],
            },
        ],
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
                        getAddress(module.module),
                        module.initData || '0x'
                    ]
                })
            },
        ],
    })

    const receipt = await safe.waitForUserOperationReceipt({ hash: userOpHash, timeout: 1000000000 })

    return receipt.receipt.transactionHash
}

