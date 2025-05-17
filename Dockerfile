FROM node:18-alpine

WORKDIR /app

# Copy package.json files and install dependencies
COPY package*.json ./
RUN npm install

# Copy client package.json and install dependencies
COPY src/client/package*.json ./src/client/
RUN cd src/client && npm install

# Copy the rest of the application
COPY . .

# Build the client
RUN npm run build

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["npm", "start"] 