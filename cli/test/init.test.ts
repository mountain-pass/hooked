/* eslint-disable no-template-curly-in-string */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import { describe } from 'mocha'
import { generateAdvancedBlankTemplateFileContents, generateBlankTemplateFileContents } from '../src/lib/init.js'
chai.use(chaiAsPromised)
const { expect } = chai


describe('init', () => {

    it('blank - a blank template should look like this', async () => {
      const result = generateBlankTemplateFileContents()
      expect(result).to.eql(`#
# Hooked configuration file
# See https://github.com/mountain-pass/hooked for more information.
#
# To install the cli: npm i -g @mountainpass/hooked-cli
# To enable yaml validation: https://github.com/mountain-pass/hooked/blob/main/_CONFIG.md#recommended---enable-yaml-schema
#

env:
  default:
    GREETING: Hello
scripts:
  say:
    $cmd: echo "$\{GREETING\}!"
  generate_ssl_certificates:
    $cmd: |-
      #!/bin/sh -e
      openssl req -x509 -newkey rsa:2048 -nodes -keyout hooked-key.pem -new -out hooked-cert.pem -subj /CN=localhost -days 3650
      echo Files hooked-cert.pem and hooked-key.pem successfully written!
  docker_test:
    $image: alpine
    $cmd: echo "Docker worked - Alpine $(cat /etc/alpine-release)!"
`)
    })

    it('blank - an advanced blank template should look like this', async () => {
      const result = generateAdvancedBlankTemplateFileContents()
      expect(result).to.eql(`#
# Hooked configuration file
# See https://github.com/mountain-pass/hooked for more information.
#
# To install the cli: npm i -g @mountainpass/hooked-cli
# To enable yaml validation: https://github.com/mountain-pass/hooked/blob/main/_CONFIG.md#recommended---enable-yaml-schema
#

env:
  default:
    GREETING:
      $ask: What country do you prefer?
      $choices:
        germany: Guten tag
        france: Bonjour
        spain: Hola
        england: Good day
      $sort: alpha
    YOURNAME:
      $ask: "What is your name? (Hint: set YOURNAME to avoid prompt):"
      $default: Bob
    HOMEPATH:
      $cmd: set -u && echo $HOME
scripts:
  say:
    $cmd: echo "\${GREETING} \${YOURNAME}! There is no place like \${HOMEPATH}."
`)
    })

})
