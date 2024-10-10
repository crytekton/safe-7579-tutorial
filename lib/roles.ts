import { encodeFunctionData } from "viem";
import { SafeSmartAccountClient } from "./permissionless";
import { randomBytes } from "crypto";

const RolesSingletonAddress = "0x9646fDAD06d3e24444381f44362a3B0eB343D337"
const ModuleFactory = "0x000000000000aDdB49795b0f9bA5BC298cDda236"

const deployData = encodeFunctionData({
    abi: [{"inputs":[],"name":"FailedInitialization","type":"error"},{"inputs":[{"internalType":"address","name":"address_","type":"address"}],"name":"TakenAddress","type":"error"},{"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"TargetHasNoCode","type":"error"},{"inputs":[{"internalType":"address","name":"target","type":"address"}],"name":"ZeroAddress","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"proxy","type":"address"},{"indexed":true,"internalType":"address","name":"masterCopy","type":"address"}],"name":"ModuleProxyCreation","type":"event"},{"inputs":[{"internalType":"address","name":"masterCopy","type":"address"},{"internalType":"bytes","name":"initializer","type":"bytes"},{"internalType":"uint256","name":"saltNonce","type":"uint256"}],"name":"deployModule","outputs":[{"internalType":"address","name":"proxy","type":"address"}],"stateMutability":"nonpayable","type":"function"}] as const,
    functionName: 'deployModule',
    args: [RolesSingletonAddress, '0x', BigInt(Number(randomBytes(4)))]
})

const installRoles = async (safe: SafeSmartAccountClient) => {
    safe.sendUserOperation({
        calls: [{
            to: ModuleFactory,
            data: deployData
        }]

    })
}