import { toJsonSchema7Type } from './HookedSchema'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// console.log(JSON.stringify(toSchema(), null, 2))

const currentDir = path.dirname(fileURLToPath(import.meta.url))
console.log(`currentDir: ${currentDir}`)

fs.writeFileSync(
  path.join(currentDir, '../../../schemas/hooked.yaml.schema-v2.json'),
  JSON.stringify(toJsonSchema7Type(), null, 2)
)
