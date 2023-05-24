/* eslint-disable no-template-curly-in-string */
import fs from 'fs/promises'
import path from 'path'
import { cyan } from '../colour.js'
import * as ethers from 'ethers'
import { isString } from '../types.js'
import logger from '../utils/logger.js'

type BaseTypes = 'bool' |
'int' | 'int8' | 'int16' | 'int24' | 'int32' | 'int40' | 'int48' | 'int56' | 'int64' |
'int72' | 'int80' | 'int88' | 'int96' | 'int104' | 'int112' | 'int120' | 'int128' |
'int136' | 'int144' | 'int152' | 'int160' | 'int168' | 'int176' | 'int184' | 'int192' |
'int200' | 'int208' | 'int216' | 'int224' | 'int232' | 'int240' | 'int248' | 'int256' |
'uint' | 'uint8' | 'uint16' | 'uint24' | 'uint32' | 'uint40' | 'uint48' | 'uint56' | 'uint64' |
'uint72' | 'uint80' | 'uint88' | 'uint96' | 'uint104' | 'uint112' | 'uint120' | 'uint128' |
'uint136' | 'uint144' | 'uint152' | 'uint160' | 'uint168' | 'uint176' | 'uint184' | 'uint192' |
'uint200' | 'uint208' | 'uint216' | 'uint224' | 'uint232' | 'uint240' | 'uint248' | 'uint256' |
'bytes1' | 'bytes2' | 'bytes3' | 'bytes4' | 'bytes5' | 'bytes6' | 'bytes7' | 'bytes8' |
'bytes9' | 'bytes10' | 'bytes11' | 'bytes12' | 'bytes13' | 'bytes14' | 'bytes15' | 'bytes16' |
'bytes17' | 'bytes18' | 'bytes19' | 'bytes20' | 'bytes21' | 'bytes22' | 'bytes23' | 'bytes24' |
'bytes25' | 'bytes26' | 'bytes27' | 'bytes28' | 'bytes29' | 'bytes30' | 'bytes31' | 'bytes32' |
'address'

// and arrays

interface AbiInput {
  name: string
  type: BaseTypes
  internalType: string
}

interface Abi {
  name: string
  type: 'function' | 'event' | 'constructor' | 'fallback'
  inputs: AbiInput[]
  outputs: Array<{ name: string, type: string }>
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable'
  anonymous?: boolean
}

interface AbiFileData {
  filePath: string
  jsonContent: {
    address: string
    abi: Abi[]
  }
}

const searchJsonFiles = async (directory: string): Promise<AbiFileData[]> => {
  const foundFiles: AbiFileData[] = []

  const search = async (currentDirectory: string, depth = 0): Promise<void> => {
    if (depth > 5) {
      // logger.debug(`ABI: Max depth reached in ${currentDirectory}`)
      return
    }
    const files = await fs.readdir(currentDirectory)

    for (const file of files) {
      const filePath = path.join(currentDirectory, file)
      const stats = await fs.stat(filePath)

      if (stats.isDirectory()) {
        // Recursively search subdirectories
        await search(filePath, depth + 1)
      } else if (stats.isFile() && path.extname(filePath) === '.json') {
        // Process JSON file
        try {
          const jsonContent = await processJsonFile(filePath)
          if (typeof jsonContent.address === 'string' && typeof jsonContent.abi === 'object') {
            foundFiles.push({ filePath: path.relative(directory, filePath), jsonContent })
          }
        } catch (err: any) {
          logger.debug(`Error processing ${filePath}: ${err?.message as string}`)
        }
      }
    }
  }

  await search(directory)
  return foundFiles
}

const processJsonFile = async (filePath: string): Promise<any> => {
  const data = await fs.readFile(filePath, 'utf8')
  const json = JSON.parse(data)
  return json
}

// eslint-disable-next-line max-len
const getProviderAndWallet = async (env: any): Promise<{ provider: ethers.JsonRpcProvider, wallet?: ethers.Wallet, blockNumber: string | number }> => {
  const provider = new ethers.JsonRpcProvider(env.PROVIDER_URL)
  let blockNumber: string | number = isString(env.BLOCK_NUMBER) ? env.BLOCK_NUMBER : 'latest'
  if (!isNaN(Number(blockNumber))) {
    blockNumber = Number(blockNumber)
  }
  if (typeof env.PRIVATE_KEY === 'string') {
    logger.debug(`ABI: Using block number: ${blockNumber}, Using private key: ***`)
    return { provider, blockNumber, wallet: new ethers.Wallet(env.PRIVATE_KEY, provider) }
  } else {
    logger.debug(`ABI: Using block number: ${blockNumber}`)
    return { provider, blockNumber }
  }
}

export const generateAbiScripts = async (): Promise<any> => {
  logger.debug('ABI: enabled...')
  const files = await searchJsonFiles('.')
  logger.debug(`ABI: Found files - ${(files).length}`)
  if (files.length === 0) {
    return {}
  } else {
    return {
      '🔑 abi': {
        // get the current block number
        'getBlockNumber()': {
          $internal: async ({ env }: any) => {
            const provider = new ethers.JsonRpcProvider(env.PROVIDER_URL)
            logger.info(await provider.getBlockNumber())
          }
        },
        // show the address of the current wallet
        'getAddress()': {
          $internal: async ({ env }: any) => {
            const { wallet } = await getProviderAndWallet(env)
            if (typeof wallet?.address === 'string') {
              logger.info(wallet.address)
            } else {
              throw new Error('No wallet. You can define one by specifying a PRIVATE_KEY environment variable.')
            }
          }
        },
        // show the native balance of the current wallet
        'getBalance()': {
          $internal: async ({ env }: any) => {
            const { provider, blockNumber, wallet } = await getProviderAndWallet(env)
            if (typeof wallet?.address === 'string') {
              logger.info(await provider.getBalance(wallet.address, blockNumber))
            } else {
              throw new Error('No wallet. You can define one by specifying a PRIVATE_KEY environment variable.')
            }
          }
        },
        ...Object.fromEntries((files).map((file: AbiFileData) => {
          const fns = file.jsonContent.abi.filter((abi: Abi) => {
            // choose only no args (->FREE) transactions for now
            return abi.type === 'function' // && // is a function
            // abi.inputs.length === 0 && // has no inputs
            // ['view', 'nonpayable'].includes(abi.stateMutability) // is free
          })
          // map each solidity file
          return [file.filePath, Object.fromEntries(fns.map((fn: Abi) => {
            const contractArgs = Object.fromEntries(fn.inputs.map((input: AbiInput) => {
              return [input.name, { $stdin: `Please enter a ${input.name} (type = ${input.type})?` }]
            }))
            // map each function to a script
            return [`${fn.name}(${fn.inputs.map(i => i.name).join(', ')}) [${fn.stateMutability}]`, {
              $env: {
                PROVIDER_URL: '${PROVIDER_URL}',
                ...contractArgs
              },
              $internal: async ({ env }: any) => {
                const { provider, wallet, blockNumber } = await getProviderAndWallet(env)
                const contract = typeof wallet !== 'undefined'
                  ? new ethers.Contract(file.jsonContent.address, file.jsonContent.abi, wallet)
                  : new ethers.Contract(file.jsonContent.address, file.jsonContent.abi, provider)
                const params = fn.inputs.map(input => env[input.name])
                // logger.debug(`calling ${fn.name}(${params.join(', ')})`)
                logger.info(await contract[fn.name](...params, { blockTag: blockNumber }))
              }
            }]
          }))]
        }))
      }
    }
  }
}
