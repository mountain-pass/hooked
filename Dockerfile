

# host it...
FROM node:lts-alpine
RUN apk add --no-cache openssl curl docker-cli
RUN npm i -g @mountainpass/hooked-cli
WORKDIR /hooked

# configure it...
ENV NODE_ENV production
ENV NODE_OPTIONS --max-old-space-size=2048
ENV SKIP_VERSION_CHECK true
ENV SKIP_CLEANUP false
ENV LOG_LEVEL info
ENV DOCKER_HOOKED_DIR /tmp
EXPOSE 4000
VOLUME ["/hooked"]

# Allow running hooked from `docker run`
ENTRYPOINT ["j"]

# By default, run the server with no ssl or apikey
CMD ["--server"]
