FROM node:alpine

WORKDIR /usr/src/app

# dependencies
COPY package.json yarn.lock .npmrc ./
RUN npm i
RUN git -c http.sslVerify=false clone https://github.com/vishnubob/wait-for-it.git

# source code
COPY . .

# run
EXPOSE 4390
CMD ["node", "./src/index.js"]