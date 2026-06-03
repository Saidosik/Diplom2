import { useQuery } from "@tanstack/react-query";

// // Примерная структура
// export const useAuth = () => {
//   return useQuery({
//     queryKey: ['auth', 'me'],
//     queryFn: getMe,
//     retry: false, // Не пытаться повторно, если 401
//     staleTime: Infinity, // Данные не должны постоянно перезапрашиваться
//   });
// };