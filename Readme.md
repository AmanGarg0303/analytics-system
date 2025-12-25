Tech

-> React.js, Node.js, Express.js, Postgres and Redis in Docker

Steps to start the things:

-> npm i // if node_modules are not present in client and server
-> docker-compose up - d
-> /server -> nodemon server.js
-> /client -> npm run dev

To check data in docker postgres

-> docker ps
-> docker exec -it {containerID} bash
-> su postgres // postgres is username
-> psql
-> \l
-> \c analytics-system
-> \d
-> select \* from button_clicks_daily;
