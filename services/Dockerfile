FROM node:20-alpine

WORKDIR /app

# The build arg determines which service we are building
ARG SERVICE_NAME

# Install root dependencies
COPY package*.json ./
COPY turbo.json ./

# Copy packages
COPY packages/ ./packages/

# Copy the specific service
COPY services/${SERVICE_NAME}/ ./services/${SERVICE_NAME}/

# Install dependencies (workspaces will link packages)
RUN npm install

WORKDIR /app/services/${SERVICE_NAME}
RUN npm run build

# Start the service
CMD ["npm", "start"]
