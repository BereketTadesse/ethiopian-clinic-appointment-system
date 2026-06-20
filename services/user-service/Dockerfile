# Use a stable Node LTS base image
FROM node:20-slim

# Set working directory inside the container
WORKDIR /app

# Copy package files first for dependency install caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy the application source code
COPY ./src ./src

# The service listens on the Render-assigned PORT environment variable
EXPOSE 3001

# Use the start script from package.json
CMD ["npm", "start"]
