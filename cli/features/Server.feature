Feature: Server

  Scenario: Should allow me to login
    Given the file hooked.yaml is
      """
      scripts:
        hello_world:
          $cmd: echo Hello world!
      
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
    And the endpoint /api/me should respond
      """
      {
        "username": "admin",
        "accessRoles": ["admin"]
      }
      """
