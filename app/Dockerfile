FROM node:20-alpine

WORKDIR /opt/devops_labs

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "node migrate.js && node app.js"]