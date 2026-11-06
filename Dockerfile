ARG ENVIRONMENT=production

FROM node:26.13.0@sha256:6d2c7d5d074bf72f81ddc252b4fbb5d625bc028eeda49cb4b8c2ff8eda1ee617 AS builder
# Set working directory.
WORKDIR /usr/games/blockcluster
# Node.js 25+ no longer bundles yarn.
RUN npm install -g --ignore-scripts yarn@1.22.22
# Copy package.json and yarn.lock and install dependencies, before copying the rest. This is more efficient as only changes to these files require a new yarn install.
COPY package.json yarn.lock ./
# The postinstall script prepares nuxt, which requires its config and the following directories.
COPY nuxt.config.ts vuetify-options.ts tsconfig.json ./
COPY locales ./locales/
RUN yarn install --frozen-lockfile
# Copy app source.
COPY app ./app/
COPY server ./server/
COPY shared ./shared/
COPY public ./public/
# Copy license.
COPY LICENSE ./
# Store git commit and ref and build.
ARG git_sha=development
ARG git_ref=
ENV GIT_SHA=$git_sha
ENV GIT_REF=$git_ref
RUN yarn build

FROM eclipse-temurin:25-alpine@sha256:c7c3d0bdf7f2bbc5a05a6712ed334d198360105634ea9adf76fca94f381b1e3f AS jdk-25
RUN /opt/java/openjdk/bin/jlink --output /opt/jre-25 --compress=2 --no-header-files --no-man-pages --module-path ../jmods --add-modules java.base,java.compiler,java.datatransfer,java.desktop,java.instrument,java.logging,java.management,java.management.rmi,java.naming,java.net.http,java.prefs,java.rmi,java.scripting,java.se,java.security.jgss,java.security.sasl,java.smartcardio,java.sql,java.sql.rowset,java.transaction.xa,java.xml,java.xml.crypto,jdk.crypto.cryptoki,jdk.crypto.ec,jdk.management,jdk.security.auth,jdk.unsupported,jdk.zipfs

FROM eclipse-temurin:21-alpine@sha256:82801f9dcdcbad5a05082aba8c86d1da5b72ccb498e71318b1f91b5a477887b3 AS jdk-21
RUN /opt/java/openjdk/bin/jlink --output /opt/jre-21 --compress=2 --no-header-files --no-man-pages --module-path ../jmods --add-modules java.base,java.compiler,java.datatransfer,java.desktop,java.instrument,java.logging,java.management,java.management.rmi,java.naming,java.net.http,java.prefs,java.rmi,java.scripting,java.se,java.security.jgss,java.security.sasl,java.smartcardio,java.sql,java.sql.rowset,java.transaction.xa,java.xml,java.xml.crypto,jdk.crypto.cryptoki,jdk.crypto.ec,jdk.management,jdk.security.auth,jdk.unsupported,jdk.zipfs

FROM eclipse-temurin:17-alpine@sha256:5a7fe9fcd65085bbf218a4060f08f1346b8bfd13d9f9942e2db6719cc8a11e22 AS jdk-17
RUN /opt/java/openjdk/bin/jlink --output /opt/jre-17 --compress=2 --no-header-files --no-man-pages --module-path ../jmods --add-modules java.base,java.compiler,java.datatransfer,java.desktop,java.instrument,java.logging,java.management,java.management.rmi,java.naming,java.net.http,java.prefs,java.rmi,java.scripting,java.se,java.security.jgss,java.security.sasl,java.smartcardio,java.sql,java.sql.rowset,java.transaction.xa,java.xml,java.xml.crypto,jdk.crypto.cryptoki,jdk.crypto.ec,jdk.management,jdk.security.auth,jdk.unsupported,jdk.zipfs

FROM eclipse-temurin:11-alpine@sha256:d4e76d3c96624f1aee917150729a3ac0cd35f61390bb1935825461db1b2126a3 AS jdk-11
RUN /opt/java/openjdk/bin/jlink --output /opt/jre-11 --compress=2 --no-header-files --no-man-pages --module-path ../jmods --add-modules java.base,java.compiler,java.datatransfer,java.desktop,java.instrument,java.logging,java.management,java.management.rmi,java.naming,java.net.http,java.prefs,java.rmi,java.scripting,java.se,java.security.jgss,java.security.sasl,java.smartcardio,java.sql,java.sql.rowset,java.transaction.xa,java.xml,java.xml.crypto,jdk.crypto.cryptoki,jdk.crypto.ec,jdk.management,jdk.unsupported,jdk.zipfs

FROM alpine:3.24@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a AS base
RUN apk --no-cache add curl
RUN apk add --no-cache java-cacerts
ENV JAVA_HOME=/opt/java
ENV PATH=/opt/java/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
COPY --from=jdk-25 /opt/jre-25 /opt/java-25
COPY --from=jdk-21 /opt/jre-21 /opt/java-21
COPY --from=jdk-17 /opt/jre-17 /opt/java-17
COPY --from=jdk-11 /opt/jre-11 /opt/java-11
RUN ln -s /opt/java-25 /opt/java
RUN apk add --no-cache nodejs
# Set working directory.
WORKDIR /usr/games/blockcluster
COPY LICENSE README.md ./
# Create servers directory to prevent errors.
RUN mkdir servers

FROM base AS base-production

FROM base AS base-develop
# Copy package.json and yarn.lock and install all dependencies.
COPY package.json yarn.lock ./
COPY nuxt.config.ts vuetify-options.ts tsconfig.json ./
COPY locales ./locales/
RUN apk add --no-cache npm && npm install -g --ignore-scripts yarn@1.22.22
RUN yarn install --frozen-lockfile

# Create cache and build directories with the blockcluster user as the owner.
RUN mkdir -p node_modules/.cache .nuxt .data
RUN chown -R 1080:1080 node_modules/.cache .nuxt .data

FROM base-${ENVIRONMENT}
COPY --from=builder /usr/games/blockcluster/.output .output

# Add group and user
RUN addgroup -S blockcluster -g 1080 && \
    adduser -S blockcluster -G blockcluster -u 1080 && \
    chown blockcluster:blockcluster servers
USER blockcluster

ENV NITRO_PORT=8081
ENV NITRO_HOST=0.0.0.0
EXPOSE 8081
HEALTHCHECK --timeout=3s \
  CMD curl -f http://localhost:8081/ || exit 1

CMD ["node", ".output/server/index.mjs"]
