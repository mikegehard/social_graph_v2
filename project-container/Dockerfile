# Node.js/TypeScript development container
FROM node:20-slim

# Ensure we're root for package installation
USER root

ARG USERNAME=appuser

# Install system dependencies (sudo required for docker-in-docker feature)
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  sudo \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install global TypeScript tooling (required for inner-loop checks)
RUN npm install -g typescript@5.6.3

# Create non-root user with sudo access (required for docker-in-docker feature)
RUN useradd -m $USERNAME && \
    echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$USERNAME && \
    chmod 0440 /etc/sudoers.d/$USERNAME

# Create workspace directory
RUN mkdir -p /workspace && chown -R $USERNAME:$USERNAME /workspace

# Switch to non-root user
USER $USERNAME

WORKDIR /workspace

# Default command
CMD ["node", "--version"]
