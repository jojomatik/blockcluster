ARG ENVIRONMENT=production

FROM node:24.22.0@sha256:925de64a85319052d6971ae81ef2417da956e8a3a2c4a0fac732327970f017f5 AS builder
# Set working directory.
WORKDIR /usr/games/blockcluster
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

FROM eclipse-temurin:25-alpine@sha256:1e20ead9eec7234db293f1913438090d533ed47c0b9e12dc8c7627a802a44ed6 AS jdk-25
RUN /opt/java/openjdk/bin/jlink --output /opt/jre-25 --compress=2 --no-header-files --no-man-pages --module-path ../jmods --add-modules java.base,java.compiler,java.datatransfer,java.desktop,java.instrument,java.logging,java.management,java.management.rmi,java.naming,java.net.http,java.prefs,java.rmi,java.scripting,java.se,java.security.jgss,java.security.sasl,java.smartcardio,java.sql,java.sql.rowset,java.transaction.xa,java.xml,java.xml.crypto,jdk.crypto.cryptoki,jdk.crypto.ec,jdk.management,jdk.security.auth,jdk.unsupported,jdk.zipfs

FROM eclipse-temurin:21-alpine@sha256:fd52084c35bbac78890d95d57707d31ffc9d7a3324199e89c06be2a9dc71bfa0 AS jdk-21
RUN /opt/java/openjdk/bin/jlink --output /opt/jre-21 --compress=2 --no-header-files --no-man-pages --module-path ../jmods --add-modules java.base,java.compiler,java.datatransfer,java.desktop,java.instrument,java.logging,java.management,java.management.rmi,java.naming,java.net.http,java.prefs,java.rmi,java.scripting,java.se,java.security.jgss,java.security.sasl,java.smartcardio,java.sql,java.sql.rowset,java.transaction.xa,java.xml,java.xml.crypto,jdk.crypto.cryptoki,jdk.crypto.ec,jdk.management,jdk.security.auth,jdk.unsupported,jdk.zipfs

FROM eclipse-temurin:17-alpine@sha256:5a7fe9fcd65085bbf218a4060f08f1346b8bfd13d9f9942e2db6719cc8a11e22 AS jdk-17
RUN /opt/java/openjdk/bin/jlink --output /opt/jre-17 --compress=2 --no-header-files --no-man-pages --module-path ../jmods --add-modules java.base,java.compiler,java.datatransfer,java.desktop,java.instrument,java.logging,java.management,java.management.rmi,java.naming,java.net.http,java.prefs,java.rmi,java.scripting,java.se,java.security.jgss,java.security.sasl,java.smartcardio,java.sql,java.sql.rowset,java.transaction.xa,java.xml,java.xml.crypto,jdk.crypto.cryptoki,jdk.crypto.ec,jdk.management,jdk.security.auth,jdk.unsupported,jdk.zipfs

FROM eclipse-temurin:11-alpine@sha256:0882455dee22412651b49569f90690ff340e1895bef0a3c430ba0fce3249c23f AS jdk-11
RUN /opt/java/openjdk/bin/jlink --output /opt/jre-11 --compress=2 --no-header-files --no-man-pages --module-path ../jmods --add-modules java.base,java.compiler,java.datatransfer,java.desktop,java.instrument,java.logging,java.management,java.management.rmi,java.naming,java.net.http,java.prefs,java.rmi,java.scripting,java.se,java.security.jgss,java.security.sasl,java.smartcardio,java.sql,java.sql.rowset,java.transaction.xa,java.xml,java.xml.crypto,jdk.crypto.cryptoki,jdk.crypto.ec,jdk.management,jdk.unsupported,jdk.zipfs

FROM alpine:3.24@sha256:71e9b7bae160ba167fa17414401b94cbcdaf3c32feeab9298bd794a2a0614c35 AS base
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
RUN apk add --no-cache yarn
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
