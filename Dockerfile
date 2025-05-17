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
RUN cd src/client && npx vite build

# Ensure the CSS directory exists
RUN mkdir -p /app/src/client/dist/assets

# Copy public CSS to dist/assets to ensure we have a CSS file
RUN cp /app/src/client/public/main.css /app/src/client/dist/assets/index.css

# Expose the port the app runs on
EXPOSE 8080

# Create a startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'node src/server/db/setupDatabase.js' >> /app/start.sh && \
    echo 'node src/server/db/migrate.js' >> /app/start.sh && \
    echo 'node src/server/index.js' >> /app/start.sh && \
    chmod +x /app/start.sh

# Start the app with the startup script
CMD ["/app/start.sh"] 