import { type Request, type Response } from 'express'
import { isDefinedAny, isFunction } from '../types.js'
import { type AuthorisedUser } from './server.js'

export type AuthorisedRequest = Request & { user: AuthorisedUser }

export type RequestHandler = (req: AuthorisedRequest, res: Response, next?: any) => any
export type AsyncRequestHandler = (req: AuthorisedRequest, res: Response, next?: any) => Promise<any>

const handleError = (err: Error, res: Response): void => {
  console.error(`Caught: ${err.message} - stack=${err.stack ?? ''}`)
  res.status(500)
  res.json({ message: `A server error occurred. ${err.message}${err.message.endsWith('.') ? '' : '.'}` })
  res.end()
}

export const hasRole = (role: string) => (req: Request, res: Response, next: any) => {
  const user = (req as AuthorisedRequest).user
  if (user.accessRoles.includes(role)) {
    next()
  } else {
    res.status(403).json({ message: `User '${user.username}' does not have required role '${role}' #2` })
  }
}

/**
 * Handles (/wraps) error handling for async routes.
 */
export const globalErrorHandler = (delegateFunction: RequestHandler | AsyncRequestHandler): any =>
  async (req: Request, res: Response, next: any) => {
    try {
      const promise = delegateFunction(req as AuthorisedRequest, res, next)
      if (isDefinedAny(promise) && isFunction((promise).catch)) {
        return promise.catch((err: Error) => {
          handleError(err, res)
        })
      }
    } catch (err: any) {
      handleError(err, res)
    }
  }
