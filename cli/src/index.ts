#!/usr/bin/env node
import program from './lib/program.js'
import logger from './lib/utils/logger.js'

program().catch(err => {
    logger.error(err)
    // allow time to log
    setTimeout(() => process.exit(1), 100)
})
