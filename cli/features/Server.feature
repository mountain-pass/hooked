Feature: Server

  Background:
    Given the file hooked.yaml is
      """
      plugins:
        npm: false
      
      env:
        default:
          PLACE: world
      
      scripts:
        hello_world:
          $env:
            GREETING: Hello
          $cmd: echo ${GREETING} ${PLACE}!
          accessRoles: [admin]
      
      server:
        auth:
          type: bcrypt
          salt: $2a$10$nF17SWCfCMdHwLruCnbyKu
      
        users:
          # pw: helloThere
          - username: admin
            password: $2a$10$nF17SWCfCMdHwLruCnbyKuSX7tp2GEpwP.p2T8lwYV34cd5U97zli
            accessRoles: [admin]
          # pw: obi1kenobi
          - username: boba
            password: $2a$10$nF17SWCfCMdHwLruCnbyKuTu8eFWRe61Wj0t6varHj19fxTfOcQ2u
            accessRoles: [user]
      
        dashboards:
          - title: Admin Dashboard
            accessRoles: [admin]
            sections:
              - title: Admin Section
                fields:
                  - label: Say Hello
                    type: button
                    $script: hello_world
          - title: User Dashboard
            accessRoles: [user]
            sections:
              - title: User Section
                fields:
                  - label: Say Hello
                    type: button
                    $script: hello_world
      """
    And I run the command "node index.ts --server"
    And I wait until the server is ready

  Scenario Outline: Anonymous should not be able to see any endpoints
    Then the endpoint <endpoint> should respond <code> with body '<response>'

    Examples:
      | endpoint                          | code | response        |
      | /api/status                       |  200 | {"status":"ok"} |
      | /api/me                           |  401 |                 |
      | /api/env                          |  401 |                 |
      | /api/dashboard/list               |  401 |                 |
      | /api/dashboard/get/My%20Dashboard |  401 |                 |
      | /api/triggers                     |  401 |                 |
      | /api/scripts                      |  401 |                 |
      | /api/scripts/hello_world          |  401 |                 |

  Scenario Outline: Users should be able to see some endpoints
    Then I can login with username boba and password obi1kenobi
    And the endpoint <endpoint> should respond <code> with body '<response>'

    Examples:
      | endpoint                             | code | response                                                                                                                                                         |
      | /api/status                          |  200 | {"status":"ok"}                                                                                                                                                  |
      | /api/me                              |  200 | {"username":"boba","accessRoles":["user"]}                                                                                                                       |
      | /api/env                             |  403 | {"message":"User \\'boba\\' does not have required role \\'admin\\' #2"}                                                                                         |
      | /api/dashboard/list                  |  200 | [{"title":"User Dashboard"}]                                                                                                                                     |
      | /api/dashboard/get/User%20Dashboard  |  200 | {"title":"User Dashboard","accessRoles":["user"],"sections":[{"title":"User Section","fields":[{"label":"Say Hello","type":"button","$script":"hello_world"}]}]} |
      | /api/dashboard/get/Admin%20Dashboard |  403 | {"message":"Dashboard not found or user does not have access."}                                                                                                  |
      | /api/triggers                        |  403 | {"message":"User \\'boba\\' does not have required role \\'admin\\' #2"}                                                                                         |
      | /api/scripts                         |  403 | {"message":"User \\'boba\\' does not have required role \\'admin\\' #2"}                                                                                         |
      | /api/scripts/hello_world             |  200 | {"$env":{"GREETING":"Hello"},"$cmd":"echo ${GREETING} ${PLACE}!","accessRoles":["admin"],"_scriptPath":"hello_world","_scriptPathArray":["hello_world"]}         |
      | /api/run/default/hello_world         |  403 | {"message":"User \\'boba\\' does not have required role \\'admin\\' #1"}                                                                                         |

  Scenario Outline: Admins should be able to see all endpoints
    Then I can login with username admin and password helloThere
    And the endpoint <endpoint> should respond <code> with body '<response>'

    Examples:
      | endpoint                             | code | response                                                                                                                                                                 |
      | /api/status                          |  200 | {"status":"ok"}                                                                                                                                                          |
      | /api/me                              |  200 | {"username":"admin","accessRoles":["admin"]}                                                                                                                             |
      | /api/env                             |  200 | {"default":["PLACE"]}                                                                                                                                                    |
      | /api/dashboard/list                  |  200 | [{"title":"Admin Dashboard"}]                                                                                                                                            |
      | /api/dashboard/get/User%20Dashboard  |  403 | {"message":"Dashboard not found or user does not have access."}                                                                                                          |
      | /api/dashboard/get/Admin%20Dashboard |  200 | {"title":"Admin Dashboard","accessRoles":["admin"],"sections":[{"title":"Admin Section","fields":[{"label":"Say Hello","type":"button","$script":"hello_world"}]}]}      |
      | /api/triggers                        |  200 | []                                                                                                                                                                       |
      | /api/scripts                         |  200 | {"hello_world":{"$env":{"GREETING":"Hello"},"$cmd":"echo ${GREETING} ${PLACE}!","accessRoles":["admin"],"_scriptPath":"hello_world","_scriptPathArray":["hello_world"]}} |
      | /api/scripts/hello_world             |  200 | {"$env":{"GREETING":"Hello"},"$cmd":"echo ${GREETING} ${PLACE}!","accessRoles":["admin"],"_scriptPath":"hello_world","_scriptPathArray":["hello_world"]}                 |
      | /api/run/default/hello_world         |  200 | {"success":true,"finishedAt":<TIMESTAMP_MS>,"envNames":["default"],"paths":["hello_world"],"envVars":{"PLACE":"world","GREETING":"Hello"},"outputs":["Hello world!"]}    |
