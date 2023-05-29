import { type ResolvedEnv } from '../types.js'
import { executeCmd } from './$cmd.js'

// lazy initialise variable, but then cache it for future invocations
let dockerExists: boolean | undefined

const verifyDockerExists = (onetimeEnvironment: ResolvedEnv, env: ResolvedEnv): void => {
  if (dockerExists !== true) {
    try {
      // eslint-disable-next-line no-template-curly-in-string
      executeCmd({ $cmd: 'which ${DOCKER_BIN=docker}' }, { env: onetimeEnvironment }, env)
      dockerExists = true
    } catch (e: any) {
      // eslint-disable-next-line max-len
      throw new Error('Docker not found (required by `$image`). Please specify the location using `DOCKER_BIN`, or install: https://docs.docker.com/engine/install/')
    }
  } else {
    // I don't if the previous error will ever be ignored, but here it is again just in case!
    // eslint-disable-next-line max-len
    throw new Error('Docker not found (required by `$image`). Please specify the location using `DOCKER_BIN`, or install: https://docs.docker.com/engine/install/')
  }
}

export default { verifyDockerExists }
