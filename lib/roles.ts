import { Address, decodeAbiParameters, encodeAbiParameters, encodeFunctionData, parseAbiParameters } from "viem";
import { SafeSmartAccountClient, publicClient } from "./permissionless";
import { moduleFactoryAbi, safeSingletonAbi } from "./abi";
import { rolesAbi } from "zodiac-roles-sdk";

const RolesSingletonAddress = "0x9646fDAD06d3e24444381f44362a3B0eB343D337"
const ModuleFactory = "0x000000000000aDdB49795b0f9bA5BC298cDda236"

const encodedSetupData = encodeAbiParameters(
    parseAbiParameters('address, address, address'),
    [
        '0x32eb57110595F880375BBE495384EeC733adc3f7', '0x32eb57110595F880375BBE495384EeC733adc3f7', '0x32eb57110595F880375BBE495384EeC733adc3f7'
    ]
)

const moduleSetupData = encodeFunctionData({
    abi: rolesAbi,
    functionName: 'setUp',
    args: [encodedSetupData]
})

const deployData = encodeFunctionData({
    abi: moduleFactoryAbi,
    functionName: 'deployModule',
    args: [RolesSingletonAddress, moduleSetupData, BigInt(Number(1))]
})

const enableModule = (address: Address) => encodeFunctionData({
    abi: safeSingletonAbi,
    functionName: 'enableModule',
    args: [address]
})

export const installRoles = async (safe: SafeSmartAccountClient) => {
    const call = await publicClient.call({
        account: safe.account,
        data: deployData,
        to: ModuleFactory
    })
    if (!call.data) return '0x'
    const decodedAddress = decodeAbiParameters(
        parseAbiParameters('address'),
        call.data
    )
    const userOpHash = await safe.sendUserOperation({
        calls: [
            {
                to: ModuleFactory,
                data: deployData
            },
            {
                to: safe.account.address,
                data: enableModule(decodedAddress[0])
            }
        ]
    })
    const receipt = await safe.waitForUserOperationReceipt({ hash: userOpHash })
    return receipt.receipt.transactionHash
}