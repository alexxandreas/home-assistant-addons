ARG BUILD_FROM
FROM $BUILD_FROM

ARG BUILD_ARCH
ARG BUILD_VERSION

LABEL maintainer "Alexandreas <alexxandreas@gmail.com>"

ENV LANG C.UTF-8

# Оригинальная команда:
# RUN apk add --no-cache jq zabbix-agent2 && \
    # addgroup -g 1003 docker && \
    # addgroup zabbix docker

# репозиторий для установки usermod (пакет shadow)
RUN echo http://dl-2.alpinelinux.org/alpine/edge/community/ >> /etc/apk/repositories

# Install requirements for add-on
# RUN apk add --no-cache jq zabbix-agent2 docker
RUN apk add --no-cache jq zabbix-agent2 shadow
    # addgroup -g 1003 docker && \
    # addgroup zabbix docker
    # addgroup zabbix 1002 && \
    # apk add docker

# RUN apk add --no-cache jq zabbix-agent2 docker && \
#    addgroup -g 1003 docker && \
#    addgroup zabbix docker

# Copy data for add-on
COPY run.sh /
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
