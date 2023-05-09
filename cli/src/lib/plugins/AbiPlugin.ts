import fs from 'fs/promises'
import path from 'path'
import { cyan } from '../colour.js'
import * as ethers from 'ethers'

interface Abi {
  name: string
  type: 'function' | 'event' | 'constructor' | 'fallback'
  inputs: Array<{ name: string, type: string }>
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
            return abi.type === 'function' &&
            abi.inputs.length === 0 &&
            ['view', 'nonpayable'].includes(abi.stateMutability)
          })
          //
          return [file.filePath, Object.fromEntries(fns.map((fn: any) => [fn.name, {
            $env: {
              PROVIDER_URL: {
                $stdin: 'Please enter a provider url?'
              }
            },
            $internal: async ({ env }: any) => {
              const provider = new ethers.JsonRpcProvider(env.PROVIDER_URL)
              const contract = new ethers.Contract(file.jsonContent.address, file.jsonContent.abi, provider)
              console.log(await contract[fn.name]())
            }
          }]))]
        }))
      }
    }
  }
}
