Feature: Server - Scripts

  Background:
    Given the file hooked.yaml is
      """
      plugins:
        npm: false
      
      scripts:
        hello_world:
          $cmd: echo Hello world!
        slow_hello_world:
          $cmd: |
            sleep 1
            echo Hello world!
      
      server:
        auth:
          type: bcrypt
          salt: $2a$10$nF17SWCfCMdHwLruCnbyKu
      
        users:
          - username: admin
            password: $2a$10$nF17SWCfCMdHwLruCnbyKuSX7tp2GEpwP.p2T8lwYV34cd5U97zli
            accessRoles: [admin]
      """
    And I run the command "node index.ts --server"
    And I wait until the server is ready
    Then I can login with username admin and password helloThere

  Scenario: Scripts should be performant
    Then the endpoints should all respond within 0 seconds
      | /api/run/default/hello_world |

  Scenario: Scripts should be non-blocking and run in parallel
    Then the endpoints should all respond within 1 seconds
      | /api/run/default/slow_hello_world |
      | /api/run/default/slow_hello_world |
      | /api/run/default/slow_hello_world |
      | /api/run/default/slow_hello_world |
      | /api/run/default/slow_hello_world |
