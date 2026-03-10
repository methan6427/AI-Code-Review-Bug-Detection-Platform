FROM node:20

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build --workspace backend
EXPOSE 4000
CMD [ "npm", "run", "start", "--workspace", "backend" ]
