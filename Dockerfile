# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++ openssl

# Define build-time ARG
ARG VITE_CLERK_PUBLISHABLE_KEY

# Set ENV from ARG (so Vite can read it)
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application (including .env if you have it)
COPY . .

# Build the app (Vite reads env vars here)
RUN npm run build

# Expose ports
EXPOSE 3000
EXPOSE 5000

# Start the app
CMD ["npm", "start"]
