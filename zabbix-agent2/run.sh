#!/usr/bin/env ash

# Extract config data
CONFIG_PATH=/data/options.json
ZABBIX_SERVER=$(jq --raw-output ".server" "$CONFIG_PATH")
ZABBIX_HOSTNAME=$(jq --raw-output ".hostname" "$CONFIG_PATH")

# Update zabbix-agent config
ZABBIX_CONFIG_FILE=/etc/zabbix/zabbix_agent2.conf
sed -i 's@^#\?\s\?\(Server\(Active\)\?\)=.*@\1='"${ZABBIX_SERVER}"'@' "$ZABBIX_CONFIG_FILE"
sed -i 's/^#\?\s\?\(Hostname\)=.*$/\1='"${ZABBIX_HOSTNAME}"'/' "${ZABBIX_CONFIG_FILE}"

DOCKER_SOCKET=/var/run/docker.sock
DOCKER_GROUP=docker
REGULAR_USER=zabbix

# добавляем юзера zabbix в группу docker в рантайме, 
# т.к. в момент сборки контейнера мы не знаем GID группы docker
if [ -S ${DOCKER_SOCKET} ]; then
    # получаем GID группы docker
    DOCKER_GID=$(stat -c '%g' ${DOCKER_SOCKET})
    # создаем группу
    groupadd -for -g ${DOCKER_GID} ${DOCKER_GROUP}
    # добавляем права
    usermod -aG ${DOCKER_GROUP} ${REGULAR_USER}
fi

# Run zabbix-agent2 in foreground - оригинальная команда exec su zabbix -s /bin/ash -c "zabbix_agent2 -f"
exec su zabbix -s /bin/sh -c "/usr/sbin/zabbix_agent2 -f"
# exec su zabbix -s /bin/sh -c "zabbix_agent2 -f"

# exec zabbix_agent2 -f

