FROM openjdk:17-alpine
RUN apk add --update nodejs npm
CMD ["java", "-version"]