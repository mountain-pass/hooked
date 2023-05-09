import fs from 'fs/promises'
import path from 'path'
import { cyan } from '../colour.js'
import * as ethers from 'ethers'

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
      // console.log(cyan(`ABI: Max depth reached in ${currentDirectory}`))
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
          console.log(cyan(`Error processing ${filePath}: ${err?.message as string}`))
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

export const generateScripts = async (): Promise<any> => {
  console.log(cyan('ABI: enabled...'))
  const files = await searchJsonFiles('.')
  console.log(cyan(`ABI: Found files - ${(files).length}`))
  if (files.length === 0) {
    return {}
  } else {
    return {
      _abis_: {
        ...Object.fromEntries((files).map((file: AbiFileData) => {
          const fns = file.jsonContent.abi.filter((abi: Abi) => {
            // choose only no args (->FREE) transactions for now
            return abi.type === 'function' // && // is a function
            // abi.inputs.length === 0 && // has no inputs
            // ['view', 'nonpayable'].includes(abi.stateMutability) // is free
          })
          //
          return [file.filePath, Object.fromEntries(fns.map((fn: Abi) => {
            const contractArgs = Object.fromEntries(fn.inputs.map((input: AbiInput) => {
              return [input.name, { $stdin: `Please enter a ${input.name} (type = ${input.type})?` }]
            }))
            return [`${fn.name}(${fn.inputs.map(i => i.name).join(', ')}) [${fn.stateMutability}]`, {
              $env: {
                PROVIDER_URL: {
                  $stdin: 'Please enter a provider url?'
                },
                ...contractArgs
              },
              $internal: async ({ env }: any) => {
                const provider = new ethers.JsonRpcProvider(env.PROVIDER_URL)
                const contract = new ethers.Contract(file.jsonContent.address, file.jsonContent.abi, provider)
                const params = fn.inputs.map(input => env[input.name])
                // console.log(cyan(`calling ${fn.name}(${params.join(', ')})`))
                console.log(await contract[fn.name](...params))
              }
            }]
          }))]
        }))
      }
    }
  }
}
