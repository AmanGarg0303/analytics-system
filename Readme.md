### Tech

-> React.js, Tailwind, Node.js, Express.js, Postgres and Redis in Docker

### Feature

Analytics system, tracking the number of clicks on the signup and login button, using the navigator sendBeacon and redis increments to keep the data, and an aggregation worker to push the data after an interval into the postgres. 

### Steps to start the things:

-> npm i // if node_modules are not present in client and server
-> docker-compose up - d
-> /server -> nodemon server.js
-> /client -> npm run dev

### To check data in docker postgres

-> docker ps
-> docker exec -it {containerID} bash
-> su postgres // postgres is username
-> psql
-> \l
-> \c analytics-system
-> \d
-> select \* from button_clicks_daily;
