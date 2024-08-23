/* eslint-disable no-template-curly-in-string */
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe } from 'mocha'
import { generateBlankTemplateFileContents } from '../src/lib/initialisers.js'
chai.use(chaiAsPromised)
const { expect } = chai


describe('init', () => {

    it('blank - a blank template should look like this', async () => {
      const result = generateBlankTemplateFileContents('THIS_IS_SALT')
      expect(result).to.eql(`#
# Hooked configuration file
# See https://github.com/mountain-pass/hooked for more information.
#
# To install the cli: npm i -g @mountainpass/hooked-cli
# To enable yaml validation: https://github.com/mountain-pass/hooked/blob/main/_CONFIG.md#recommended---enable-yaml-schema
#

imports:
  - ./imports/*.{yaml,yml}?
env:
  default:
    GREETING: Hello
scripts:
  say_hello:
    $cmd: echo "$\{GREETING\}!"
  docker_test:
    $image: alpine
    $cmd: echo "Docker worked - Alpine $(cat /etc/alpine-release)!"
server:
  auth:
    type: bcrypt
    salt: THIS_IS_SALT
  users:
    - username: admin
      password: <HASH_YOUR_PASSWORD>
      accessRoles:
        - admin
  dashboards:
    - title: My Dashboard
      accessRoles:
        - admin
      sections:
        - title: My Section
          fields:
            - label: Say Hello
              type: button
              $script: say_hello
            - label: Show Docker Output
              type: display
              $script: docker_test
`)
    })

})
