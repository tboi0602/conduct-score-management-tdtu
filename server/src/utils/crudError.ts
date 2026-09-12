import { Prisma } from "@prisma/client";
import { ApiError } from "@utils/ApiError";

export function mapCrudError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") throw new ApiError(404, "Resource not found");
    if (error.code === "P2002") throw new ApiError(409, "Resource already exists");
    if (error.code === "P2003") {
      throw new ApiError(409, "Referenced resource does not exist or resource is still in use");
    }
  }
  throw error;
}
