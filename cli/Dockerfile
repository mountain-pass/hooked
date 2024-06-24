
# build the project...
FROM node:lts-alpine as build
WORKDIR /project
COPY *.json /project/
RUN npm i --verbose
COPY src src
RUN npm run build
RUN NODE_ENV=production npm ci --omit=dev

# host it...
FROM node:lts-alpine
RUN apk add --no-cache openssl docker-cli
WORKDIR /project
COPY --from=build /project/*.json /project/
COPY --from=build /project/dist /project/
COPY --from=build /project/node_modules /project/node_modules
RUN mkdir /hooked
WORKDIR /hooked

# configure it...
# RUN echo "Australia/Sydney" > /etc/timezone
ENV NODE_ENV production
ENV NODE_OPTIONS --max-old-space-size=2048
ENV SKIP_VERSION_CHECK true
ENV SKIP_CLEANUP false
ENV LOG_LEVEL info
ENV DOCKER_HOOKED_DIR /tmp
EXPOSE 4000
VOLUME ["/hooked"]

# Allow running hooked from `docker run`
ENTRYPOINT ["/usr/local/bin/node", "/project/index.js"]

# By default, run the server with no ssl or apikey
CMD ["--server"]
