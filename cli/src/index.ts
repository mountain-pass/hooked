#!/usr/bin/env node
import program from './lib/program.js'
program().catch(err => { console.error(err) })
