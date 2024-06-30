ARG VERSION=latest

# host it...
FROM node:lts-alpine
RUN apk add --no-cache openssl curl docker-cli
RUN npm i -g @mountainpass/hooked-cli@${VERSION}
WORKDIR /hooked

# configure it...
ENV NODE_ENV production
ENV NODE_OPTIONS --max-old-space-size=2048
EXPOSE 4000

# Allow running hooked from `docker run`
ENTRYPOINT ["j"]

# By default, run the server with no ssl or apikey
CMD ["--server"]
