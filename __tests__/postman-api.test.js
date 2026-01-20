const https = require("https");
const postmanApi = require("../lib/postman-api");

// Mock https module
jest.mock("https");

describe("Postman API", () => {
  beforeEach(() => {
    // Reset API key before each test
    postmanApi.setApiKey(null);
    jest.clearAllMocks();
  });

  describe("setApiKey / getApiKey", () => {
    test("should set and get API key", () => {
      postmanApi.setApiKey("test-api-key");
      expect(postmanApi.getApiKey()).toBe("test-api-key");
    });

    test("should return null when no API key is set", () => {
      expect(postmanApi.getApiKey()).toBeNull();
    });
  });

  describe("makeRequest", () => {
    test("should reject when API key is not set", async () => {
      await expect(postmanApi.makeRequest("GET", "/environments")).rejects.toThrow(
        "Postman API key not set"
      );
    });

    test("should make successful GET request", async () => {
      postmanApi.setApiKey("test-api-key");

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(JSON.stringify({ environments: [] }));
          }
          if (event === "end") {
            callback();
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      https.request.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await postmanApi.makeRequest("GET", "/environments");
      expect(result).toEqual({ environments: [] });
      expect(https.request).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: "api.getpostman.com",
          path: "/environments",
          method: "GET",
          headers: expect.objectContaining({
            "X-API-Key": "test-api-key",
          }),
        }),
        expect.any(Function)
      );
    });

    test("should handle API errors", async () => {
      postmanApi.setApiKey("test-api-key");

      const mockResponse = {
        statusCode: 401,
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(JSON.stringify({ error: { message: "Invalid API key" } }));
          }
          if (event === "end") {
            callback();
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      https.request.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      await expect(postmanApi.makeRequest("GET", "/environments")).rejects.toThrow(
        "Invalid API key"
      );
    });

    test("should handle network errors", async () => {
      postmanApi.setApiKey("test-api-key");

      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === "error") {
            callback(new Error("Network error"));
          }
        }),
        write: jest.fn(),
        end: jest.fn(),
      };

      https.request.mockImplementation(() => mockRequest);

      await expect(postmanApi.makeRequest("GET", "/environments")).rejects.toThrow(
        "Request failed: Network error"
      );
    });
  });

  describe("listEnvironments", () => {
    test("should return list of environments", async () => {
      postmanApi.setApiKey("test-api-key");

      const mockEnvironments = [
        { id: "env-1", name: "Development" },
        { id: "env-2", name: "Staging" },
      ];

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(JSON.stringify({ environments: mockEnvironments }));
          }
          if (event === "end") {
            callback();
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      https.request.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await postmanApi.listEnvironments();
      expect(result).toEqual(mockEnvironments);
    });

    test("should return empty array when no environments", async () => {
      postmanApi.setApiKey("test-api-key");

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(JSON.stringify({}));
          }
          if (event === "end") {
            callback();
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      https.request.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await postmanApi.listEnvironments();
      expect(result).toEqual([]);
    });
  });

  describe("getEnvironment", () => {
    test("should return environment details", async () => {
      postmanApi.setApiKey("test-api-key");

      const mockEnvironment = {
        id: "env-1",
        name: "Development",
        values: [
          { key: "api_url", value: "https://api.dev.example.com", enabled: true },
        ],
      };

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(JSON.stringify({ environment: mockEnvironment }));
          }
          if (event === "end") {
            callback();
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      https.request.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await postmanApi.getEnvironment("env-1");
      expect(result).toEqual(mockEnvironment);
    });

    test("should throw error when environment ID is not provided", async () => {
      postmanApi.setApiKey("test-api-key");
      await expect(postmanApi.getEnvironment(null)).rejects.toThrow(
        "Environment ID is required"
      );
    });
  });

  describe("getEnvironmentName", () => {
    test("should return environment name", async () => {
      postmanApi.setApiKey("test-api-key");

      const mockEnvironment = {
        id: "env-1",
        name: "Development",
        values: [],
      };

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(JSON.stringify({ environment: mockEnvironment }));
          }
          if (event === "end") {
            callback();
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      https.request.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await postmanApi.getEnvironmentName("env-1");
      expect(result).toBe("Development");
    });

    test("should return null on error (non-blocking)", async () => {
      postmanApi.setApiKey("test-api-key");

      const mockResponse = {
        statusCode: 404,
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(JSON.stringify({ error: { message: "Not found" } }));
          }
          if (event === "end") {
            callback();
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      https.request.mockImplementation((options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await postmanApi.getEnvironmentName("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("updateAwsCredentials", () => {
    test("should update AWS credentials while preserving other variables", async () => {
      postmanApi.setApiKey("test-api-key");

      const existingEnvironment = {
        id: "env-1",
        name: "Development",
        values: [
          { key: "api_url", value: "https://api.dev.example.com", enabled: true },
          { key: "aws_access_key_id", value: "old-key", enabled: true },
          { key: "aws_access_secret", value: "old-secret", enabled: true },
        ],
      };

      let putRequestBody = null;

      const mockGetResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(JSON.stringify({ environment: existingEnvironment }));
          }
          if (event === "end") {
            callback();
          }
        }),
      };

      const mockPutResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === "data") {
            callback(JSON.stringify({ environment: { id: "env-1", name: "Development" } }));
          }
          if (event === "end") {
            callback();
          }
        }),
      };

      const mockRequest = {
        on: jest.fn(),
        write: jest.fn((body) => {
          putRequestBody = JSON.parse(body);
        }),
        end: jest.fn(),
      };

      let requestCount = 0;
      https.request.mockImplementation((options, callback) => {
        requestCount++;
        if (options.method === "GET") {
          callback(mockGetResponse);
        } else if (options.method === "PUT") {
          callback(mockPutResponse);
        }
        return mockRequest;
      });

      const credentials = {
        aws_access_key_id: "new-key-id",
        aws_access_secret: "new-secret",
        aws_session_token: "new-token",
      };

      const result = await postmanApi.updateAwsCredentials("env-1", credentials);

      expect(result.environmentName).toBe("Development");
      expect(result.environmentId).toBe("env-1");

      // Verify PUT request body
      expect(putRequestBody.environment.name).toBe("Development");
      expect(putRequestBody.environment.values).toContainEqual({
        key: "api_url",
        value: "https://api.dev.example.com",
        enabled: true,
      });
      expect(putRequestBody.environment.values).toContainEqual({
        key: "aws_access_key_id",
        value: "new-key-id",
        enabled: true,
      });
      expect(putRequestBody.environment.values).toContainEqual({
        key: "aws_access_secret",
        value: "new-secret",
        enabled: true,
      });
      expect(putRequestBody.environment.values).toContainEqual({
        key: "aws_session_token",
        value: "new-token",
        enabled: true,
      });

      // Verify old AWS values are not present
      expect(
        putRequestBody.environment.values.filter((v) => v.value === "old-key")
      ).toHaveLength(0);
      expect(
        putRequestBody.environment.values.filter((v) => v.value === "old-secret")
      ).toHaveLength(0);
    });

    test("should throw error when environment ID is not provided", async () => {
      postmanApi.setApiKey("test-api-key");
      await expect(
        postmanApi.updateAwsCredentials(null, { aws_access_key_id: "test" })
      ).rejects.toThrow("Environment ID is required");
    });
  });

  describe("AWS_VAR_NAMES", () => {
    test("should contain expected variable names", () => {
      expect(postmanApi.AWS_VAR_NAMES).toContain("aws_access_key_id");
      expect(postmanApi.AWS_VAR_NAMES).toContain("aws_access_secret");
      expect(postmanApi.AWS_VAR_NAMES).toContain("aws_session_token");
    });
  });
});
