FROM alpine:latest

ARG PB_VERSION=0.37.5

RUN apk add --no-cache \
    unzip \
    ca-certificates

# Download and unzip PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# Create directories for data, migrations, and hooks
RUN mkdir -p /pb/pb_data /pb/pb_migrations /pb/pb_hooks

EXPOSE 8095

# Start PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8095"]
