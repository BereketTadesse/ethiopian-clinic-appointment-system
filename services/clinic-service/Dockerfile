# Use a lightweight Node.js base image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package.json package-lock.json ./

# Install dependencies in production mode
RUN npm ci --only=production

# Copy application source code
COPY . .

# Service port
EXPOSE 3002

# Start the application
CMD ["npm", "start"]
