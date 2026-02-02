# Development container for Node.js/TypeScript application
# This container provides the runtime and dev tooling for the app
# Factory layers its tools (Claude, gh, etc.) on top at runtime

FROM node:20-slim

# Install basic development tools
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  jq \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create non-root user for development
ARG USERNAME=appuser
RUN useradd -m $USERNAME && \
  mkdir -p /workspace && \
  chown -R $USERNAME:$USERNAME /workspace

USER $USERNAME
WORKDIR /workspace

# Install TypeScript and ESLint globally for the user
RUN npm install -g typescript eslint

# Verify installations
RUN node --version && npm --version && tsc --version && eslint --version

ENV PATH="/home/${USERNAME}/.npm-global/bin:$PATH"
