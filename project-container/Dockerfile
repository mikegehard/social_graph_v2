# Node.js/TypeScript development container
FROM node:20-slim

# Ensure we're root for package installation
USER root

ARG USERNAME=appuser

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m $USERNAME

# Create workspace directory
RUN mkdir -p /workspace && chown -R $USERNAME:$USERNAME /workspace

# Switch to non-root user
USER $USERNAME

WORKDIR /workspace

# Default command
CMD ["node", "--version"]
