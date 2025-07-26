FROM golang:1.24.5 as build
WORKDIR /src
COPY go.* ./
RUN go mod download
COPY . . 
RUN CGO_ENABLED=0 go build -o /db-broker .

FROM gcr.io/distroless/static:nonroot 
COPY --from=build /db-broker /db-broker
USER 65532:65532
ENTRYPOINT ["/db-broker"]
