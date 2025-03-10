import { rest } from "msw";
import { setupServer } from "msw/node";

import { createAuthManager } from "../auth-manager";
import type { ParsedAuthToken } from "../protocol/AuthToken";

const SECONDS = 1 * 1000;
const MINUTES = 60 * SECONDS;
const HOURS = 60 * MINUTES;

describe("auth-manager - public api key", () => {
  test("should return public api key", async () => {
    const authManager = createAuthManager({ publicApiKey: "pk_123" });

    const authValue = (await authManager.getAuthValue(
      "room:read",
      "room1"
    )) as { type: "public"; publicApiKey: string };

    expect(authValue.type).toEqual("public");
    expect(authValue.publicApiKey).toEqual("pk_123");
  });
});

describe("auth-manager - secret auth", () => {
  let requestCount = 0;
  const legacyTokens = [
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NjQ1NjY0MTAsImV4cCI6MTY2NDU3MDAxMCwicm9vbUlkIjoiS1hhNlVjbHZyYWVHWk5kWFZ6NjdaIiwiYXBwSWQiOiI2MDVhNGZkMzFhMzZkNWVhN2EyZTA4ZjEiLCJhY3RvciI6ODcsInNjb3BlcyI6WyJyb29tOndyaXRlIl0sImsiOiJzZWMtbGVnYWN5In0.2DhcT0qwAMdhD0LwA0RAuRXzyjRVQrP6afFL9GG6vwh2gTyx-THw0clFof5WIx9skDuq064IITXgdU9r_vE04Vq9zxdbb0M_mOzISop9iGcWMWIyT-nNdWf3ly1zumNivKjhXcyCXW7t6VsVvvvt78Q5vLAkZIZxNxyBlWebKr2NR9t-PP2C6qlu64EgRH6mhMA7upc1UkkNp65ndVvIinEN92KKkzEjoTq8gv1MM5vMFxNY-Cvx673KY6xfO6op01Z0LE1lT_9YRixErCJZ2fnk_iheARH_0MXT29N76kEX1UA3OXhU_cWHX54kS-hPY_bQqGbjC-cuISLjhF5rpQ",
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTQ1MTkzNTMsImV4cCI6MTY5NDUzMzc1Mywicm9vbUlkIjoiS1hhNlVjbHZyYWVHWk5kWFZ6NjdaIiwiYXBwSWQiOiI2MDVhNGZkMzFhMzZkNWVhN2EyZTA4ZjEiLCJhY3RvciI6ODgsInNjb3BlcyI6WyJyb29tOndyaXRlIl0sImsiOiJzZWMtbGVnYWN5In0.pqIWR-KJknt3p26OeQnia6llYAcn7nF4MdseGecF4hLHq8xS1vb_lS16jexVSxvy2jmrfQU00oRF6ig6dfXdBzgovr3j2zqdLL72aQfwA56UR9zkQ4J5a6LqwMIRiy4K3IMT8_Tcj9opp-kotLhdeMcO6P3YLqUUsE-zpWaIQwYXsY1iyuBOKEqlM4woTwTAu_Z8J8ONXHO54EynMvPvAf4Blj-WteGPnTY8bvIkiXzOgFVAbunq5VEb6p0iqXqNSU0J4NzkNA9IVQDUj2qdCM065TOve4CWgL54klqoWeSpQHyDLfyRjOKeZssZ8jwU3ou3WnEbbE2oM8SMhcabEQ",
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2OTQ1MzM4MDAsImV4cCI6MTY5NDU0ODIwMCwicm9vbUlkIjoiS1hhNlVjbHZyYWVHWk5kWFZ6NjdaIiwiYXBwSWQiOiI2MDVhNGZkMzFhMzZkNWVhN2EyZTA4ZjEiLCJhY3RvciI6OTAsInNjb3BlcyI6WyJyb29tOndyaXRlIl0sImsiOiJzZWMtbGVnYWN5In0.Hs6ZIO717YqIfPaNC0BLNJXJUG4pTOwH3L7-IDIQAf0aFy-h8Nxd8Erz9RCegs6sDrqAsHMvHrFsOk-0-ML0NZ9My1nBB7s05h8QPsiOZEh4n5w1wPacaAP9Z4FMAH5xU6pJS0bR3sFZPecwCq6VFMZnf6WJUd-O4pARRb8Ca_FGcVfrMZwjqBzRRWW4gBPG0zVAd2m-naOqT8QlAKC3EAShkFT89T42S3eRgYkMDDKdfccI4IvruXVv9lh2f0mQ8ILBX3CfsZwnljv_OqqUQzob1Qcs5pRPYw-hpP_QuWyXOifIPEPyJ8_45bFIJSHvpGaZXBAT76s0SeAVUoXJ6w",
  ];

  /*
    Access token with those permissions:
        perms: {
          "org1*": ["room:write"],
        }
  */
  const accessToken =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NjQ1NjY0MTAsImV4cCI6MTY2NDU3MDAxMCwicGlkIjoiNjA1YTRmZDMxYTM2ZDVlYTdhMmUwOGYxIiwidWlkIjoidXNlcjEiLCJwZXJtcyI6eyJvcmcxKiI6WyJyb29tOndyaXRlIl19LCJrIjoiYWNjIn0.H9EpvO91L5R20ACSIXoJgjmTUeWJRHt91yCxgZ7J0km_FsjaqhYmlyD-ln3N9HpIXnei2y7shyoVTsSKwuYandwVQYLbPXP0tnZSlyp7WbTVcXEz--5ngDj0ePDw5OkDHcDiY243DGJconYZrbru9J86BpgBLsO0d4zJfnmF4hgyGXD7nm7TdJ0DudT_2_gUDECYXcgCT7cRUFfYtkFvC2IYJK0MeFKd3OX06u3k5tw9umUTDRdGs42BAWs6lvUxU4SPkjy24gQVmRK0FCf2sYmtKYA6WmRebp2Y4wR_NLV7GVznZY4-jy8AxmPhzB3GgXj3-uOz_3KC04XHQv8wxg";

  /*
    ID token that gives access to user "user1"
  */
  const idToken =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2NjQ1NjY0MTAsImV4cCI6MTY2NDU3MDAxMCwicGlkIjoiNjA1YTRmZDMxYTM2ZDVlYTdhMmUwOGYxIiwidWlkIjoidXNlcjEiLCJrIjoiaWQifQ.MhjHg2udkBivX7cW8Q1jmgc4DOZ1YnMoUnP61O32JLVJlIsc0zmHWA__DItsO3vBbRS8doG98cOzSE2qQ-5rKoX2l19k5Mr7gk6M75u1kOAzppV_3YQAGeZ8PfsUUPUBGOF5O6msLnha-HcAywvBuoUmcqP0CF_xhBBx0CLbFeuaWVJqndPKe8LJk9EYcB29HEwFaIzrOSarU1iLxRhsa8FCB910GTDcaApaUTPM9ZRadmf33ypSn3c6by0BWI54vx4O2p-hFsmJ71R38ifRRVq3ETXn78ftwbu1pp6hMTqyYn5YLlnZPPM-JAck_OsarGvE9cxg_Z3Y8bMTOlA5E";

  const server = setupServer(
    rest.post("/mocked-api/legacy-auth", (_req, res, ctx) => {
      return res(
        ctx.json({ token: legacyTokens[requestCount++ % legacyTokens.length] })
      );
    }),
    rest.post("/mocked-api/legacy-auth-that-caches", (_req, res, ctx) => {
      requestCount++;
      return res(ctx.json({ token: legacyTokens[0] }));
    }),
    rest.post("/mocked-api/access-auth", (_req, res, ctx) => {
      requestCount++;
      return res(ctx.json({ token: accessToken }));
    }),
    rest.post("/mocked-api/id-auth", (_req, res, ctx) => {
      requestCount++;
      return res(ctx.json({ token: idToken }));
    }),
    rest.post("/mocked-api/403", (_req, res, ctx) => {
      return res(ctx.status(403));
    }),
    rest.post("/mocked-api/401-with-details", (_req, res, ctx) => {
      return res(ctx.status(401), ctx.text("wrong key type"));
    }),
    rest.post("/mocked-api/not-json", (_req, res, ctx) => {
      return res(ctx.status(202), ctx.text("this is not json"));
    }),
    rest.post("/mocked-api/missing-token", (_req, res, ctx) => {
      return res(ctx.status(202), ctx.json({}));
    })
  );

  beforeEach(() => (requestCount = 0));
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("should return token", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/mocked-api/legacy-auth",
    });

    const authValue = (await authManager.getAuthValue(
      "room:read",
      "room1"
    )) as { type: "secret"; token: ParsedAuthToken };

    expect(authValue.type).toEqual("secret");
    expect(authValue.token.raw).toEqual(legacyTokens[0]);
    expect(requestCount).toBe(1);
  });

  test("should deduplicate concurrent requests on same room", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/mocked-api/legacy-auth",
    });

    const results = await Promise.all([
      authManager.getAuthValue("room:read", "room1"),
      authManager.getAuthValue("room:read", "room1"),
    ]);

    expect(results[0].type).toEqual("secret");
    expect(results[1].type).toEqual("secret");
    expect(requestCount).toBe(1);
  });

  test("should not deduplicate concurrent requests on different room", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/mocked-api/legacy-auth",
    });

    const results = await Promise.all([
      authManager.getAuthValue("room:read", "room1"),
      authManager.getAuthValue("room:read", "room2"),
    ]);

    expect(results[0].type).toEqual("secret");
    expect(results[1].type).toEqual("secret");
    expect(requestCount).toBe(2);
  });

  test("should never use cache when using legacy token", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/mocked-api/legacy-auth",
    });

    const authValueReq1 = (await authManager.getAuthValue(
      "room:read",
      "room1"
    )) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue(
      "room:read",
      "room1"
    )) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(legacyTokens[0]);
    expect(authValueReq2.token.raw).toEqual(legacyTokens[1]);
    expect(requestCount).toBe(2);
  });

  test("should throw if legacy token is expired but the next fetch from the backend returns the same (expired) token", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/mocked-api/legacy-auth-that-caches",
    });

    const authValueReq1 = (await authManager.getAuthValue(
      "room:read",
      "room1"
    )) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(legacyTokens[0]);
    expect(requestCount).toBe(1);

    // Five hours later, this token should be expired. For ID and Access tokens, that mweans
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + 5 * HOURS);
    try {
      const $promise = expect(
        authManager.getAuthValue("room:read", "room1")
      ).rejects.toThrow(
        "The same Liveblocks auth token was issued from the backend before. Caching Liveblocks tokens is not supported."
      );

      jest.useRealTimers();
      await $promise;

      // This made a new HTTP request
      expect(requestCount).toBe(2);
    } finally {
      jest.useRealTimers();
    }
  });

  test("should use cache when access token has correct permissions", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/mocked-api/access-auth",
    });

    const authValueReq1 = (await authManager.getAuthValue(
      "room:read",
      "org1.room1"
    )) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue(
      "room:read",
      "org1.room2"
    )) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(accessToken);
    expect(authValueReq2.token.raw).toEqual(accessToken);
    expect(requestCount).toBe(1);
  });

  test("should throw if access token is expired but the next fetch from the backend returns the same (expired) token", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/mocked-api/access-auth",
    });

    const authValueReq1 = (await authManager.getAuthValue(
      "room:read",
      "org1.room1"
    )) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue(
      "room:read",
      "org1.room2"
    )) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(accessToken);
    expect(authValueReq2.token.raw).toEqual(accessToken);
    expect(requestCount).toBe(1);

    // Five hours later, this token should be expired and no longer be served
    // from cache...
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + 5 * HOURS);
    try {
      // Should throw because this mock will return the exact same (expired) token
      const $promise = expect(
        authManager.getAuthValue("room:read", "org1.room1")
      ).rejects.toThrow(
        "The same Liveblocks auth token was issued from the backend before. Caching Liveblocks tokens is not supported."
      );

      jest.useRealTimers();
      await $promise;

      // This made a new HTTP request
      expect(requestCount).toBe(2);
    } finally {
      jest.useRealTimers();
    }
  });

  test("should use cache when ID token", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/mocked-api/id-auth",
    });

    const authValueReq1 = (await authManager.getAuthValue(
      "room:read",
      "room1"
    )) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue(
      "room:read",
      "room2"
    )) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(idToken);
    expect(authValueReq2.token.raw).toEqual(idToken);
    expect(requestCount).toBe(1);
  });

  test("should throw if ID token is expired but the next fetch from the backend returns the same (expired) token", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/mocked-api/id-auth",
    });

    const authValueReq1 = (await authManager.getAuthValue(
      "room:read",
      "room1"
    )) as { type: "secret"; token: ParsedAuthToken };

    const authValueReq2 = (await authManager.getAuthValue(
      "room:read",
      "room2"
    )) as { type: "secret"; token: ParsedAuthToken };

    expect(authValueReq1.token.raw).toEqual(idToken);
    expect(authValueReq2.token.raw).toEqual(idToken);
    expect(requestCount).toBe(1);

    // Five hours later, this token should be expired and no longer be served
    // from cache...
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + 5 * HOURS);
    try {
      // Should throw because this mock will return the exact same (expired) token
      const $promise = expect(
        authManager.getAuthValue("room:read", "room1")
      ).rejects.toThrow(
        "The same Liveblocks auth token was issued from the backend before. Caching Liveblocks tokens is not supported."
      );

      jest.useRealTimers();
      await $promise;

      // This made a new HTTP request
      expect(requestCount).toBe(2);
    } finally {
      jest.useRealTimers();
    }
  });

  test.each([{ notAToken: "" }, undefined, null, ""])(
    "custom authentication with missing token in callback response should fail",
    async (response) => {
      const authManager = createAuthManager({
        authEndpoint: (_roomId) =>
          new Promise((resolve) => {
            // @ts-expect-error: testing for missing token in callback response
            resolve(response);
          }),
      });

      await expect(
        authManager.getAuthValue("room:read", "room1")
      ).rejects.toThrow(
        'Your authentication callback function should return a token, but it did not. Hint: the return value should look like: { token: "..." }'
      );
    }
  );

  test("custom authentication with missing token in callback response should fail", async () => {
    const authManager = createAuthManager({
      authEndpoint: (_roomId) =>
        Promise.resolve({ error: "forbidden", reason: "Nope" }),
    });

    await expect(
      authManager.getAuthValue("room:read", "room1")
    ).rejects.toThrow("Authentication failed: Nope");
  });

  test("custom authentication with missing token in callback response should fail", async () => {
    const authManager = createAuthManager({
      authEndpoint: (_roomId) => Promise.reject(new Error("Huh?")),
    });

    await expect(
      authManager.getAuthValue("room:read", "room1")
    ).rejects.toThrow("Huh?");
  });

  test("private authentication with 403 status should fail", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/mocked-api/403",
    });

    await expect(
      authManager.getAuthValue("room:read", "room1")
    ).rejects.toThrow(
      "Unauthorized: reason not provided in auth response (403 returned by POST /mocked-api/403)"
    );
  });

  test("private authentication with 403 status should fail with details", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/mocked-api/401-with-details",
    });

    await expect(
      authManager.getAuthValue("room:read", "room1")
    ).rejects.toThrow(
      "Unauthorized: wrong key type (401 returned by POST /mocked-api/401-with-details)"
    );
  });

  test("private authentication that does not return valid JSON should fail", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/mocked-api/not-json",
    });

    await expect(
      authManager.getAuthValue("room:read", "room1")
    ).rejects.toThrow(
      'Expected a JSON response when doing a POST request on "/mocked-api/not-json". SyntaxError: Unexpected token'
    );
  });

  test("private authentication without an auth token response should fail", async () => {
    const authManager = createAuthManager({
      authEndpoint: "/mocked-api/missing-token",
    });

    await expect(
      authManager.getAuthValue("room:read", "room1")
    ).rejects.toThrow(
      'Expected a JSON response of the form `{ token: "..." }` when doing a POST request on "/mocked-api/missing-token", but got {}'
    );
  });
});
