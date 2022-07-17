# home-assistant-addons

## Разработка
```
cd screenshotter
docker build --build-arg BUILD_FROM="homeassistant/amd64-base:latest" -t screenshotter:latest .

docker build --build-arg BUILD_FROM="homeassistant/i386-base:latest" -t screenshotter:latest .


docker run --rm --platform linux/x86_64 -d -p 5000:5000 screenshotter
docker run --rm --platform linux/x86_64 -it -p 5000:5000 --name screenshotter screenshotter:latest 
```

