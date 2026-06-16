FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY src ./src
COPY .env .env

EXPOSE 3002

CMD ["npm", "start"]
