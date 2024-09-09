Feature: CommandLine - stdin

  Scenario: Env matching a stdin must match a value. If not, try to map the env to a name/value pair.
    Given the environment variables
      | SYSTEMID | Jane |
    Given the file hooked.yaml is
      """
      scripts:
        fetch_system_id:
          $env:
            SYSTEMID:
              $ask: What is your first name?
              $choices:
                - {"name":"John", "value":"111"}
                - {"name":"Jane", "value":"222"}
          $cmd: echo Hello, SYSTEMID=${SYSTEMID}!
      """
    When I run the command "node index.ts fetch_system_id --debug --batch"
    Then the command output should be
      """
      Hello, SYSTEMID=222!
      """

  Scenario: Env matching a stdin value will be used.
    Given the environment variables
      | SYSTEMID | 222 |
    Given the file hooked.yaml is
      """
      scripts:
        fetch_system_id:
          $env:
            SYSTEMID:
              $ask: What is your first name?
              $choices:
                - {"name":"John", "value":"111"}
                - {"name":"Jane", "value":"222"}
          $cmd: echo Hello, SYSTEMID=${SYSTEMID}!
      """
    When I run the command "node index.ts fetch_system_id --debug --batch"
    Then the command output should be
      """
      Hello, SYSTEMID=222!
      """

  Scenario: Stdin must match a value. If not, try to map the stdin to a name/value pair.
    Given the file hooked.yaml is
      """
      scripts:
        fetch_system_id:
          $env:
            SYSTEMID:
              $ask: What is your first name?
              $choices:
                - {"name":"John", "value":"111"}
                - {"name":"Jane", "value":"222"}
          $cmd: echo Hello, SYSTEMID=${SYSTEMID}!
      """
    When I run the command "node index.ts fetch_system_id --debug --batch --stdin '{SYSTEMID:\"John\"}'"
    Then the command output should be
      """
      Hello, SYSTEMID=111!
      """

  Scenario: Stdin matching a value, will be used.
    Given the file hooked.yaml is
      """
      scripts:
        fetch_system_id:
          $env:
            SYSTEMID:
              $ask: What is your first name?
              $choices:
                - {"name":"John", "value":"111"}
                - {"name":"Jane", "value":"222"}
          $cmd: echo Hello, SYSTEMID=${SYSTEMID}!
      """
    When I run the command "node index.ts fetch_system_id --debug --batch --stdin '{SYSTEMID:\"111\"}'"
    Then the command output should be
      """
      Hello, SYSTEMID=111!
      """
