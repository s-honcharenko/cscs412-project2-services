FROM nginx:stable-alpine

COPY portal/ /usr/share/nginx/html/portal/
COPY snake/ /usr/share/nginx/html/snake/
COPY stack/ /usr/share/nginx/html/stack/
COPY rocks/ /usr/share/nginx/html/rocks/
COPY invaders/ /usr/share/nginx/html/invaders/
COPY 2048/ /usr/share/nginx/html/2048/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080 8091 8092 8093 8094 8095
CMD ["nginx", "-g", "daemon off;"]
