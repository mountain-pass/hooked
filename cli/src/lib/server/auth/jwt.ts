import cookieParser from 'cookie-parser'
import express, { type NextFunction, type Response, type Request } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import passport from 'passport'
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt'
import { isDefined, isUndefined } from '../../types'

// lazy init

function cookieExtractor (req: Request & { cookies: boolean }): string | null {
  if (typeof req?.cookies !== 'undefined') {
    return req.cookies[jwtOptions.jwtCookieName]
    // return req.signedCookies[jwtOptions.jwtCookieName]
  } else {
    return null
  }
};

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
  secretOrKey: 'SECRET_KEY',
  issuer: 'www.localhost',
  audience: 'api.localhost',
  /** max age in seconds */
  expiresIn: 86400,
  jwtCookieName: 'jwt'
}

export type HookedJwtPayload = JwtPayload & { username: string, roles: string[] }

interface AuthRequest {
  username: string
  password: string
}

/** Authenticates the user credentials. */
type UserAuthenticator = (authRequest: AuthRequest) => HookedJwtPayload | undefined

/** Verifies the JWT payload matches a valid user. */
type RequestAuthoriser = (jwtPayload: HookedJwtPayload) => HookedJwtPayload | undefined

/**
 * Checks whether the JWT token is valid.
 */
const getJwtStrategy = (authoriser: RequestAuthoriser): JwtStrategy => {
  const { jwtFromRequest, secretOrKey, issuer, audience } = jwtOptions
  return new JwtStrategy({ jwtFromRequest, secretOrKey, issuer, audience }, (jwtPayload: any, done) => {
    try {
      const user = authoriser(jwtPayload)
      if (isDefined(user)) {
        done(null, user)
      } else {
        done('Unknown user.', false)
      }
    } catch (err: any) {
      console.error('Authoriser error.', err)
      done('Server error.', false)
    }
  })
}

const initialise = (
  app: express.Application,
  authenticator: UserAuthenticator,
  authoriser: RequestAuthoriser
): void => {
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser(jwtOptions.secretOrKey))
  passport.use(getJwtStrategy(authoriser))
  app.use(passport.initialize())

  // login
  app.post('/auth/login', (req, res) => {
    try {
      const user = authenticator(req.body)
      if (isDefined(user)) {
        const token = createJwtToken(user)
        return res.cookie('jwt', token,
          {
          // domain: '.localhost:3000',
            httpOnly: true, // no js access!
            secure: process.env.NODE_ENV === 'production',
            signed: false, // jwt will do the signing
            maxAge: jwtOptions.expiresIn * 1000
          }
        )
          .status(200)
          .json({ message: 'Login successful.' })
      }
      return res.status(401).json({ message: 'Unauthorised' })
    } catch (err: any) {
      console.error('Authenticator error', err)
      return res.status(500).json({ message: 'Server error' })
    }
  })

  // logout
  app.get('/auth/logout', (req, res) => {
    res
      .clearCookie(jwtOptions.jwtCookieName)
      .status(200)
      .json({ message: 'You have logged out.' })
  })
}

const createJwtToken = (jwtPayload: HookedJwtPayload): string => {
  const { issuer, audience, expiresIn } = jwtOptions
  // add any other data you want in here...
  const token = jwt.sign(jwtPayload, jwtOptions.secretOrKey, { issuer, audience, expiresIn })
  return token
}

/** Verifies the JWT token issuer, audience, and expiry. */
const requireSigninMiddleware: (req: Request, res: Response, next: NextFunction) => any = (req, res, next) => {
  passport.authenticate(jwtOptions.jwtCookieName, { session: false }, (err: any, user: any, info: any) => {
    if (isDefined(err) || isUndefined(user) || user === false) {
      return res.status(401).json({ message: 'Unauthorised' })
    }
    req.user = user
    next()
  })(req, res, next)
}

export default {
  initialise,
  requireSigninMiddleware
}
