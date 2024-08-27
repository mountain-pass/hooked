Feature: CommandLine

  Background:
    Given the environment variables
      | HOSTVAR        | HOST_VAR_RESOLVED    |
      | OTHER_HOST_VAR | SHOULD_NOT_BE_PASSED |
    Given the file hooked.yaml is
      """
      scripts:
        hello_world:
          $cmd: echo Hello world!
      
        slow_output:
          $cmd: |
            echo 1
            sleep 1
            echo 2
      
        ask_name:
          $env:
            YOURNAME:
              $ask: What is your name?
          $cmd: echo Hello ${YOURNAME}
      
      server:
        auth:
          type: bcrypt
          salt: "$2a$10$nF17SWCfCMdHwLruCnbyKu"
      """

  Scenario: Simple hello world
    When I run the command "node index.ts hello_world"
    Then the command output should be
      """
      Hello world!
      """

  Scenario: Should be able to hash a password
    When I run the command "node index.ts -pw helloThere"
    Then the logger.info should be
      """
      $2a$10$nF17SWCfCMdHwLruCnbyKuSX7tp2GEpwP.p2T8lwYV34cd5U97zli
      """

  Scenario: Should stream output to stdout
    When I run the command "node index.ts slow_output" non-blocking
    And the user waits 500 milliseconds
    Then the command output should be
      """
      1
      """
    And the user waits 1000 milliseconds
    Then the command output should be
      """
      1
      2
      """

  Scenario: Should be able to perform stdin
    Given I run the command "node index.ts ask_name" non-blocking
    And the user waits 500 milliseconds
    When the user enters "Jill"
    And the user waits 500 milliseconds
    Then the command output should be
      """
      Hello Jill
      """
