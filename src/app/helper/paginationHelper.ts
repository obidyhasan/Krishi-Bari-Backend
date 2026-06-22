export type IOptions = {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: string;
};

export type IOptionsResult = {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const calculatePagination = (options: IOptions): IOptionsResult => {
  const rawPage = Number(options.page);
  const rawLimit = Number(options.limit);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : DEFAULT_PAGE;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  const sortBy = options.sortBy || "createdAt";
  const sortOrder = options.sortOrder === "asc" ? "asc" : "desc";

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
  };
};

export const paginationHelper = {
  calculatePagination,
};
