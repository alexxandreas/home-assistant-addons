# home-assistant-addons

[![Build](https://github.com/alexxandreas/home-assistant-addons/workflows/Build/badge.svg)](https://github.com/alexxandreas/home-assistant-addons/actions?query=workflow%3ABuild)

Home Assistant addons by Alexandreas

Add to Home Assistant using the repository url: 
https://github.com/alexxandreas/home-assistant-addons


## Разработка
```
cd addon-name
docker build --build-arg BUILD_FROM="homeassistant/amd64-base:latest" -t addon-name .
```

## Релизный процесс
  * апнуть версию плагина в config.json
  * git add
  * git commit
  * git push


## zabbix-agent

Zabbix agent.
