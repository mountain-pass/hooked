Feature: CommandLine

  Background:
    Given the environment variables
      | HOSTVAR        | HOST_VAR_RESOLVED    |
      | OTHER_HOST_VAR | SHOULD_NOT_BE_PASSED |

  Scenario: Simple hello world
    Given the file hooked.yaml is
      """
      scripts:
        hello_world:
          $cmd: echo Hello world!
      """
    When I run the command "node index.ts hello"
    Then the output should be
      """
      Hello world!
      """

  Scenario: Should be able to hash a password
    Given the file hooked.yaml is
      """
      server:
        auth:
          type: bcrypt
          salt: "$2a$10$nF17SWCfCMdHwLruCnbyKu"
      """
    When I run the command "node index.ts -pw helloThere"
    Then the output should be
      """
      $2a$10$nF17SWCfCMdHwLruCnbyKuSX7tp2GEpwP.p2T8lwYV34cd5U97zli
      """
