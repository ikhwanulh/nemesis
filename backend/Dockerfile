# Use the official Playwright image which includes Node.js and all needed browser dependencies
FROM mcr.microsoft.com/playwright:v1.50.1-noble

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port (default 3000)
EXPOSE 3000

# Start the application
CMD ["node", "src/server.js"]
