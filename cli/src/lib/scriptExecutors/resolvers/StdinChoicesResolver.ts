import jp from 'jsonpath'
import {
  isDefined, isObject, isScript, isStdinScriptFieldsMapping, isString,
  type RuntimeContext,
  type StdinScript, type StdinScriptFieldsMapping
} from '../../types.js'
import { InvalidConfigError, resolveScript } from '../ScriptExecutor.js'

export type StdinChoicesResolverReturnType = Array<(string | number | boolean | StdinScriptFieldsMapping)>

export const StdinChoicesResolver = async (
  key: string,
  script: StdinScript,
  runtimeContext: RuntimeContext
): Promise<StdinChoicesResolverReturnType | undefined> => {
  let choices = script.$choices

  // resolve choices if they are a script
  if (isScript(choices)) {
    choices = await resolveScript(
      key, choices, runtimeContext.stdin, runtimeContext.env, runtimeContext.config, runtimeContext.options, runtimeContext.envVars, false, false)
    if (typeof choices === 'string') {
      try {
        // try (STRICT!) json to parse input...
        choices = JSON.parse(choices)
      } catch (err: any) {
        // could not parse as json, use string instead...
      }
    }
  }

  // post process choices
  if (isString(choices)) {
    choices = (choices).split('\n').map((choice: string | boolean | number) => ({ name: String(choice), value: String(choice) }))
  } else if (isObject(choices) && !Array.isArray(choices)) {
    choices = Object.entries(choices).map(([name, value]) => ({ name, value }))
  } else if (Array.isArray(choices)) {
    if (choices.length === 0) {
      throw new Error('Invalid $choices, must be a non-empty array')
    }
    if (isObject(choices[0]) || isStdinScriptFieldsMapping(choices[0])) {
      // do nothing
    } else {
      // ensure name is a string
      choices = choices.map((choice: string | boolean | number | any) => {
        return { name: String(choice), value: String(choice) }
      })
    }
  }

  // apply field mappings
  if (isDefined(choices) && isStdinScriptFieldsMapping(script.$fieldsMapping)) {
    const mapping = script.$fieldsMapping
    choices = choices.map((choice: any) => {
      const newChoice: any = {}
      // if a 'name' mapping is provided, check that it resolves to a defined object
      if (isString(mapping.name)) {
        if (isDefined(choice[mapping.name])) {
          newChoice.name = String(choice[mapping.name])
        } else if (isDefined(jp.value(choice, mapping.name))) {
          newChoice.name = String(jp.value(choice, mapping.name))
        } else {
          throw new InvalidConfigError(`Invalid $fieldsMapping.name, '${mapping.name}' does not resolve - ${JSON.stringify(choice)}`)
        }
      }
      // if a 'value' mapping is provided, check that it resolves to a defined object
      if (isString(mapping.value)) {
        if (isDefined(choice[mapping.value])) {
          newChoice.value = String(choice[mapping.value])
        } else if (isDefined(jp.value(choice, mapping.value))) {
          newChoice.value = String(jp.value(choice, mapping.value))
        } else {
          throw new InvalidConfigError(`Invalid $fieldsMapping.value, '${mapping.value}' does not resolve - ${JSON.stringify(choice)}`)
        }
      }
      return newChoice
    })
  }

  // apply filters and sorting
  if (typeof choices !== 'undefined' && choices !== null && choices.length > 0) {
    // sort, if requested
    if (script.$sort === 'alpha') {
      choices.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    } else if (script.$sort === 'alphaDesc') {
      choices.sort((a: any, b: any) => b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }))
    }
    // filter, if requested
    if (isString(script.$filter)) {
      const regexStr = script.$filter
      // by default, assume not a fully qualified regex...
      let pattern = regexStr
      let flags = 'im' // NOTE using 'g' will save state!
      // if a fully qualified regex, parse it
      if (regexStr.startsWith('/')) {
        pattern = regexStr.slice(1, regexStr.lastIndexOf('/'))
        flags = regexStr.slice(regexStr.lastIndexOf('/') + 1)
      }
      const regex = new RegExp(pattern, flags)
      return choices.filter((choice: any) => regex.test(choice.name))
    }
    return choices
  }
}
