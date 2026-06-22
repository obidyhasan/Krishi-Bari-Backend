import jwt, { Algorithm, JwtPayload, Secret, SignOptions } from "jsonwebtoken";

const isPemKey = (secret: Secret) =>
  typeof secret === "string" && secret.includes("BEGIN") && secret.includes("KEY");

const resolveAlgorithm = (secret: Secret): Algorithm =>
  isPemKey(secret) ? "RS256" : "HS256";

const generateToken = (
  payload: Record<string, unknown>,
  secret: Secret,
  expiresIn: string
): string => {
  const algorithm = resolveAlgorithm(secret);
  return jwt.sign(payload, secret, {
    expiresIn,
    algorithm,
  } as SignOptions);
};

const verifyToken = (token: string, secret: Secret): JwtPayload => {
  const algorithm = resolveAlgorithm(secret);
  return jwt.verify(token, secret, { algorithms: [algorithm] }) as JwtPayload;
};

export const jwtHelper = {
  generateToken,
  verifyToken,
};
