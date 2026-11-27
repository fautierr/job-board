import express, { type Express } from 'express'
import { cors } from './middlewares/cors'
import { errorHandler } from './middlewares/error-handler'
import {
  applicationsRouter,
  myApplicationsRouter,
} from './modules/applications/applications.routes'
import { authRouter } from './modules/auth/auth.routes'
import { myOffersRouter, offersRouter } from './modules/offers/offers.routes'
import { NotFoundError } from './shared/errors'
import morgan from 'morgan'

export function createApp(): Express {
  const app = express()

  app.use(cors)
  app.use(express.json())
  app.use(morgan('dev'))
  app.use('/api/auth', authRouter)
  app.use('/api/offers', offersRouter)
  app.use('/api/offers', applicationsRouter)
  app.use('/api/me/offers', myOffersRouter)
  app.use('/api/me/applications', myApplicationsRouter)

  app.use((_req, _res, next) => {
    next(new NotFoundError())
  })

  app.use(errorHandler)

  return app
}
