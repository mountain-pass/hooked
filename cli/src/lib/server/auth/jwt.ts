import cookieParser from 'cookie-parser'
import express, { NextFunction, Response, type Request } from 'express'
import jwt from 'jsonwebtoken'
import passport from 'passport'
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt'

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

type JwtPayload = any

interface AuthRequest {
  username: string
  password: string
}

/** Verifies the JWT payload matches a valid user. */
type RequestAuthoriser = (jwtPayload: JwtPayload) => JwtPayload | undefined
/** Authenticates the user credentials. */
type UserAuthenticator = (authRequest: AuthRequest) => JwtPayload | undefined

const getJwtStrategy = (authoriser: RequestAuthoriser): JwtStrategy => {
  const { jwtFromRequest, secretOrKey, issuer, audience } = jwtOptions
  return new JwtStrategy({ jwtFromRequest, secretOrKey, issuer, audience }, async (jwtPayload: any, done) => {
    const user = authoriser(jwtPayload)
    if (typeof user === 'undefined') {
      return done('Unknown user', false)
    }
    // all ok
    return done(null, user)
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
    const user = authenticator(req.body)
    if (typeof user !== 'undefined') {
      const token = createJwtToken(user)
      console.debug(`Creating jwt token - maxAge=${jwtOptions.expiresIn} secure=${process.env.NODE_ENV === 'production'}`)
      return res.cookie('jwt', token,
        {
          // domain: '.localhost:3000',
          httpOnly: true, // no js access!
          secure: process.env.NODE_ENV === 'production',
          signed: false,  // jwt will do the signing
          maxAge: jwtOptions.expiresIn * 1000
        }
      )
        .status(200)
        .json({ message: 'Login successful.' })
    }
    return res.status(401).json({ message: 'Unauthorised' })
  })

  // logout
  app.get('/auth/logout', (req, res) => {
    if (typeof req.cookies[jwtOptions.jwtCookieName] !== 'undefined') {
      res
        .clearCookie(jwtOptions.jwtCookieName)
        .status(200)
        .json({ message: 'You have logged out.' })
    } else {
      res.status(401).json({ message: 'Invalid jwt' })
    }
  })
}

const createJwtToken = (jwtPayload: any): string => {
  const { issuer, audience, expiresIn } = jwtOptions
  // add any other data you want in here...
  const token = jwt.sign(jwtPayload, jwtOptions.secretOrKey, { issuer, audience, expiresIn })
  return token
}

/** Verifies the JWT token issuer, audience, and expiry. */
const requireSigninMiddleware: (req: Request, res: Response, next: NextFunction) => any = (req, res, next) => {
  passport.authenticate(jwtOptions.jwtCookieName, { session: false }, (err: any, user: any, info: any) => {
    if (err || !user) {
      return res.status(401).json({ message: 'Unauthorised' });
    }
    return next();

  })(req, res, next)
}

export default {
  initialise,
  requireSigninMiddleware
}
