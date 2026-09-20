FROM nginx:stable-alpine

LABEL org.opencontainers.image.title="Xin Arcade Games" \
    org.opencontainers.image.vendor="Xin, Inc." \
    org.opencontainers.image.description="Game directory for Xin Arcade; base image for the five game containers."

COPY index.html style.css script.js /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
