# Use Node.js 22 with Alpine Linux (most secure option)
FROM node:22-alpine

# Install additional tools using Alpine's package manager (apk)
RUN apk update && apk add --no-cache \
       git \
       curl \
       wget \
       ca-certificates \
    && npm install -g tfx-cli

# Set the default user to node (non-root)
USER node

# Set working directory
WORKDIR /workspace
