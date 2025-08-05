FROM golang:1.24-alpine as build
WORKDIR /src

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build with optimizations
RUN --mount=type=cache,id=gomod,target=/go/pkg/mod \
    --mount=type=cache,id=gobuild,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags='-s -w' -o /db-broker .

FROM gcr.io/distroless/static:nonroot 
COPY --from=build /db-broker /db-broker
USER 65532:65532
ENTRYPOINT ["/db-broker"]
