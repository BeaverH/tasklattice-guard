import { queryOptions } from "@tanstack/react-query";
import { getEndpoints } from "@/lib/api";
import { queryKeys } from "./query-keys";

export const endpointsQueryOptions = () => queryOptions({
  queryKey: queryKeys.endpoints,
  queryFn: getEndpoints,
  refetchInterval: 30_000,
});
