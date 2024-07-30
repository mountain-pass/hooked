
# host it...
FROM node:current-alpine3.20
RUN apk add --no-cache openssl curl docker-cli
# RUN apk add --no-cache openssl=3.3.1-r1 curl=8.8.0-r0 docker-cli=26.1.3-r1
ARG HOOKED_TAG=NOT_A_VALID_LIBRARY
RUN npm i -g ${HOOKED_TAG}
WORKDIR /hooked

# configure it...
ENV NODE_ENV production
ENV NODE_OPTIONS --max-old-space-size=2048
EXPOSE 4000

# Allow running hooked from `docker run`
ENTRYPOINT ["j"]

# By default, run the server with no ssl or apikey
CMD ["--server"]
