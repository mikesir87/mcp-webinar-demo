const { PostgreSqlContainer } = require("@testcontainers/postgresql");
const { KafkaContainer } = require("@testcontainers/kafka");
const { LocalstackContainer } = require("@testcontainers/localstack");
const path = require("path");

async function createAndBootstrapPostgresContainer() {
  const postgresContainer = await new PostgreSqlContainer("postgres:17.6")
    .withCopyFilesToContainer([
      {
        source: path.join(__dirname, "../../dev/db/1-create-schema.sql"),
        target: "/docker-entrypoint-initdb.d/1-create-schema.sql",
        readOnly: true,
      },
    ])
    .start();

  // Configure the pg library
  process.env.PGUSER = postgresContainer.getUsername();
  process.env.PGPASSWORD = postgresContainer.getPassword();
  process.env.PGHOST = postgresContainer.getHost();
  process.env.PGPORT = postgresContainer.getPort();
  process.env.PGDATABASE = postgresContainer.getDatabase();

  return postgresContainer;
}

async function createAndBootstrapKafkaContainer() {
  const kafkaContainer = await new KafkaContainer("confluentinc/cp-kafka:7.8.0")
    .withKraft()
    .withExposedPorts(9093)
    .start();

  process.env.KAFKA_BOOTSTRAP_SERVERS = `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(9093)}`;

  await kafkaContainer.exec(
    "kafka-topics --create --topic products --partitions 1 --replication-factor 1 --bootstrap-server localhost:9092",
  );

  return kafkaContainer;
}

async function createAndBootstrapLocalstackContainer() {
  const localstackContainer = await new LocalstackContainer(
    "localstack/localstack:4.3.0",
  ).start();

  process.env.AWS_ENDPOINT_URL = localstackContainer.getConnectionUri();
  process.env.AWS_REGION = "us-east-1";
  process.env.AWS_ACCESS_KEY_ID = "test";
  process.env.AWS_SECRET_ACCESS_KEY = "test";
  process.env.PRODUCT_IMAGE_BUCKET_NAME = "product-images";

  const bucketCreateRequest = await localstackContainer.exec(
    `awslocal s3api create-bucket --bucket ${process.env.PRODUCT_IMAGE_BUCKET_NAME}`,
  );
  expect(bucketCreateRequest.exitCode).toBe(0);

  return localstackContainer;
}

module.exports = {
  createAndBootstrapPostgresContainer,
  createAndBootstrapKafkaContainer,
  createAndBootstrapLocalstackContainer,
};
