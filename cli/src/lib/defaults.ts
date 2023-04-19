import path from "path";

export const CONFIG_PATH = path.resolve("hooked.yaml");

export const DEFAULT_CONFIG = {
  env: {
    default: {
      GIT_COMMIT: { $cmd: "git rev-parse --short HEAD" },
      HELLO: { $cmd: 'printf "Hello"' },
      WORLD: "world",
      NAME: {
        $stdin: "What is your name?",
        $default: "Bob",
      },
    },
    spanish: {
      GIT_COMMIT: { $cmd: "git rev-parse --short HEAD" },
      HELLO: "Hola",
      WORLD: "Mundo",
      NAME: "Amigo",
    },
  },
  scripts: {
    say: {
      hello: {
        $cmd: 'echo "${HELLO} ${WORLD}, ${NAME}!"\necho "git commit is -> ($GIT_COMMIT)"\n',
      },
    },
  },
};
